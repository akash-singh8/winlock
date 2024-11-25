class ProtectionController {
  constructor() {
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

      // Send the file path to the renderer process
      this.mainWindow.webContents.send("protect-file-request", {
        path: cleanPath,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

const protectionController = new ProtectionController();
module.exports = protectionController;
