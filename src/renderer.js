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
    else {
      notyf.error(`Unable to ${data.operation} Folder Protection!`);
      // undo switch state
      const enableSwitch = document.getElementById("switch1");
      enableSwitch.checked = data.operation !== "Enable";
      localStorage.setItem("isEnabled", `${enableSwitch.checked}`);
    }
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

const handleCommonPassword = () => {
  const cpSwitch = document.getElementById("switch2");
  const currCP = localStorage.getItem("commonPassword");

  cpSwitch.checked = currCP;

  cpSwitch.addEventListener("click", function () {
    cpSwitch.disabled = true;
    if (cpSwitch.checked) showPasswordDialog(false, "commonPass");
    else showPasswordDialog(true, "commonPass");

    setTimeout(() => {
      cpSwitch.disabled = false;
    }, 500);
  });
};

handleCommonPassword();
handleEnableState();
disableZoomInOut();
handleWindowControls();
handleIncomingEvents();

// Function to show password dialog
// Also in case if type === commonPass, then fileInfo indicates if the user wants to enable/disable common password
function showPasswordDialog(fileInfo, type) {
  const dialog = document.createElement("div");
  dialog.className = "password-dialog";
  dialog.innerHTML = `
      <div class="dialog-content">
        <h2>${
          type === "encrypt"
            ? "Protect Folder"
            : type === "commonPass"
            ? fileInfo
              ? "Disable Common Password"
              : "Common Password"
            : "Unlock Folder"
        } </h2>
        <p>${
          type === "commonPass"
            ? fileInfo
              ? "Please confirm common password to disable:"
              : "Set a common password:"
            : type === "encrypt"
            ? `Enter password to protect: ${fileInfo.path}`
            : `Enter password to unlock: ${fileInfo.originalPath}`
        }</p>
        <input type="password" id="password" placeholder="Enter password" />
        ${
          type === "decrypt" || fileInfo === true
            ? ""
            : `<input
              type="password"
              id="confirm-password"
              placeholder="Confirm password"
            />`
        }
        <div class="buttons">
          <button id="protect-btn">${
            type === "encrypt"
              ? "Secure Folder"
              : type === "commonPass"
              ? fileInfo
                ? "Disable"
                : "Set Password"
              : "Unlock"
          }</button>
          <button id="cancel-btn">Cancel</button>
        </div>
      </div>
  `;

  document.body.appendChild(dialog);

  // Add CSS transitions for animations
  setTimeout(() => {
    dialog.style.opacity = "1";
    dialog.style.transform = "scale(1)";
  }, 100);

  // Add event listeners
  const cancelBtn = dialog.querySelector("#cancel-btn");
  const protectBtn = dialog.querySelector("#protect-btn");
  const passwordInput = dialog.querySelector("#password");

  cancelBtn.addEventListener("click", () => {
    if (type === "commonPass") {
      const cpSwitch = document.getElementById("switch2");
      cpSwitch.checked = !cpSwitch.checked;
    }

    dialog.style.opacity = "0";
    dialog.style.transform = "scale(0)";
    setTimeout(() => {
      dialog.remove();
    }, 250);
  });

  protectBtn.addEventListener("click", () => {
    const password = passwordInput.value;
    const confirmPassword =
      type !== "decrypt" &&
      fileInfo === false &&
      dialog.querySelector("#confirm-password").value;

    if (
      type !== "decrypt" &&
      fileInfo === false &&
      password !== confirmPassword
    ) {
      notyf.error("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      notyf.error("Password must be at least 6 characters long!");
      return;
    }

    if (type === "commonPass") {
      if (fileInfo) {
        const currPass = localStorage.getItem("commonPassword");
        if (currPass != password)
          return notyf.error("Please enter correct common password!");
        localStorage.removeItem("commonPassword");
      } else localStorage.setItem("commonPassword", password);
      notyf.success(
        `Successfully ${fileInfo ? "disabled" : "added a"} Common Password.`
      );
    } else {
      // Send the password back to main process
      window.electronAPI.sendMessage(`${type}-file`, {
        path: fileInfo.path,
        originalPath: fileInfo.originalPath,
        password: password,
      });
    }

    dialog.style.opacity = "0";
    dialog.style.transform = "scale(0)";
    setTimeout(() => {
      dialog.remove();
    }, 250);
  });
}
