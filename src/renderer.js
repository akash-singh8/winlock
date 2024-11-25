document.addEventListener("DOMContentLoaded", main);

function main() {
  window.electronAPI.onEvent("protect-file-request", (event, fileInfo) => {
    showPasswordDialog(fileInfo);
  });

  window.electronAPI.onEvent("already-protected", (event, fileInfo) => {
    alert("File already protected : " + fileInfo.path);
  });
}

// Function to show password dialog
function showPasswordDialog(fileInfo) {
  const dialog = document.createElement("div");
  dialog.className = "password-dialog";
  dialog.innerHTML = `
      <div class="dialog-content">
        <h2>Protect Folder</h2>
        <p>Enter password to protect: ${fileInfo.path}</p>
        <input type="password" id="password" placeholder="Enter password" />
        <input
          type="password"
          id="confirm-password"
          placeholder="Confirm password"
        />
        <div class="buttons">
          <button id="cancel-btn">Cancel</button>
          <button id="protect-btn">Protect</button>
        </div>
      </div>
  `;

  document.body.appendChild(dialog);

  // Add event listeners
  const cancelBtn = dialog.querySelector("#cancel-btn");
  const protectBtn = dialog.querySelector("#protect-btn");
  const passwordInput = dialog.querySelector("#password");
  const confirmInput = dialog.querySelector("#confirm-password");

  cancelBtn.addEventListener("click", () => {
    dialog.remove();
  });

  protectBtn.addEventListener("click", () => {
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    dialog.remove();
  });
}
