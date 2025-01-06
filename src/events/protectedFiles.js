const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const sendProtectedFilesList = (mainWindow) => {
  const protectedFilesPath = path.join(
    app.getPath("userData"),
    "protected_files.json"
  );

  if (!fs.existsSync(protectedFilesPath)) return;

  const protectedFiles = fs.readFileSync(protectedFilesPath, "utf8");
  const parsedData = JSON.parse(protectedFiles);
  const filesList = [];

  Object.keys(parsedData).forEach((filePath) =>
    filesList.push({
      filePath,
      name: path.basename(filePath),
      protectedAt: new Date(parsedData[filePath]["protectedAt"])
        .toString()
        .split(" ")
        .slice(1, 5)
        .join(" "),
    })
  );
  mainWindow.webContents.send("protected-files", filesList);
};

module.exports = sendProtectedFilesList;
