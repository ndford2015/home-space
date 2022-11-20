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
  statSync,
  readdir,
  stat,
  Dirent,
  realpath,
  unlink,
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
let mainWindow: BrowserWindow | null;
const sqlite3 = sqlite.verbose();
const db = new sqlite3.Database(
  path.resolve(app.getPath('userData'), 'homespace.db')
);
const DEFAULT_DIR_SQL = 'select value from settings where id = ?';
const DEFAULT_DIR_ID = 'defaultDir';
const CREATE_SETTINGS_SQL =
  'CREATE TABLE if not exists settings (id TEXT, value TEXT)';

ipcMain.on('noteUpdate', (_event, arg) => {
  const filepath = `${todayDir}/${arg.name}.md`;
  writeFile(filepath, arg.val, (err) => {
    if (err) throw err;
  });
});

ipcMain.on('rename', (_event, arg) => {
  const oldPath = `${todayDir}/${arg.prevName}.md`;
  const newPath = `${todayDir}/${arg.newName}.md`;
  if (!existsSync(oldPath)) {
    writeFile(newPath, '', (err) => {
      if (err) throw err;
      const stats: Stats = statSync(newPath);
      const fileMeta: { layoutId: string; id: string } = {
        id: `${stats.dev}-${stats.ino}`,
        layoutId: arg.layoutId,
      };
      if (mainWindow) {
        mainWindow.webContents.send('fileSaved', fileMeta);
      }
    });
  } else {
    rename(oldPath, newPath, (err) => {
      if (err) throw err;
    });
  }
});

const getFileId = (stats: Stats) => {
  return `${stats.dev}-${stats.ino}`;
};

const getParentDirPath = (filePath: string) => {
  return filePath.replace(/[^\\/]*$/, '').slice(0, -1);
};

ipcMain.on('createTag', (_event, { tagName, fileName, fileId }) => {
  const tagDir = `${getParentDirPath(todayDir)}/tags/${tagName}`;
  let created = false;
  if (!existsSync(tagDir)) {
    mkdirSync(tagDir);
    created = true;
  }
  const tagId = getFileId(statSync(tagDir));
  realpath(`${todayDir}/${fileName}.md`, (error, resolvedPath) => {
    if (error) {
      console.log(error);
    } else {
      link(resolvedPath, `${tagDir}/${fileName}.md`, () => {});
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      mainWindow.webContents.send(
        'fileTagged',
        { id: tagId, name: tagName },
        fileId,
        created
      );
    }
  });
});

ipcMain.on('removeFileTag', (_event, { tagName, fileName, fileId, tagId }) => {
  unlink(
    `${getParentDirPath(todayDir)}/tags/${tagName}/${fileName}.md`,
    (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`Unlinked file: ${fileName} from tag: ${tagName}`);
        if (!mainWindow) {
          throw new Error('"mainWindow" is not defined');
        }
        mainWindow.webContents.send('fileTagRemoved', tagId, fileId);
      }
    }
  );
});

// TODO: apply tags when opening file
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
      const fileMeta: { name: string; data: string; id: string }[] = [];
      files.filePaths.forEach((filePath) => {
        const data = readFileSync(filePath);
        const filename: string = filePath.replace(/^.*[\\/]/, '');
        const dirPath: string = getParentDirPath(filePath);
        if (dirPath !== todayDir) {
          link(filePath, `${todayDir}/${filename}`, () => {});
        }
        const stats: Stats = statSync(filePath);
        fileMeta.push({
          name: filename,
          data: data.toString(),
          id: `${stats.dev}-${stats.ino}`,
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

const populateFilesTagMappings = (
  fileTags: { [fileId: string]: string[] },
  tagPath: string,
  tagId: string,
  promises: Promise<void>[]
): void => {
  const files: Dirent[] = readdirSync(tagPath, { withFileTypes: true });
  // eslint-disable-next-line array-callback-return
  files.forEach((file: Dirent) => {
    const filePath = `${tagPath}/${file.name}`;
    promises.push(
      new Promise<void>((resolve, reject) => {
        stat(filePath, (_statErr, stats: Stats) => {
          const fileId = getFileId(stats);
          if (!fileTags[fileId]) {
            fileTags[fileId] = [tagId];
            resolve();
          } else {
            fileTags[fileId].push(tagId);
            resolve();
          }
        });
      })
    );
  });
};

const getFileTags = async () => {
  const tagDir = `${getParentDirPath(todayDir)}/tags`;
  const fileTags: { [fileId: string]: string[] } = {};
  const allTags: { id: string; name: string }[] = [];
  // TODO: swap with async calls for performance improvement
  const tags: Dirent[] = readdirSync(tagDir, { withFileTypes: true }).filter(
    (dirent) => dirent.isDirectory()
  );
  const promises: Promise<void>[] = [];
  // eslint-disable-next-line no-restricted-syntax
  tags.forEach((tag) => {
    const tagPath = `${tagDir}/${tag.name}`;
    const tagStats: Stats = statSync(tagPath);
    const tagId = getFileId(tagStats);
    allTags.push({ name: tag.name, id: tagId });
    populateFilesTagMappings(fileTags, tagPath, tagId, promises);
  });
  await Promise.all(promises);
  return { fileTags, allTags };
};

const loadHome = async () => {
  const fileMeta: { name: string; data: string; id: string; tags: string[] }[] =
    [];
  const files: string[] = readdirSync(todayDir).filter(
    (item) => !/(^|\/)\.[^/.]/g.test(item)
  );
  const tags = await getFileTags();
  files.forEach((file) => {
    const filePath = `${todayDir}/${file}`;
    const data = readFileSync(filePath);
    const stats: Stats = statSync(filePath);
    const id = getFileId(stats);
    fileMeta.push({
      tags: tags.fileTags[id] || [],
      name: file,
      data: data.toString(),
      id,
    });
  });
  if (mainWindow) {
    mainWindow.webContents.send('loadHome', fileMeta, tags ? tags.allTags : []);
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

  const sqlCb = (res: sqlite.RunResult, err: Error) => {
    if (err) {
      console.error(err);
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
    try {
      db.run(
        'INSERT INTO settings (id, value) VALUES (?, ?)',
        [DEFAULT_DIR_ID, homeSpaceDir],
        sqlCb
      );
    } catch (e) {
      console.error('err: ', e);
    }
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
            console.log(err);
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
        const tagDir = `${defaultDir}/tags`;
        if (!existsSync(todayDir)) {
          mkdirSync(todayDir);
        }
        if (!existsSync(tagDir)) {
          mkdirSync(tagDir);
        }
        loadHome();
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

app.on('browser-window-focus', (event, win) => {
  console.log('browser-window-focus', win.webContents.id);
});

app.on('activate', () => {
  console.log('Activated window');
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
