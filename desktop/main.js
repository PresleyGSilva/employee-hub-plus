// Tottus Cred — Desktop wrapper (modo Online)
// Tenta o domínio personalizado e, se falhar, cai automaticamente no Lovable.
// Não precisa reinstalar para receber atualizações.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

// Ordem de tentativa: primeiro o domínio bonito, depois o fallback universal
const URLS = [
  "https://ttotuscred.online",
  "https://care-chart-now.lovable.app",
];

// Corrige tela preta em algumas máquinas (GPUs antigas / drivers Intel/AMD com bugs).
try { app.disableHardwareAcceleration(); } catch (_) {}
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("no-sandbox");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Tottus Cred",
    icon: path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png"),
    backgroundColor: "#0b0b0f",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);

  let urlIndex = 0;
  let currentUrl = URLS[0];

  function tryLoad(index) {
    currentUrl = URLS[index];
    console.log("[Tottus Cred] Carregando:", currentUrl);
    win.loadURL(currentUrl);
  }

  tryLoad(0);
  win.once("ready-to-show", () => win.show());

  // Fallback automático: se o domínio principal falhar (SSL, DNS, offline),
  // tenta o próximo da lista. Só mostra erro depois de testar todos.
  win.webContents.on("did-fail-load", (_e, code, desc, validatedUrl) => {
    // Ignora erros de subrecursos (ex.: -3 abort de favicon, etc.)
    if (code === -3) return;
    if (validatedUrl && !URLS.some((u) => validatedUrl.startsWith(u))) return;

    if (urlIndex < URLS.length - 1) {
      urlIndex++;
      console.warn(`[Tottus Cred] Falha em ${currentUrl} (${desc}). Tentando próxima...`);
      tryLoad(urlIndex);
      return;
    }

    // Esgotou todas as opções → tela amigável
    win.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<html><body style="font-family:system-ui;background:#0b0b0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px">
            <div>
              <h2>Não foi possível carregar o Tottus Cred</h2>
              <p style="opacity:.7">${desc} (código ${code})</p>
              <p>Verifique sua conexão com a internet e pressione <b>F5</b> para tentar de novo.</p>
            </div>
          </body></html>`
        )
    );
  });

  // Quando recarregar (F5), volta a tentar do começo
  win.webContents.on("did-finish-load", () => {
    // Reset apenas se carregou com sucesso uma das URLs reais
    if (URLS.some((u) => win.webContents.getURL().startsWith(u))) {
      urlIndex = URLS.indexOf(URLS.find((u) => win.webContents.getURL().startsWith(u)));
    }
  });

  // Links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!URLS.some((u) => url.startsWith(u))) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Atalhos
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F5") {
      urlIndex = 0;
      tryLoad(0);
    }
    if (input.key === "F11") win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
