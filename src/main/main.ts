/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import sqlite from 'sqlite3';
import {
  existsSync,
  mkdirSync,
  writeFile,
  rename,
  readdirSync,
  readFileSync,
  link,
  Stats,
  stat,
} from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
let todayDir = '';
const sqlite3 = sqlite.verbose();
const db = new sqlite3.Database(
  path.resolve(app.getPath('userData'), 'homespace.db')
);
const DEFAULT_DIR_SQL = 'select value from settings where id = ?';
const DEFAULT_DIR_ID = 'defaultDir';
const CREATE_SETTINGS_SQL =
  'CREATE TABLE if not exists settings (id TEXT, value TEXT)';

let mainWindow: BrowserWindow | null = null;

ipcMain.on('noteUpdate', (_event, arg) => {
  console.log('note name: ', arg.name);
  const filepath = `${todayDir}/${arg.name}.md`;
  writeFile(filepath, arg.val, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
});

ipcMain.on('rename', (_event, arg) => {
  const oldPath = `${todayDir}/${arg.prevName}.md`;
  const newPath = `${todayDir}/${arg.newName}.md`;
  if (!existsSync(oldPath)) {
    writeFile(newPath, '', (err) => {
      if (err) throw err;
      console.log('The file has been created!');
      stat(newPath, (statErr, stats: Stats): void => {
        const fileId = `${stats.dev}-${stats.ino}`;
        console.log(fileId);
      });
    });
  } else {
    rename(oldPath, newPath, (err) => {
      if (err) throw err;
      console.log('The file has been renamed to ', newPath);
    });
  }
});

ipcMain.on('open', () => {
  db.get(DEFAULT_DIR_SQL, [DEFAULT_DIR_ID], async (err, defaultDir) => {
    if (err) {
      throw err;
    }
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    const files: Electron.OpenDialogReturnValue = await dialog.showOpenDialog(
      mainWindow,
      {
        defaultPath: defaultDir.value,
        filters: [{ name: 'Notes', extensions: ['md'] }],
        properties: ['openFile'],
      }
    );
    if (files.filePaths.length) {
      // TODO: deduplicate
      const fileMeta: { name: string; data: string }[] = [];
      files.filePaths.forEach((filePath) => {
        const data = readFileSync(filePath);
        const filename: string = filePath.replace(/^.*[\\/]/, '');
        const dirPath: string = filePath.replace(/[^\\/]*$/, '').slice(0, -1);
        console.log('filepath:', dirPath, 'todayDir:', todayDir);
        if (dirPath !== todayDir) {
          link(filePath, `${todayDir}/${filename}`, () => {});
        }
        fileMeta.push({
          name: filename,
          data: data.toString(),
        });
      });
      mainWindow.webContents.send('openFiles', fileMeta);
    }
  });
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const loadHome = async () => {
  const fileMeta: { name: string; data: string }[] = [];
  const files: string[] = readdirSync(todayDir);
  files.forEach((file) => {
    const filePath = `${todayDir}/${file}`;
    const data = readFileSync(filePath);
    fileMeta.push({ name: file, data: data.toString() });
  });
  if (mainWindow) {
    console.log('fileMeta: ', fileMeta);
    mainWindow.webContents.send('loadHome', fileMeta);
  }
};

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const sqlCb = (err: Error) => {
    if (err) {
      throw err;
    }
  };

  const getPathString = (
    selectedPath: Electron.OpenDialogReturnValue
  ): string =>
    selectedPath.filePaths.length
      ? `${selectedPath.filePaths[0]}/homespace`
      : `${app.getPath('home')}/homespace`;

  const setHomeDir = async (
    resolve: (value: string | PromiseLike<string>) => void
  ) => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    // Allow user to select directory for HomeSpace files
    const selectedDir = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    const homeSpaceDir: string = getPathString(selectedDir);
    // Create setting for user selected home path
    db.run(`INSERT INTO settings(id, value) VALUES(?, ?)`, [
      DEFAULT_DIR_ID,
      homeSpaceDir,
      sqlCb,
    ]);
    if (!existsSync(homeSpaceDir)) {
      mkdirSync(homeSpaceDir);
    }
    resolve(homeSpaceDir);
  };

  const initializeDefaultDir = () =>
    new Promise<string>((resolve) => {
      db.serialize(async () => {
        // Create the table to insert user settings if it doesn't exist
        db.run(CREATE_SETTINGS_SQL, sqlCb);
        // Get the default directory to store user files if it has been set
        db.get(DEFAULT_DIR_SQL, [DEFAULT_DIR_ID], async (err, defaultDir) => {
          if (err) {
            throw err;
          }
          if (defaultDir) {
            resolve(defaultDir.value);
            return;
          }
          setHomeDir(resolve);
        });
      });
    });

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.webContents.on('did-finish-load', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
      try {
        const defaultDir = await initializeDefaultDir();
        const date: string = new Date().toISOString().split('T')[0];
        todayDir = `${defaultDir}/${date}`;
        if (!existsSync(todayDir)) {
          mkdirSync(todayDir);
        } else {
          loadHome();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e.message) {
          console.error(e.message);
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  console.log('user path: ', app.getPath('userData'));

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
