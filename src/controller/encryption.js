const { app } = require("electron");
const { exec } = require("child_process");
const ws = require("windows-shortcuts");
const path = require("node:path");
const fs = require("node:fs");
const archiver = require("archiver");
const crypto = require("crypto");
const settings = require("./settings");

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

  createShortcut(folderPath) {
    const iconPath = path.join(__dirname, "../", "assets", "folderIcon.ico");

    ws.create(
      `${folderPath}.lnk`,
      {
        target: `${process.execPath}`,
        args: `"${folderPath}" "decrypt"`,
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

  // Function to refresh Explorer for a given folder.
  refreshExplorer(folderPath) {
    const parentFolderPath = path.dirname(folderPath);
    const vbsFilePath = path.join(__dirname, "../", "refreshExplorer.vbs");

    const command = `cscript //nologo "${vbsFilePath}" "${parentFolderPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error refreshing Explorer:", error);
        return;
      }
      console.log("Explorer refresh command executed successfully.");
    });
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
            this.createShortcut(folderPath);

            // Delete the original folder and zip file
            fs.unlinkSync(zipPath);
            fs.rmSync(folderPath, { recursive: true, force: true });
            this.refreshExplorer(folderPath);

            resolve(true);
          })
          .on("error", reject);
      });
    } catch (error) {
      this.mainWindow.webContents.send(
        "update",
        "Error encrypting file : " + error
      );
      return false;
    }
  }

  // Decrypt the folder at the given path
  async decryptFolder(folderPath) {
    try {
      const encryptedPath = path.join(
        app.getPath("userData"),
        path.basename(folderPath)
      );
      // Read the encrypted file
      const encryptedData = fs.readFileSync(encryptedPath);

      // Extract salt and IV
      const salt = encryptedData.slice(0, 32);
      const iv = encryptedData.slice(32, 32 + this.ivLength);

      const encrypted = encryptedData.slice(32 + this.ivLength);

      // Generate key from password
      const data = fs.readFileSync(this.protectedFilesPath, "utf8");
      const protectedFiles = JSON.parse(data);
      const password = protectedFiles[folderPath]["password"];
      const key = this.generateKey(password, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      // Define paths for decryption
      const decryptedZipPath = `${encryptedPath}_decrypted.zip`;
      const extractPath = folderPath;

      // Write decrypted zip
      fs.writeFileSync(decryptedZipPath, decrypted);

      // Extract the zip
      const extract = require("extract-zip");
      await extract(decryptedZipPath, { dir: extractPath });

      // Clean up temporary files
      fs.unlinkSync(decryptedZipPath);

      return true;
    } catch (error) {
      this.mainWindow.webContents.send(
        "update",
        "Error decrypting file : " + error
      );
      return false;
    }
  }

  isCorrectPassword(filePath, password) {
    const data = fs.readFileSync(this.protectedFilesPath, "utf8");
    const protectedFiles = JSON.parse(data);

    return settings.verifyPassword(
      password,
      protectedFiles[filePath]["password"]
    );
  }
}

module.exports = new EncryptionController();
