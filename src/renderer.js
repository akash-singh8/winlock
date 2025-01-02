document.addEventListener("DOMContentLoaded", main);

function main() {
  document.addEventListener("keydown", (event) => {
    // Disable zoom in/out shortcuts
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "+" ||
        event.key === "-" ||
        event.key === "=" ||
        event.key === "0")
    ) {
      event.preventDefault();
    }
  });

  document.getElementById("minimize-btn").addEventListener("click", () => {
    window.electronAPI.sendMessage("window-control", "minimize");
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    window.electronAPI.sendMessage("window-control", "close");
  });

  window.electronAPI.onEvent("protect-file-request", (event, fileInfo) => {
    showPasswordDialog(fileInfo, "encrypt");
  });

  window.electronAPI.onEvent("decrypt-file-request", (event, fileInfo) => {
    showPasswordDialog(fileInfo, "decrypt");
  });

  window.electronAPI.onEvent("already-protected", (event, fileInfo) => {
    alert("File already protected : " + fileInfo.path);
  });

  window.electronAPI.onEvent("not-protected", (event, fileInfo) => {
    alert("File not protected : " + fileInfo.path);
  });

  window.electronAPI.onEvent("protection-complete", (event, data) => {
    if (data.success) {
      alert(data.path + " protected successfully!!");
    } else {
      alert("Error while protecting " + data.path);
    }
  });

  window.electronAPI.onEvent("decryption-complete", (event, data) => {
    if (data.success) {
      alert(data.path + " decrypted successfully!!");
    } else {
      alert("Error while decryption " + data.path);
    }
  });

  window.electronAPI.onEvent("update", (event, data) => {
    console.log("------------------------------");
    console.log(data);
    console.log("------------------------------");
  });
}

// Function to show password dialog
function showPasswordDialog(fileInfo, type) {
  const dialog = document.createElement("div");
  dialog.className = "password-dialog";
  dialog.innerHTML = `
      <div class="dialog-content">
        <h2>${type === "encrypt" ? "Protect" : "Unlock"} Folder</h2>
        <p>Enter password to ${type === "encrypt" ? "protect" : "unlock"}: ${
    type == "encrypt" ? fileInfo.path : fileInfo.originalPath
  }</p>
        <input type="password" id="password" placeholder="Enter password" />
        ${
          type === "encrypt"
            ? `<input
              type="password"
              id="confirm-password"
              placeholder="Confirm password"
            />`
            : ""
        }
        <div class="buttons">
          <button id="protect-btn">${
            type === "encrypt" ? "Secure Folder" : "Unlock"
          }</button>
          <button id="cancel-btn">Cancel</button>
        </div>
      </div>
  `;

  document.body.appendChild(dialog);

  // Add event listeners
  const cancelBtn = dialog.querySelector("#cancel-btn");
  const protectBtn = dialog.querySelector("#protect-btn");
  const passwordInput = dialog.querySelector("#password");

  cancelBtn.addEventListener("click", () => {
    dialog.remove();
  });

  protectBtn.addEventListener("click", () => {
    const password = passwordInput.value;
    const confirmPassword =
      type === "encrypt" && dialog.querySelector("#confirm-password").value;

    if (type === "encrypt" && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    // Send the password back to main process
    window.electronAPI.sendMessage(`${type}-file`, {
      path: fileInfo.path,
      originalPath: fileInfo.originalPath,
      password: password,
    });

    dialog.remove();
  });
}
