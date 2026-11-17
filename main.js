const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
let win;
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
function creer() {
  win = new BrowserWindow({
    width: 1366, height: 850, show: false, title: 'TENKALA CARE SOFTWARE',
    icon: path.join(__dirname, 'icon.ico'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, plugins: true, spellcheck: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // liens externes : ouverts dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  // liens mailto:, tel:, WhatsApp… : ouverts par l'application de l'ordinateur, sans quitter le logiciel
  win.webContents.on('will-navigate', (e, url) => {
    if (/^(mailto|tel|whatsapp|https?):/i.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  // caméra et micro (i.care) : autorisés pour le logiciel lui-même
  win.webContents.session.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'mediaKeySystem', 'clipboard-sanitized-write', 'notifications', 'fullscreen'].includes(perm)));
  // téléchargements (sauvegardes .json, PDF, CSV) : demander où enregistrer
  win.webContents.session.on('will-download', (e, item) => {
    const p = dialog.showSaveDialogSync(win, { defaultPath: path.join(app.getPath('documents'), item.getFilename()) });
    if (p) item.setSavePath(p); else item.cancel();
  });
}

/* ===== Mise à jour automatique (GitHub Releases) ===== */
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('error', () => {}); // sans internet : aucune gêne pour l'utilisateur
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox(win, {
    type: 'info', buttons: ['Redémarrer maintenant', 'Plus tard'], defaultId: 0, cancelId: 1,
    title: 'Mise à jour de TENKALA CARE SOFTWARE',
    message: `La version ${info.version} de TENKALA CARE SOFTWARE est prête.`,
    detail: 'Vos données sont conservées. Pensez à faire une sauvegarde (.json) avant si vous ne l’avez pas faite récemment.\n\nRedémarrer maintenant pour installer la mise à jour ? Sinon, elle sera installée à la prochaine fermeture du logiciel.'
  }).then(r => { if (r.response === 0) setImmediate(() => autoUpdater.quitAndInstall()); });
});
function verifier() { if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {}); }
ipcMain.handle('tk-version', () => app.getVersion());
ipcMain.handle('tk-maj', async () => {
  if (!app.isPackaged) return 'Mise à jour indisponible en mode développement.';
  try {
    const r = await autoUpdater.checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    if (v && v !== app.getVersion()) return `La version ${v} est disponible : téléchargement en cours. Vous serez prévenu quand elle sera prête.`;
    return `Vous utilisez la dernière version (${app.getVersion()}).`;
  } catch (e) {
    const m = String((e && e.message) || e || '');
    if (/ENOTFOUND|EAI_AGAIN|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|ECONNRESET|net::ERR_(INTERNET|NAME|NETWORK|CONNECTION)/i.test(m)) return 'Impossible de vérifier : connexion internet indisponible.';
    if (/CERT|certificate|ERR_CERT|date/i.test(m)) return 'Impossible de vérifier : vérifiez la date et l’heure de l’ordinateur (connexion sécurisée refusée).';
    if (/404|latest\.yml|Cannot find|No published versions/i.test(m)) return 'Aucune version publiée trouvée sur GitHub (dépôt privé, version en brouillon ou fabrication non terminée).';
    return 'Impossible de vérifier : ' + m.split('\n')[0].slice(0, 160);
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); creer();
  setTimeout(verifier, 10000);               // 10 s après le démarrage
  setInterval(verifier, 6 * 60 * 60 * 1000); // puis toutes les 6 heures
});
app.on('window-all-closed', () => app.quit());
