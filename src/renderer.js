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
  window.electronAPI.onEvent("protect-file-request", (event, filePath) => {
    showPasswordDialog(filePath, "encrypt");
  });

  window.electronAPI.onEvent("decrypt-file-request", (event, filePath) => {
    showPasswordDialog(filePath, "decrypt");
  });

  window.electronAPI.onEvent("already-protected", (event, filePath) => {
    notyf.success("File already protected : " + filePath);
  });

  window.electronAPI.onEvent("not-protected", (event, filePath) => {
    notyf.error("File not protected : " + filePath);
  });

  window.electronAPI.onEvent("protection-complete", (event, data) => {
    if (data.success) {
      notyf.success(`Folder "${data.name}" Locked Successfully.`);
    } else {
      notyf.error("Error while protecting " + data.name);
    }
  });

  window.electronAPI.onEvent("decryption-complete", (event, data) => {
    if (data.success) {
      notyf.success(`Folder "${data.name}" Unlocked Successfully.`);
    } else {
      notyf.error(data.error);
    }
  });

  window.electronAPI.onEvent("update", (event, data) => {
    console.log("------------------------------");
    console.log(data);
    console.log("------------------------------");
  });

  window.electronAPI.onEvent("protected-files", (event, protectedFiles) => {
    const foldersCount = document.querySelector(".history > p");
    const lockedFolders = document.querySelector(".locked-folders");
    const noFolderLocked = document.querySelector(".not-locked");

    if (protectedFiles?.length > 0) noFolderLocked.style.display = "none";
    else noFolderLocked.style.display = "flex";

    foldersCount.innerHTML = `${protectedFiles.length} folders locked`;
    lockedFolders.innerHTML = "";
    protectedFiles?.forEach(
      (file) =>
        (lockedFolders.innerHTML += `<div class="folder-details" title="${file.filePath}">
                                      <img src="./assets/folderIcon.ico" alt="Lock Folder" />
                                      <div>
                                        <p>${file.name}</p>
                                        <p>${file.protectedAt}</p>
                                      </div>
                                    </div>`)
    );
  });

  window.electronAPI.onEvent("limit-exceeded", (event, data) => {
    notyf.error({
      message: "Limit reached: Protect up to 3 folders. Upgrade to add more.",
      duration: 5000,
    });
  });

  window.electronAPI.sendMessage("ready", true);
};

const handleEnableState = () => {
  const enableSwitch = document.getElementById("switch1");

  window.electronAPI.onEvent(
    "enable-state",
    (event, state) => (enableSwitch.checked = state)
  );

  window.electronAPI.onEvent("context-menu", (event, data) => {
    if (data.success) notyf.success(`Folder Protection ${data.operation}d.`);
    else {
      notyf.error(`Unable to ${data.operation} Folder Protection!`);
      const enableSwitch = document.getElementById("switch1");
      enableSwitch.checked = data.operation !== "Enable";
    }
  });

  enableSwitch.addEventListener("click", function () {
    window.electronAPI.sendMessage("context-menu", enableSwitch.checked);
  });
};

const handleCommonPassword = () => {
  const cpSwitch = document.getElementById("switch2");

  window.electronAPI.onEvent(
    "common-password-state",
    (event, state) => (cpSwitch.checked = state)
  );

  window.electronAPI.onEvent("match-common-password", (event, isCorrect) => {
    if (isCorrect) notyf.success("Disabled Common Password.");
    else {
      cpSwitch.checked = true;
      notyf.error("Please enter correct common password!");
    }
  });

  cpSwitch.addEventListener("click", function () {
    cpSwitch.disabled = true;
    if (cpSwitch.checked) showPasswordDialog(false, "commonPass");
    else showPasswordDialog(true, "commonPass");

    setTimeout(() => {
      cpSwitch.disabled = false;
    }, 500);
  });
};

const handleActivation = () => {
  const proButton = document.getElementById("activate-pro");
  proButton.addEventListener("click", () => showActivationDialog());
};

