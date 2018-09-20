const { format } = require('url');
const log = require('electron-log');
const {
  BrowserWindow,
  app,
  ipcMain,
  Menu,
  shell,
  systemPreferences
} = require('electron');
const isDev = require('electron-is-dev');
const { resolve } = require('app-root-path');

log.transports.file.level = 'info';

/* const { machineIdSync } = require('node-machine-id');
global.MACHINE_ID_ORIGINAL = machineIdSync({ original: true });
global.MACHINE_ID = machineIdSync({ original: false });
global.MACHINE_NAME = os.hostname(); */

if (isDev) {
  /* require('electron-reload')(path.resolve(__dirname, 'main.js'), {
    electron: path.resolve(__dirname, '..', 'node_modules/.bin/electron.cmd')
  }); */
  require('electron-debug')();
}

const selectionMenu = Menu.buildFromTemplate([
  { role: 'copy' },
  { type: 'separator' },
  { role: 'selectall' }
]);

const inputMenu = Menu.buildFromTemplate([
  { role: 'undo' },
  { role: 'redo' },
  { type: 'separator' },
  { role: 'cut' },
  { role: 'copy' },
  { role: 'paste' },
  { type: 'separator' },
  { role: 'selectall' }
]);

const label = app.getName();
const template = [
  {
    label,
    submenu: [
      { label: `Über ${label}`, selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      {
        label: 'Beenden',
        accelerator: 'Command+Q',
        click() {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Bearbeitens',
    submenu: [
      { label: 'Rückgängig', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      {
        label: 'Wiederholen',
        accelerator: 'Shift+CmdOrCtrl+Z',
        selector: 'redo:'
      },
      { type: 'separator' },
      { label: 'Ausschneiden', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Kopieren', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Einfügen', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      {
        label: 'Alles Einfügen',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:'
      }
    ]
  },
  {
    label: 'Hilfe',
    submenu: [
      {
        label: 'Log-Datei',
        click() {
          shell.openItem(log.transports.file.file);
        }
      }
    ]
  }
];
log.info(`Starting, dev: ${isDev}`);

app.on('ready', async () => {
  const mainWindow = new BrowserWindow({
    'min-height': 1280,
    'min-width': 768,
    width: 1280,
    height: 768,
    show: false,
    titleBarStyle: 'hiddenInset',
    frame: false,
    icon: isDev ? resolve('assets/icon.ico') : undefined
  });

  global.color = systemPreferences.getAccentColor();
  systemPreferences.on('accent-color-changed', () => {
    global.color = systemPreferences.getAccentColor();
    mainWindow.webContents.send(
      'color-changed',
      systemPreferences.getAccentColor()
    );
  });

  ipcMain.on('modal', (event, { pathname }) => {
    console.log('HIII', `${url}#${pathname}`);
    const modal = new BrowserWindow({
      center: true,
      parent: mainWindow,
      'min-height': 1280,
      'min-width': 768,
      movable: false,
      width: 1280,
      height: 768,
      show: false,
      modal: true,
      titleBarStyle: 'hiddenInset',
      frame: false,
      icon: isDev ? resolve('assets/icon.ico') : undefined
    });
    modal.loadURL(`${url}#${pathname}`);
    modal.once('ready-to-show', () => {
      modal.show();
    });
  });

  mainWindow.webContents.on('context-menu', (e, props) => {
    const { selectionText, isEditable } = props;
    if (isEditable) {
      inputMenu.popup(mainWindow);
    } else if (selectionText && selectionText.trim() !== '') {
      selectionMenu.popup(mainWindow);
    }
  });
  if (template.length) {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    } else {
      updater(mainWindow);
    }
  });

  const pathname = isDev
    ? '../src/.parcel/development/index.html'
    : resolve('src/.parcel/production/index.html');

  log.info(pathname);

  const url = format({
    pathname,
    protocol: 'file:',
    slashes: true
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL(url);
});

app.on('window-all-closed', app.quit);
