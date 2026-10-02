// TESSERA as a Mac app (Electron). It opens the built game (the "dist"
// folder from `npm run build`) in its own fullscreen window, like a real
// game, so macOS can switch on Game Mode. The game code is exactly the same
// as in the browser.
//
// The game is served from a private "app://" address (not file://), so its
// modules and background workers load the same way they do on a web server.

const { app, BrowserWindow, protocol, net, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    fullscreen: true,          // a real game window; Esc / the menu bar still work
    backgroundColor: '#0a5cff',
    title: 'TESSERA',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  // Loading problems and game errors go to the terminal (handy when testing).
  win.webContents.on('did-fail-load', (_e, code, text, url) => console.error(`Could not load ${url}: ${text} (${code})`));
  win.webContents.on('did-finish-load', () => console.log('TESSERA loaded'));
  win.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') console.error(`[game] ${event.message}`);
  });
  win.loadURL('app://tessera/index.html');
}

app.whenReady().then(() => {
  // app://tessera/<path> -> the file in dist/ (never outside it).
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // A simple menu: quit with Cmd+Q, toggle fullscreen with Ctrl+Cmd+F.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'TESSERA', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'reload' }] },
  ]));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
