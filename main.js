const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
let win;
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
function creer() {
  win = new BrowserWindow({
    width: 1366, height: 850, show: false, title: 'TENKALA CARE SOFTWARE',
    icon: path.join(__dirname, 'icon.ico'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, plugins: true, spellcheck: false }
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // liens externes : ouverts dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  // téléchargements (sauvegardes .json, PDF, CSV) : demander où enregistrer
  win.webContents.session.on('will-download', (e, item) => {
    const p = dialog.showSaveDialogSync(win, { defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
    if (p) item.setSavePath(p); else item.cancel();
  });
}
app.whenReady().then(() => { Menu.setApplicationMenu(null); creer(); });
app.on('window-all-closed', () => app.quit());