handleActivation();
handleCommonPassword();
handleEnableState();
disableZoomInOut();
handleWindowControls();
handleIncomingEvents();

// Function to show password dialog
// Also in case if type === commonPass, then filePath indicates if the user wants to enable/disable common password
function showPasswordDialog(filePath, type) {
  const dialog = document.createElement("div");
  dialog.className = "password-dialog";
  dialog.innerHTML = `
      <div class="dialog-content">
        <h2>${
          type === "encrypt"
            ? "Protect Folder"
            : type === "commonPass"
            ? filePath
              ? "Disable Common Password"
              : "Common Password"
            : "Unlock Folder"
        } </h2>
        <p>${
          type === "commonPass"
            ? filePath
              ? "Please confirm common password to disable:"
              : "Set a common password:"
            : filePath
        }</p>
        <input type="password" id="password" placeholder="Enter password" autofocus/>
        ${
          type === "decrypt" || filePath === true
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
              ? filePath
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
      filePath === false &&
      dialog.querySelector("#confirm-password").value;

    if (
      type !== "decrypt" &&
      filePath === false &&
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
      if (filePath) {
        window.electronAPI.sendMessage("match-common-password", password);
      } else {
        window.electronAPI.sendMessage("set-common-password", password);
        notyf.success("Successfully Enabled Common Password.");
      }
    } else {
      // Send the password back to main process
      window.electronAPI.sendMessage(`${type}-file`, {
        path: filePath,
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

const showActivationDialog = () => {
  const dialog = document.createElement("div");
  dialog.className = "activate-dialog";
  dialog.innerHTML = `
      <div class="dialog-content">
        <h2>Activate Pro</h2>
        <p>Enter your key to unlock Pro features.</p>

        <div class="toggle-wrapper">
            <div id="premium-btn">Premium</div>
            <div id="professional-btn">Professional</div>
        </div>
        
        <input type="text" id="activateKey" placeholder="Enter your premium activation key here" autofocus/>

        <div class="buttons">
        <button id="activate-btn">Activate</button>
        <button id="cancel-btn">Cancel</button>
        </div>

        <p id="get-key">Don’t have an activation key? <a href="https://winlock.vercel.app/pricing" target="_blank">Get one here</a></p>
      </div>
  `;

  document.body.appendChild(dialog);

  // Add CSS transitions for animations
  setTimeout(() => {
    dialog.style.opacity = "1";
    dialog.style.transform = "scale(1)";
  }, 50);

  // Add event listeners
  const cancelBtn = dialog.querySelector("#cancel-btn");
  const activateBtn = dialog.querySelector("#activate-btn");
  const activateInput = dialog.querySelector("#activateKey");
  const premiumBtn = dialog.querySelector("#premium-btn");
  const professionalBtn = dialog.querySelector("#professional-btn");

  cancelBtn.addEventListener("click", () => {
    dialog.style.opacity = "0";
    dialog.style.transform = "scale(0)";
    setTimeout(() => {
      dialog.remove();
    }, 200);
  });

  activateBtn.addEventListener("click", () => {
    const activateKey = activateInput.value;

    if (!activateKey) {
      notyf.error("Please Enter Your Activation Key!");
      return;
    }

    if (activateKey.length < 60) {
      notyf.error("Activation Key must be at least 60 characters long!");
      return;
    }

    window.electronAPI.sendMessage("activate-key", activateKey);

    dialog.style.opacity = "0";
    dialog.style.transform = "scale(0)";
    setTimeout(() => {
      dialog.remove();
    }, 200);
  });

  premiumBtn.addEventListener("click", () => {
    premiumBtn.style.backgroundColor = "#fff";
    professionalBtn.style.backgroundColor = "#f0f2f5";
    activateInput.placeholder = "Enter your premium activation key here";
  });

  professionalBtn.addEventListener("click", () => {
    professionalBtn.style.backgroundColor = "#fff";
    premiumBtn.style.backgroundColor = "#f0f2f5";
    activateInput.placeholder = "Enter your professional activation key here";
  });
};
