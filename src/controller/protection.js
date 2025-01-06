const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const settings = require("./settings");
const encryptionController = require("./encryption");

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
  }

  // Handle command line arguments when app is launched from context menu
  handleCommandLineArgs() {
    const fileArg = process.argv[1];
    const mode = process.argv[2];

    if (!fileArg || fileArg.includes("--squirrel")) {
      return;
    }

    if (mode === "decrypt") this.handleDecryptRequest(fileArg);
    else this.handleProtectRequest(fileArg);
  }

  // Handle the protect request
  async handleProtectRequest(filePath) {
    // Clean up the file path (remove quotes if present)
    const cleanPath = filePath.replace(/['"]/g, "");

    if (this.mainWindow) {
      if (this.isFileProtected(cleanPath)) {
        this.mainWindow.webContents.send("already-protected", cleanPath);
        return;
      }

      const commonPassword = settings.getCommonPassword();
      if (commonPassword) {
        const isEncrypted = await encryptionController.encryptFolder(
          cleanPath,
          commonPassword
        );
        const isSaved = this.saveProtectedFileInfo(cleanPath, commonPassword);

        this.mainWindow.webContents.send("protection-complete", {
          success: isEncrypted && isSaved,
          name: path.basename(cleanPath),
        });
      } else {
        // Send the file path to the renderer process
        this.mainWindow.webContents.send("protect-file-request", cleanPath);
      }
    }
  }

  // Handle the decrypt request
  handleDecryptRequest(filePath) {
    const cleanPath = filePath.replace(/['"]/g, "");

    if (this.mainWindow) {
      if (!this.isFileProtected(cleanPath)) {
        this.mainWindow.webContents.send("not-protected", cleanPath);
        return;
      }

      // Send the file path to the renderer process
      this.mainWindow.webContents.send("decrypt-file-request", cleanPath);
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
      this.mainWindow.webContents.send(
        "update",
        "Error saving protected file info:" + error
      );
      return false;
    }
  }

  // Remove protected file info
  removeProtectedFileInfo(filePath) {
    try {
      if (!fs.existsSync(this.protectedFilesPath)) return false;

      const data = fs.readFileSync(this.protectedFilesPath, "utf8");
      const protectedFiles = JSON.parse(data);
      const encryptedPath = path.join(
        app.getPath("userData"),
        path.basename(filePath)
      );

      delete protectedFiles[filePath];
      fs.writeFileSync(
        this.protectedFilesPath,
        JSON.stringify(protectedFiles, null, 2)
      );
      fs.unlinkSync(encryptedPath);
      fs.unlinkSync(`${filePath}.lnk`);

      return true;
    } catch (error) {
      this.mainWindow.webContents.send(
        "update",
        "Error removing protected file info:" + error
      );
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
