const { app, BrowserWindow, Menu, ipcMain } = require("electron");

const path = require("path");

const isDevelopment = process.env.NODE_ENV === "development";

let dirname = isDevelopment ? __dirname : path.resolve(__dirname, "../../");

if (dirname.includes(".app")) {
  dirname = path.resolve(dirname, "../../");
}

const audioAssetPath = path.resolve(dirname, "assets/audio");
const musicGameSystemsPath = path.resolve(dirname, "assets/musicGameSystems");

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "NoteEditor"
  });

  if (isDevelopment) {
    mainWindow.loadURL(`http://localhost:9000`);
  } else {
    if (process.platform === "darwin") {
      // win
      mainWindow.loadFile(`dist/index.html`);
    } else {
      // mac
      mainWindow.loadURL(`file:///resources/app.asar/dist/index.html`);
    }
  }

  // ページが読み込まれたら assets フォルダのパスを渡す
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("assets", {
      aap: audioAssetPath,
      mgsp: musicGameSystemsPath
    });
  });

  initWindowMenu();

  if (isDevelopment) {
    const loadDevtool = require("electron-load-devtool");
    loadDevtool({
      id: "pfgnfdagidkfgccljigdamigbcnndkod",
      name: "MobX Developer Tools"
    });
  }

  mainWindow.webContents.openDevTools();

  mainWindow.on("close", e => {
    mainWindow.webContents.send("close");
  });
  mainWindow.on("closed", () => (mainWindow = null));
}

app.setName("NoteEditor");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

function send(name, value) {
  let resolve = null;

  ipcMain.once(name, (_, response) => {
    resolve(response);
  });

  const ret = mainWindow.webContents.send(name, value);

  return new Promise(_resolve => (resolve = _resolve));
}

function initWindowMenu() {
  const template = [
    {
      label: "ファイル",
      submenu: [
        {
          label: "開く",
          accelerator: "CmdOrCtrl+O",
          click() {
            mainWindow.webContents.send("open");
          }
        },
        { type: "separator" },
        {
          label: "保存",
          accelerator: "CmdOrCtrl+S",
          click() {
            mainWindow.webContents.send("save");
          }
        },
        {
          label: "名前を付けて保存",
          accelerator: "CmdOrCtrl+Shift+S",
          click() {
            mainWindow.webContents.send("saveAs");
          }
        },
        { type: "separator" },
        {
          label: "BMS 譜面をインポート",
          click() {
            mainWindow.webContents.send("importBMS");
          }
        }
      ]
    },
    {
      label: "編集",
      submenu: [
        {
          label: "切り取り",
          accelerator: "CmdOrCtrl+X",
          click() {
            mainWindow.webContents.send("cut");
          }
        },
        {
          label: "コピー",
          accelerator: "CmdOrCtrl+C",
          click() {
            mainWindow.webContents.send("copy");
          }
        },
        {
          label: "貼り付け",
          accelerator: "CmdOrCtrl+V",
          click() {
            mainWindow.webContents.send("paste");
          }
        },
        { type: "separator" },
        {
          label: "ノートを左に移動",
          accelerator: "Left",
          click() {
            mainWindow.webContents.send("moveLane", -1);
          }
        },
        {
          label: "ノートを右に移動",
          accelerator: "Right",
          click() {
            mainWindow.webContents.send("moveLane", 1);
          }
        },
        {
          label: "ノートの位置を反転",
          accelerator: "CmdOrCtrl+F",
          click() {
            mainWindow.webContents.send("flipLane");
          }
        }
      ]
    },
    {
      label: "選択",
      submenu: [
        {
          label: "小節分割数",
          submenu: [
            {
              label: "アップ",
              accelerator: "CmdOrCtrl+Up",
              click() {
                mainWindow.webContents.send("changeMeasureDivision", 1);
              }
            },
            {
              label: "ダウン",
              accelerator: "CmdOrCtrl+Down",
              click() {
                mainWindow.webContents.send("changeMeasureDivision", -1);
              }
            }
          ]
        },
        {
          label: "ノートサイズ",
          submenu: [
            {
              label: "アップ",
              accelerator: "CmdOrCtrl+Right",
              click() {
                mainWindow.webContents.send("changeObjectSize", 1);
              }
            },
            {
              label: "ダウン",
              accelerator: "CmdOrCtrl+Left",
              click() {
                mainWindow.webContents.send("changeObjectSize", -1);
              }
            }
          ]
        },
        {
          label: "編集モード",
          submenu: [
            {
              label: "選択モード",
              accelerator: "Q",
              click() {
                mainWindow.webContents.send("changeEditMode", 1);
              }
            },
            {
              label: "追加モード",
              accelerator: "W",
              click() {
                mainWindow.webContents.send("changeEditMode", 2);
              }
            },
            {
              label: "削除モード",
              accelerator: "E",
              click() {
                mainWindow.webContents.send("changeEditMode", 3);
              }
            },
            {
              label: "接続モード",
              accelerator: "R",
              click() {
                mainWindow.webContents.send("changeEditMode", 4);
              }
            }
          ]
        },
        {
          label: "ノートタイプ",
          submenu: [
            ...[...Array(9)].map((_, index) => ({
              label: `${index + 1}番目を選択`,
              accelerator: `${index + 1}`,
              click() {
                mainWindow.webContents.send("changeNoteTypeIndex", index);
              }
            }))
          ]
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);
}
