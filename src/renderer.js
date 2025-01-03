const notyf = new Notyf({
  duration: 2500,
  ripple: true,
  position: {
    x: "center",
    y: "top",
  },
});

const disableZoomInOut = () => {
  document.addEventListener("keydown", (event) => {
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
};

const handleWindowControls = () => {
  document.getElementById("minimize-btn").addEventListener("click", () => {
    window.electronAPI.sendMessage("window-control", "minimize");
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    window.electronAPI.sendMessage("window-control", "close");
  });
};

const handleIncomingEvents = () => {
  window.electronAPI.onEvent("protect-file-request", (event, fileInfo) => {
    showPasswordDialog(fileInfo, "encrypt");
  });

  window.electronAPI.onEvent("decrypt-file-request", (event, fileInfo) => {
    showPasswordDialog(fileInfo, "decrypt");
  });

  window.electronAPI.onEvent("already-protected", (event, fileInfo) => {
    notyf.success("File already protected : " + fileInfo.path);
  });

  window.electronAPI.onEvent("not-protected", (event, fileInfo) => {
    notyf.error("File not protected : " + fileInfo.path);
  });

  window.electronAPI.onEvent("protection-complete", (event, data) => {
    if (data.success) {
      notyf.success(data.path + " protected successfully!!");
    } else {
      notyf.error("Error while protecting " + data.path);
    }
  });

  window.electronAPI.onEvent("decryption-complete", (event, data) => {
    if (data.success) {
      notyf.success(data.path + " decrypted successfully!!");
    } else {
      notyf.error("Error while decryption " + data.path);
    }
  });

  window.electronAPI.onEvent("update", (event, data) => {
    console.log("------------------------------");
    console.log(data);
    console.log("------------------------------");
  });

  window.electronAPI.onEvent("context-menu", (event, data) => {
    if (data.success) notyf.success(`Folder Protection ${data.operation}d.`);
    else notyf.error(`Unable to ${data.operation} Folder Protection!`);
  });
};

const handleEnableState = () => {
  const enableSwitch = document.getElementById("switch1");
  const prevState = localStorage.getItem("isEnabled");

  if (prevState == null) {
    localStorage.setItem("isEnabled", "true");
    return;
  } else {
    enableSwitch.checked = prevState === "true";
  }

  enableSwitch.addEventListener("click", function () {
    window.electronAPI.sendMessage("context-menu", enableSwitch.checked);
    localStorage.setItem("isEnabled", `${enableSwitch.checked}`);
  });
};

handleEnableState();
disableZoomInOut();
handleWindowControls();
handleIncomingEvents();

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
      notyf.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      notyf.error("Password must be at least 6 characters long!");
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
