const sudo = require("sudo-prompt");
const path = require("node:path");

class ContextMenuController {
  constructor() {
    this.mainWindow = null;
  }

  initialize(mainWindow) {
    this.mainWindow = mainWindow;
  }

  addContextMenuOption() {
    const iconPath = path.join(__dirname, "../", "assets", "appLogo.ico");
    const command = [
      'reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword" /ve /d "Protect with Password" /f',
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword" /v "Icon" /d ${iconPath} /f`,
      `reg add "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword\\command" /ve /d "\\"${process.execPath}\\" \\"%%V\\""  /f`,
    ].join(" && ");

    sudo.exec(command, { name: "winlock" }, (error, stdout, stderr) => {
      this.execCallback(error, stdout, stderr, "Enable");
    });
  }

  removeContextMenuOption() {
    const command =
      'reg delete "HKCU\\Software\\Classes\\Directory\\shell\\ProtectWithPassword" /f';

    sudo.exec(command, { name: "winlock" }, (error, stdout, stderr) => {
      this.execCallback(error, stdout, stderr, "Disable");
    });
  }

  execCallback(error, stdout, stderr, operation) {
    if (!this.mainWindow) return;
    if (error || stderr) {
      this.mainWindow.webContents.send("context-menu", {
        success: false,
        operation,
      });
      console.error(
        `Error ${operation}ing context menu option:`,
        error || stderr
      );
    } else {
      this.mainWindow.webContents.send("context-menu", {
        success: true,
        operation,
      });
      console.log(`Successfully ${operation}d context menu option:`, stdout);
    }
  }
}

module.exports = new ContextMenuController();
