const { app, BrowserWindow, ipcMain } = require("electron");
const sudo = require("sudo-prompt");
const path = require("node:path");
const fs = require("node:fs");
const protectionController = require("./controller/protection");
const encryptionController = require("./controller/encryption");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Location of a flag file to check if context menu option is added
const setupFilePath = path.join(app.getPath("userData"), "setup_complete.txt");

function addContextMenuOption() {
  const iconPath = path.join(__dirname, "assets", "appLogo.ico");
  const command = [
    'reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword" /ve /d "Protect with Password" /f',
    `reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword" /v "Icon" /d ${iconPath} /f`,
    `reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword\\command" /ve /d "\\"${process.execPath}\\" \\"%%V\\""  /f`,
  ].join(" && ");

  sudo.exec(command, { name: "winlock" }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error adding context menu: ${error}`);
      return;
    }
    if (stderr) {
      console.warn(`Warning: ${stderr}`);
    }

    // Create a setup file to avoid repeating setup on subsequent launches
    fs.writeFileSync(setupFilePath, "Context menu setup complete.");
    console.log("Context menu option added successfully! \n stdout :", stdout);
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Winlock",
    icon: path.join(__dirname, "assets", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  protectionController.initialize(mainWindow);
  encryptionController.initialize(mainWindow);

  return mainWindow;
};

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  if (!fs.existsSync(setupFilePath)) {
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
    const isDecrypted = await encryptionController.decryptFolder(
      encryptedPath,
      password,
      originalPath
    );
    const isRemoved = protectionController.removeProtectedFileInfo(
      encryptedPath,
      originalPath
    );

    mainWindow.webContents.send("decryption-complete", {
      success: isDecrypted && isRemoved,
      path: originalPath,
    });
  });
});
