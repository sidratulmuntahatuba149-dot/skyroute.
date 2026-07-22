    return "good";
  }

  /* ------------------------------------------------------------------
     6. MAIN ACTION — "Get Travel Decision"
  ------------------------------------------------------------------ */
  planBtn.addEventListener("click", () => {
    const start = startInput.value.trim();
    const dest = destInput.value.trim();
    const weather = weatherSelect.value;
    const selected = Array.from(
      transportGrid.querySelectorAll("input[type=checkbox]:checked")
    ).map((box) => box.value);

    if (!start || !dest) {
      alert("Please enter both a starting location and a destination.");
      return;
    }

    const route = detectRoute(start, dest);
    const rec = recommend(route, weather);

    // --- Badges ---
    badgeRow.innerHTML = "";
    const weatherBadge = document.createElement("span");
    weatherBadge.className = "badge";
    weatherBadge.textContent = weatherLabel(weather);
    badgeRow.appendChild(weatherBadge);

    const routeBadge = document.createElement("span");
    if (route.type === "international") {
      routeBadge.className = "badge warn";
      routeBadge.textContent = "Detected International Flight Route";
    } else if (route.type === "domestic") {
      routeBadge.className = "badge";
      routeBadge.textContent = "Domestic Long Distance";
    } else {
      routeBadge.className = "badge";
      routeBadge.textContent = "Local Route";
    }
    badgeRow.appendChild(routeBadge);

    // --- Distance ---
    distNum.textContent = route.distance.toLocaleString();
    distUnit.textContent = route.distance === 1 ? "mile" : "miles";
    routeLine.innerHTML = `<b>${start}</b> → <b>${dest}</b>`;

    // --- Recommendation ---
    recValue.textContent = rec.headline;
    recSub.textContent = rec.detail;

    // --- Compare selected transport vs. recommendation ---
    if (selected.length) {
      const verdict = suitability(selected, rec);
      compareBlock.innerHTML = `
        <div class="compare-row">
          <span>You selected: ${selected.join(", ")}</span>
          <span class="pill ${verdict === "good" ? "good" : "reconsider"}">
            ${verdict === "good" ? "Good match" : "Reconsider"}
          </span>
        </div>`;
    } else {
      compareBlock.innerHTML = `
        <div class="compare-row">
          <span>No transport selected</span>
          <span class="pill reconsider">Pick an option</span>
        </div>`;
    }

    // --- Reveal result panel ---
    placeholder.style.display = "none";
    resultEl.classList.remove("show");
    void resultEl.offsetWidth; // force reflow so the animation restarts
    resultEl.classList.add("show");
  });

  /* ------------------------------------------------------------------
     7. SOS ALERT MODAL
  ------------------------------------------------------------------ */
  function openSosModal() {
    const start = startInput.value.trim() || "your starting point";
    const dest = destInput.value.trim() || "your destination";
    const name = emName.value.trim();
    const phone = emPhone.value.trim();

    sosMessage.textContent = `Emergency assistance requested for your trip from ${start} to ${dest}!`;

    sosContact.textContent =
      name || phone
        ? `Notifying: ${name || "Unnamed contact"}${phone ? " · " + phone : ""}`
        : "No personal emergency contact was entered — add one above so alerts can reach someone.";

    sosModal.classList.add("show");
    sosClose.focus();
  }

  function closeSosModal() {
    sosModal.classList.remove("show");
    sosBtn.focus();
  }

  sosBtn.addEventListener("click", openSosModal);
  sosClose.addEventListener("click", closeSosModal);

  // Close when clicking the dark overlay itself (not the modal box)
  sosModal.addEventListener("click", (e) => {
    if (e.target === sosModal) closeSosModal();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sosModal.classList.contains("show")) {
      closeSosModal();
    }
  });
})();
