const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

class Settings {
  constructor() {
    this.settingsFilePath = path.join(app.getPath("userData"), "settings.json");
    this.initialize();
  }

  initialize() {
    if (!fs.existsSync(this.settingsFilePath)) {
      fs.writeFileSync(
        this.settingsFilePath,
        JSON.stringify({
          isEnabled: true,
          commonPassword: null,
        })
      );
    }
  }

  isEnabled() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return settings.isEnabled;
  }

  getCommonPassword() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return settings.commonPassword;
  }

  setEnableState(enable) {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);

    settings.isEnabled = enable;
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }

  setCommonPassword(password) {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);

    settings.commonPassword = password;
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }
}

module.exports = new Settings();
