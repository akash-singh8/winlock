const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

class ProtectionController {
  constructor() {
    this.protectedFilesPath = path.join(
      app.getPath("userData"),
      "protected_files.json"
    );
    this.mainWindow = null;
  }

  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    this.handleCommandLineArgs();
  }

  // Handle command line arguments when app is launched from context menu
  handleCommandLineArgs() {
    const fileArg = process.argv[1];

    if (!fileArg || fileArg.includes("--squirrel")) {
      return;
    }
    this.handleProtectRequest(fileArg);
  }

  // Handle the protect request
  handleProtectRequest(filePath) {
    // Clean up the file path (remove quotes if present)
    const cleanPath = filePath.replace(/['"]/g, "");

    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();

      if (this.isFileProtected(cleanPath)) {
        this.mainWindow.webContents.send("already-protected", {
          path: cleanPath,
        });
        return;
      }

      // Send the file path to the renderer process
      this.mainWindow.webContents.send("protect-file-request", {
        path: cleanPath,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Save protected file info
  saveProtectedFileInfo(filePath, password) {
    try {
      let protectedFiles = {};

      if (fs.existsSync(this.protectedFilesPath)) {
        const data = fs.readFileSync(this.protectedFilesPath, "utf8");
        protectedFiles = JSON.parse(data);
      }

      protectedFiles[filePath] = {
        protectedAt: new Date().toISOString(),
        password,
      };

      fs.writeFileSync(
        this.protectedFilesPath,
        JSON.stringify(protectedFiles, null, 2)
      );

      return true;
    } catch (error) {
      console.error("Error saving protected file info:", error);
      return false;
    }
  }

  // Check if a file is already protected
  isFileProtected(filePath) {
    try {
      if (fs.existsSync(this.protectedFilesPath)) {
        const data = fs.readFileSync(this.protectedFilesPath, "utf8");
        const protectedFiles = JSON.parse(data);
        return !!protectedFiles[filePath];
      }
      return false;
    } catch (error) {
      console.error("Error checking protected file status:", error);
      return false;
    }
  }
}

const protectionController = new ProtectionController();
module.exports = protectionController;
