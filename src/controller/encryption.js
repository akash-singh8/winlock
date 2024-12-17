const { app } = require("electron");
const ws = require("windows-shortcuts");
const path = require("node:path");
const fs = require("node:fs");
const archiver = require("archiver");
const crypto = require("crypto");

class EncryptionController {
  constructor() {
    this.mainWindow = null;
    this.protectedFilesPath = path.join(
      app.getPath("userData"),
      "protected_files.json"
    );

    // Define encryption parameters
    this.algorithm = "aes-256-cbc";
    this.ivLength = 16;
    this.keyLength = 32;
  }

  initialize(mainWindow) {
    this.mainWindow = mainWindow;
  }

  createShortcut(folderPath, encryptedFolderPath) {
    const iconPath = path.join(__dirname, "../", "assets", "folderIcon.ico");

    ws.create(
      `${folderPath}.lnk`,
      {
        target: `${process.execPath}`,
        args: `"${encryptedFolderPath}" "decrypt"`,
        icon: iconPath,
        description: `${path.basename(folderPath)} encrypted`,
      },
      (err) => {
        if (err) console.error(err);
        else console.log("Shortcut created!");
      }
    );
  }

  zipFolder(folderPath, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });
  }

  // Generate encryption key from password
  generateKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iterations
      this.keyLength,
      "sha512"
    );
  }

  async encryptFolder(folderPath, password) {
    try {
      // Generate salt and IV
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(this.ivLength);

      this.mainWindow.webContents.send("update", "==== inside encrypt folder");

      // Generate key from password
      const key = this.generateKey(password, salt);

      const folderName = path.basename(folderPath);

      // Define paths
      const zipPath = path.join(app.getPath("userData"), `${folderName}.zip`);
      const encryptedZipPath = path.join(app.getPath("userData"), folderName);

      // Step 1: Zip the folder
      await this.zipFolder(folderPath, zipPath);

      // Step 2: Encrypt the zip file
      const input = fs.createReadStream(zipPath);
      const output = fs.createWriteStream(encryptedZipPath);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Write salt and IV to the beginning of the encrypted file
      output.write(salt);
      output.write(iv);

      return new Promise((resolve, reject) => {
        input
          .pipe(cipher)
          .pipe(output)
          .on("finish", () => {
            this.createShortcut(folderPath, encryptedZipPath);

            // Delete the original folder and zip file
            fs.unlinkSync(zipPath);
            // fs.rmdirSync(folderPath);

            resolve(true);
          })
          .on("error", reject);
      });
    } catch (error) {
      this.mainWindow.webContents.send(
        "update",
        "::::: error on encryption" + error
      );
      throw error;
    }
  }
}

module.exports = new EncryptionController();
