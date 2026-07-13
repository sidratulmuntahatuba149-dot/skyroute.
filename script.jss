/* ==========================================================================
   SKYROUTE — Travel Weather Decision App
   script.js — weather theming/FX, distance engine, transport logic, SOS
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0. DOM REFERENCES
  ------------------------------------------------------------------ */
  const body = document.body;
  const fxLayer = document.getElementById("fxLayer");

  const startInput = document.getElementById("start");
  const destInput = document.getElementById("dest");
  const weatherSelect = document.getElementById("weather");

  const transportGrid = document.getElementById("transportGrid");
  const noneOpt = document.getElementById("noneOpt");
  const otherBoxes = Array.from(
    transportGrid.querySelectorAll("input[type=checkbox]")
  ).filter((box) => box !== noneOpt);

  const planBtn = document.getElementById("planBtn");
  const placeholder = document.getElementById("placeholder");
  const resultEl = document.getElementById("result");
  const badgeRow = document.getElementById("badgeRow");
  const distNum = document.getElementById("distNum");
  const distUnit = document.getElementById("distUnit");
  const routeLine = document.getElementById("routeLine");
  const recValue = document.getElementById("recValue");
  const recSub = document.getElementById("recSub");
  const compareBlock = document.getElementById("compareBlock");

  const emName = document.getElementById("emName");
  const emPhone = document.getElementById("emPhone");
  const sosBtn = document.getElementById("sosBtn");
  const sosModal = document.getElementById("sosModal");
  const sosMessage = document.getElementById("sosMessage");
  const sosContact = document.getElementById("sosContact");
  const sosClose = document.getElementById("sosClose");

  /* ------------------------------------------------------------------
     1. REFERENCE DATA
  ------------------------------------------------------------------ */
  const THEMES = ["theme-rainy", "theme-sunny", "theme-cold", "theme-neutral"];

  // Recognized global (international) cities
  const GLOBAL_CITIES = [
    "new york", "london", "tokyo", "paris", "dubai", "singapore", "sydney",
    "toronto", "mumbai", "delhi", "beijing", "moscow", "los angeles",
    "san francisco", "chicago", "berlin", "rome", "madrid", "bangkok",
    "kuala lumpur", "seoul", "hong kong", "cairo"
  ];

  // Recognized Bangladeshi cities (domestic long-distance triggers)
  const BD_CITIES = [
    "dhaka", "sylhet", "chittagong", "chattogram", "jashore", "jessore",
    "khulna", "rajshahi", "barisal", "rangpur", "mymensingh", "comilla",
    "cox's bazar", "coxs bazar"
  ];

  /* ------------------------------------------------------------------
     2. WEATHER THEME + BACKGROUND PARTICLE EFFECTS
  ------------------------------------------------------------------ */
  function clearFx() {
    fxLayer.innerHTML = "";
  }

  function buildRain() {
    clearFx();
    for (let i = 0; i < 70; i++) {
      const drop = document.createElement("div");
      drop.className = "drop";
      drop.style.left = Math.random() * 100 + "vw";
      drop.style.animationDuration = (0.5 + Math.random() * 0.6) + "s";
      drop.style.animationDelay = Math.random() * 2 + "s";
      drop.style.opacity = (0.3 + Math.random() * 0.5).toFixed(2);
      fxLayer.appendChild(drop);
    }
  }

  function buildSnow() {
    clearFx();
    for (let i = 0; i < 60; i++) {
      const flake = document.createElement("div");
      flake.className = "flake";
      const size = 2 + Math.random() * 4;
      flake.style.width = size + "px";
      flake.style.height = size + "px";
      flake.style.left = Math.random() * 100 + "vw";
      flake.style.setProperty("--sway", (Math.random() * 80 - 40) + "px");
      flake.style.animationDuration = (6 + Math.random() * 6) + "s";
      flake.style.animationDelay = Math.random() * 5 + "s";
      fxLayer.appendChild(flake);
    }
  }

  function buildSun() {
    clearFx();
    for (let i = 0; i < 5; i++) {
      const ray = document.createElement("div");
      ray.className = "ray";
      const size = 180 + Math.random() * 220;
      ray.style.width = size + "px";
      ray.style.height = size + "px";
      ray.style.left = Math.random() * 100 + "vw";
      ray.style.top = Math.random() * 70 + "vh";
      ray.style.animationDelay = Math.random() * 4 + "s";
      fxLayer.appendChild(ray);
    }
  }

  function buildNeutral() {
    clearFx();
    for (let i = 0; i < 26; i++) {
      const leaf = document.createElement("div");
      leaf.className = "leaf";
      const size = 6 + Math.random() * 8;
      leaf.style.width = size + "px";
      leaf.style.height = size + "px";
      leaf.style.left = Math.random() * 100 + "vw";
      leaf.style.setProperty("--sway", (Math.random() * 100 - 50) + "px");
      leaf.style.animationDuration = (8 + Math.random() * 8) + "s";
      leaf.style.animationDelay = Math.random() * 6 + "s";
      fxLayer.appendChild(leaf);
    }
  }

  // Swap the body's theme class and rebuild the matching particle effect
  function applyTheme(weather) {
    body.classList.remove(...THEMES);
    if (weather === "rainy") {
      body.classList.add("theme-rainy");
      buildRain();
    } else if (weather === "sunny") {
      body.classList.add("theme-sunny");
      buildSun();
    } else if (weather === "cold") {
      body.classList.add("theme-cold");
      buildSnow();
    } else {
      body.classList.add("theme-neutral");
      buildNeutral();
    }
  }

  weatherSelect.addEventListener("change", (e) => applyTheme(e.target.value));
  applyTheme("neutral"); // initial theme on load

  /* ------------------------------------------------------------------
     3. TRANSPORT "NONE" LOGIC
     Checking "None" clears every other box; checking any other box
     automatically clears "None".
  ------------------------------------------------------------------ */
  noneOpt.addEventListener("change", () => {
    if (noneOpt.checked) {
      otherBoxes.forEach((box) => (box.checked = false));
    }
  });

  otherBoxes.forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) noneOpt.checked = false;
    });
  });

  /* ------------------------------------------------------------------
     4. DISTANCE + LOCATION DETECTION ENGINE
  ------------------------------------------------------------------ */

  // Random number generator, optionally rounded to N decimal places
  function rand(min, max, decimals = 0) {
    const value = Math.random() * (max - min) + min;
    return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.round(value);
  }

  // Returns the first city from `list` found inside `text`, or null
  function findCity(text, list) {
    return list.find((city) => text.includes(city)) || null;
  }

  // Classifies a route as local / domestic / international and assigns
  // a realistic distance for that classification.
  function detectRoute(startRaw, destRaw) {
    const s = startRaw.toLowerCase();
    const d = destRaw.toLowerCase();

    const sGlobal = findCity(s, GLOBAL_CITIES);
    const dGlobal = findCity(d, GLOBAL_CITIES);
    const sBD = findCity(s, BD_CITIES);
    const dBD = findCity(d, BD_CITIES);

    // International: any recognized global city, unless both ends name
    // the *same* city (that's intra-city travel, not a flight).
    if (sGlobal || dGlobal) {
      if (sGlobal && dGlobal && sGlobal === dGlobal) {
        return { type: "local-global", city: sGlobal, distance: rand(0.5, 8, 1) };
      }
      return {
        type: "international",
        from: sGlobal,
        to: dGlobal,
        distance: rand(3000, 7000),
      };
    }

    // Domestic (Bangladesh): recognized BD city on either/both ends
    if (sBD || dBD) {
      if (sBD && dBD && sBD === dBD) {
        return { type: "local-bd", city: sBD, distance: rand(0.5, 8, 1) };
      }
      return {
        type: "domestic",
        from: sBD || "origin city",
        to: dBD || "destination city",
        distance: rand(120, 250),
      };
    }

    // Fallback: unknown / local locations
    return { type: "local", distance: rand(0.5, 8, 1) };
  }

  /* ------------------------------------------------------------------
     5. TRANSPORT RECOMMENDATION ENGINE
  ------------------------------------------------------------------ */
  function recommend(route, weather) {
    // International routes: flight is the only realistic option
    if (route.type === "international") {
      const advisory =
        weather === "rainy" || weather === "cold"
          ? " Given current weather, also check airport availability and possible delays."
          : "";
      return {
        headline: "✈️ International Flight (আন্তর্জাতিক বিমান)",
        detail:
          "This route crosses a long international distance — flying is the only realistic option. Bus, train, and rickshaw are not applicable." +
          advisory,
        category: "flight",
      };
    }

    // Domestic long distance: inter-city bus or train
    if (route.type === "domestic") {
      return {
        headline: "🚌🚆 Inter-city Bus / Train (আন্তঃজেলা বাস বা ট্রেন)",
        detail: `This is a long domestic route (${route.from} → ${route.to}). An inter-city bus or train is the most realistic option over this distance.`,
        category: "intercity",
      };
    }

    // Short distance (< 1 mile)
    if (route.distance < 1) {
      if (weather === "rainy") {
        return {
          headline: "🛺 Local Rickshaw / Cab",
          detail:
            "It's a very short hop, but rain makes walking impractical — a local rickshaw or cab keeps you dry.",
          category: "short-vehicle",
        };
      }
      return {
        headline: "🚶 Walking",
        detail: "It's close enough to walk comfortably in current conditions.",
        category: "walk",
      };
    }

    // Medium distance (1–6 miles)
    if (route.distance <= 6) {
      if (route.type === "local-global") {
        return {
          headline: "🚇 City Underground / Cab",
          detail:
            "For this distance in a major global city, the metro/underground or a cab is fastest and most reliable.",
          category: "urban",
        };
      }
      return {
        headline: "🛺 Public CNG / Rickshaw",
        detail: "A medium local distance — shared CNG or rickshaw is the practical everyday choice.",
        category: "urban",
      };
    }

    // Fallback: longer local/regional distance not flagged domestic/international
    return {
      headline: "🚗 Car / Ride-Sharing",
      detail: "This distance is best covered by a car or ride-sharing service.",
      category: "vehicle",
    };
  }

  function weatherLabel(w) {
    return { rainy: "Rainy", sunny: "Sunny / Too Hot", cold: "Cold", neutral: "Neutral" }[w];
  }

  // Compares the user's selected transport modes against the recommendation
  function suitability(selected, rec) {
    const vehicleWords = ["Bike", "Car", "Ride-Sharing", "Other Vehicle"];

    if (rec.category === "flight") {
      return selected.length ? "reconsider" : "good";
    }
    if (rec.category === "walk") {
      return selected.includes("None") || selected.length === 0 ? "good" : "reconsider";
    }
    if (rec.category === "intercity" || rec.category === "vehicle") {
      return selected.some((s) => vehicleWords.includes(s)) ? "good" : "reconsider";
    }
    if (rec.category === "urban") {
      return selected.some((s) => vehicleWords.includes(s)) || selected.includes("None")
        ? "good"
        : "reconsider";
    }
    if (rec.category === "short-vehicle") {
      return selected.some((s) => vehicleWords.includes(s)) ? "good" : "reconsider";
    }
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
