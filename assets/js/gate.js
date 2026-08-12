(function () {
  const state = loadState();

  // If already joined, skip straight to the app.
  if (state.profile && state.profile.name) {
    // Don't auto-redirect on the marketing page load without interaction —
    // but do offer a quick path in.
    document.getElementById("openGateBtn").textContent = "Enter →";
    document.getElementById("openGateBtnHero").textContent = "Continue to Lumen →";
  }

  const verse = verseOfTheDay();
  document.getElementById("heroVerse").textContent = `"${verse.text}" — ${verse.ref}`;

  const backdrop = document.getElementById("gateBackdrop");
  const nameInput = document.getElementById("nameInput");
  const affirmCheck = document.getElementById("affirmCheck");
  const errorText = document.getElementById("gateError");

  function openGate() {
    if (state.profile && state.profile.name) {
      window.location.href = "app.html";
      return;
    }
    backdrop.style.display = "flex";
    nameInput.focus();
  }
  function closeGate() {
    backdrop.style.display = "none";
    errorText.style.display = "none";
  }

  document.getElementById("openGateBtn").addEventListener("click", openGate);
  document.getElementById("openGateBtnHero").addEventListener("click", openGate);
  const footerJoinLink = document.getElementById("footerJoinLink");
  if (footerJoinLink) {
    footerJoinLink.addEventListener("click", (e) => {
      e.preventDefault();
      openGate();
    });
  }
  document.getElementById("cancelGateBtn").addEventListener("click", closeGate);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeGate();
  });

  document.getElementById("enterBtn").addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name || !affirmCheck.checked) {
      errorText.style.display = "block";
      return;
    }
    state.profile = { name, joinedAt: Date.now() };
    saveState(state);
    window.location.href = "app.html";
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("enterBtn").click();
  });
})();
