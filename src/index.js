const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const protectionController = require("./controller/protection");
const encryptionController = require("./controller/encryption");
const contextMenuController = require("./controller/contextMenu");

// Location of a flag file to check if context menu option is added
const setupFilePath = path.join(app.getPath("userData"), "setup_complete.txt");

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
  if (!fs.existsSync(setupFilePath)) {
    // Create a setup file to avoid repeating setup on subsequent launches
    fs.writeFileSync(setupFilePath, "Context menu setup complete.");
    addContextMenuOption();
  }

  const mainWindow = createWindow();

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
    const { path: encryptedPath, password, originalPath } = data;
    const isCorrectPassword = encryptionController.isCorrectPassword(
      originalPath,
      password
    );
    const isDecrypted =
      isCorrectPassword &&
      (await encryptionController.decryptFolder(
        encryptedPath,
        password,
        originalPath
      ));
    const isRemoved =
      isCorrectPassword &&
      isDecrypted &&
      protectionController.removeProtectedFileInfo(encryptedPath, originalPath);

    mainWindow.webContents.send("decryption-complete", {
      success: isDecrypted && isRemoved && isCorrectPassword,
      error: !isCorrectPassword
        ? "Incorrect Password!"
        : !isDecrypted
        ? "Unable to decrypt the folder!"
        : "Unable to remove locked folder link!",
      path: originalPath,
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
});
