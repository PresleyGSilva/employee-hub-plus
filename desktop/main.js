// Tottus Cred — Desktop wrapper (modo Online)
// Abre sempre a versão mais recente publicada no Lovable.
// Não precisa reinstalar para receber atualizações.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const APP_URL = "https://ttotuscred.online";

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
