// Tottus Cred — Desktop wrapper (modo Online)
// Abre sempre a versão mais recente publicada no Lovable.
// Não precisa reinstalar para receber atualizações.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const APP_URL = "https://care-chart-now.lovable.app";

// Corrige tela preta em algumas máquinas (GPUs antigas / drivers Intel/AMD com bugs).
// Desativa aceleração de hardware e força renderizador de software como fallback estável.
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

  // Sempre carrega a versão online → sem necessidade de reinstalar para atualizar
  win.loadURL(APP_URL);
  win.once("ready-to-show", () => win.show());

  // Se a página falhar (offline, DNS, etc.), mostra um aviso amigável em vez de tela preta
  win.webContents.on("did-fail-load", (_e, code, desc) => {
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

  // Links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Atalho F5 para recarregar manualmente
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "F5") win.reload();
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
