const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const protectionController = require("./controller/protection");
const encryptionController = require("./controller/encryption");
const contextMenuController = require("./controller/contextMenu");
const settings = require("./controller/settings");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 660,
    title: "Winlock",
    frame: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    icon: path.join(__dirname, "assets", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  protectionController.initialize(mainWindow);
  encryptionController.initialize(mainWindow);
  contextMenuController.initialize(mainWindow);

  return mainWindow;
};

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  const mainWindow = createWindow();

  ipcMain.on("ready", () => {
    if (!settings.isSetupComplete()) {
      settings.setSetupComplete(true);
      contextMenuController.addContextMenuOption();
    } else {
      protectionController.handleCommandLineArgs();
    }

    // Send the protection and common password state to the client
    const isProtectionEnabled = settings.isEnabled();
    const isCommonPasswordSet = !!settings.getCommonPassword();
    mainWindow.webContents.send("enable-state", isProtectionEnabled);
    mainWindow.webContents.send("common-password-state", isCommonPasswordSet);

    // Send the list of protected files
    const protectedFilesPath = path.join(
      app.getPath("userData"),
      "protected_files.json"
    );
    if (!fs.existsSync(protectedFilesPath)) return;
    const protectedFiles = fs.readFileSync(protectedFilesPath, "utf8");
    const parsedData = JSON.parse(protectedFiles);
    const filesList = [];
    Object.keys(parsedData).forEach((filePath) =>
      filesList.push({
        filePath,
        name: path.basename(filePath),
        protectedAt: new Date(parsedData[filePath]["protectedAt"])
          .toString()
          .split(" ")
          .slice(1, 5)
          .join(" "),
      })
    );
    mainWindow.webContents.send("protected-files", filesList);
  });

  // Handle encrypt-file event from renderer
  ipcMain.on("encrypt-file", async (event, data) => {
    const { path, password } = data;
    const isEncrypted = await encryptionController.encryptFolder(
      path,
      password
    );
    const isSaved = protectionController.saveProtectedFileInfo(path, password);

    mainWindow.webContents.send("protection-complete", {
      success: isEncrypted && isSaved,
      path: data.path,
    });
  });

  // Handle decrypt-file event from renderer
  ipcMain.on("decrypt-file", async (event, data) => {
    const { path, password } = data;
    const isCorrectPassword = encryptionController.isCorrectPassword(
      path,
      password
    );
    const isDecrypted =
      isCorrectPassword &&
      (await encryptionController.decryptFolder(path, password));
    const isRemoved =
      isCorrectPassword &&
      isDecrypted &&
      protectionController.removeProtectedFileInfo(path);

    mainWindow.webContents.send("decryption-complete", {
      success: isDecrypted && isRemoved && isCorrectPassword,
      error: !isCorrectPassword
        ? "Incorrect Password!"
        : !isDecrypted
        ? "Unable to decrypt the folder!"
        : "Unable to remove locked folder link!",
      path,
    });
  });

  // Hnalde window controls such as minimize and close
  ipcMain.on("window-control", (event, action) => {
    const win = BrowserWindow.getFocusedWindow();
    if (action === "minimize") win.minimize();
    if (action === "close") win.close();
  });

  // Handle context menu state
  ipcMain.on("context-menu", (event, state) => {
    if (state) contextMenuController.addContextMenuOption();
    else contextMenuController.removeContextMenuOption();
  });

  // Handle Common Password
  ipcMain.on("set-common-password", (event, password) => {
    const isCommonPasswordSet = !!settings.getCommonPassword();
    if (isCommonPasswordSet) return;
    settings.setCommonPassword(password);
  });

  ipcMain.on("match-common-password", (event, password) => {
    const commonPassword = settings.getCommonPassword();
    if (password === commonPassword) settings.setCommonPassword("");
    mainWindow.webContents.send(
      "match-common-password",
      password === commonPassword
    );
  });
});
