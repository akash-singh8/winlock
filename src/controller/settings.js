const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const bcrypt = require("bcrypt");

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
          isSetupComplete: false,
          isEnabled: true,
          commonPassword: null,
        })
      );
    }
  }

  // Hash a password before storing
  hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hashSync(password, saltRounds);
  }

  // Verify password against hash
  verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  isSetupComplete() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return settings.isSetupComplete;
  }

  isEnabled() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return settings.isEnabled;
  }

  isCommonPasswordEnabled() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return !!settings.commonPassword;
  }

  getCommonPassword() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    return settings.commonPassword;
  }

  setSetupComplete(state) {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);

    settings.isSetupComplete = state;
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
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

    settings.commonPassword = password ? this.hashPassword(password) : null;
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }

  enableProFeature(activationKey, plan) {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);
    settings.plan = plan;
    settings.activationKey = activationKey;
    settings.lastVerified = new Date().toDateString();

    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }

  async validatePro() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);

    if (!settings.plan) return;

    const currDate = new Date().toDateString();
    if (currDate === settings.lastVerified) return;

    const isValidKey = await fetch("https://winlock.pro/api/verify-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activationKey: settings.activationKey,
        plan: settings.plan,
      }),
    });

    if (!isValidKey.ok) return;

    const { isValid } = await isValidKey.json();

    if (isValid) {
      settings.lastVerified = currDate;
    } else {
      delete settings.plan;
      delete settings.activationKey;
      delete settings.lastVerified;
    }

    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings, null, 2));
  }

  isProEnabled() {
    const data = fs.readFileSync(this.settingsFilePath, "utf-8");
    const settings = JSON.parse(data);

    return settings.plan;
  }
}

module.exports = new Settings();
