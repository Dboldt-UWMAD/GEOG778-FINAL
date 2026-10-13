/**
 * UI & Interaction Controller
 * Manages view states, segmented tabs, spatial clipping filters, and DOM events.
 */

window.UIController = (function () {
  let elements = {};

  function cacheDOMElements() {
    elements = {
      // Panel
      panel: document.getElementById("mainPanel"),
      panelHeader: document.getElementById("panelHeaderToggle"),
      collapseIcon: document.getElementById("collapseIcon"),

      // Header Status Pill
      statusPill: document.getElementById("layerBadge"),
      statusText: document.getElementById("layerBadgeText"),

      // Tabs
      tabBtns: document.querySelectorAll(".tab-nav-btn"),
      tabViews: document.querySelectorAll(".tab-page"),

      // Layer 1: Parcels
      parcelToggle: document.getElementById("parcelToggle"),
      parcelOpacity: document.getElementById("parcelOpacitySlider"),
      parcelOpacityLabel: document.getElementById("parcelOpacityLabel"),
      zoomExtentBtn: document.getElementById("zoomExtentBtn"),

      // Layer 2: Municipalities
      muniToggle: document.getElementById("muniToggle"),
      muniOpacity: document.getElementById("muniOpacitySlider"),
      muniOpacityLabel: document.getElementById("muniOpacityLabel"),

      // Layer 3: Counties
      countyToggle: document.getElementById("countyToggle"),
      countyOpacity: document.getElementById("countyOpacitySlider"),
      countyOpacityLabel: document.getElementById("countyOpacityLabel"),

      // Spatial Clipping Controls
      clipModeRadios: document.querySelectorAll('input[name="clipMode"]'),
      countySelectWrap: document.getElementById("countySelectWrap"),
      countySelect: document.getElementById("countySelect"),
      muniSelectWrap: document.getElementById("muniSelectWrap"),
      muniSelect: document.getElementById("muniSelect"),
      resetClipBtn: document.getElementById("resetClipBtn"),
      clipBadge: document.getElementById("clipBadge"),

      // Basemap Buttons
      basemapCards: document.querySelectorAll(".basemap-card"),

      // Loading Indicator
      loadingPill: document.getElementById("loadingIndicator")
    };
  }

  function updateStatusBadge(activeCount, totalCount = 3) {
    if (!elements.statusText || !elements.statusPill) return;
    elements.statusText.textContent = `${activeCount}/${totalCount} Layers Visible`;
    if (activeCount === 0) {
      elements.statusPill.classList.add("inactive");
    } else {
      elements.statusPill.classList.remove("inactive");
    }
  }

  function populateCountySelect(counties) {
    if (!elements.countySelect) return;
    elements.countySelect.innerHTML = '<option value="">-- Choose a County --</option>';
    counties.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} County`;
      elements.countySelect.appendChild(opt);
    });
  }

  function populateMuniSelect(munis) {
    if (!elements.muniSelect) return;
    elements.muniSelect.innerHTML = '<option value="">-- Choose a Municipality --</option>';
    munis.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      elements.muniSelect.appendChild(opt);
    });
  }

  function setCountySelection(countyName) {
    const countyRadio = document.querySelector('input[name="clipMode"][value="county"]');
    if (countyRadio) countyRadio.checked = true;
    if (elements.countySelectWrap) elements.countySelectWrap.style.display = "flex";
    if (elements.muniSelectWrap) elements.muniSelectWrap.style.display = "none";
    if (elements.resetClipBtn) elements.resetClipBtn.style.display = "inline-flex";
    if (elements.countySelect) elements.countySelect.value = countyName;
    if (elements.clipBadge) {
      elements.clipBadge.style.display = "inline-flex";
      elements.clipBadge.textContent = `Clipped: ${countyName} Co.`;
    }
  }

  function bindEvents({
    onLayerToggle,
    onLayerOpacity,
    onZoomExtent,
    onBasemapChange,
    onCountySelected,
    onMuniSelected,
    onResetClip
  }) {
    // 1. Collapsible Panel
    elements.panelHeader?.addEventListener("click", () => {
      const isCollapsed = elements.panel.classList.toggle("collapsed");
      if (elements.collapseIcon) {
        elements.collapseIcon.className = isCollapsed
          ? "fa-solid fa-chevron-down"
          : "fa-solid fa-chevron-up";
      }
    });

    // 2. Segmented Tabs
    elements.tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetViewId = btn.getAttribute("data-tab");
        elements.tabBtns.forEach((b) => b.classList.remove("active"));
        elements.tabViews.forEach((v) => (v.style.display = "none"));

        btn.classList.add("active");
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.style.display = "flex";
      });
    });

    // 3. Layer Toggles & Opacity
    const layerConfigs = [
      { key: "parcels", toggle: elements.parcelToggle, slider: elements.parcelOpacity, label: elements.parcelOpacityLabel },
      { key: "municipalities", toggle: elements.muniToggle, slider: elements.muniOpacity, label: elements.muniOpacityLabel },
      { key: "counties", toggle: elements.countyToggle, slider: elements.countyOpacity, label: elements.countyOpacityLabel }
    ];

    layerConfigs.forEach(({ key, toggle, slider, label }) => {
      toggle?.addEventListener("change", (e) => {
        onLayerToggle(key, e.target.checked);
      });

      slider?.addEventListener("input", (e) => {
        const val = e.target.value;
        if (label) label.textContent = `${val}%`;
        onLayerOpacity(key, val / 100);
      });
    });

    // 4. Spatial Clip Mode Switcher (All / County / Muni)
    elements.clipModeRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const mode = e.target.value;
        if (mode === "all") {
          elements.countySelectWrap.style.display = "none";
          elements.muniSelectWrap.style.display = "none";
          elements.resetClipBtn.style.display = "none";
          elements.clipBadge.style.display = "none";
          onResetClip();
        } else if (mode === "county") {
          elements.countySelectWrap.style.display = "flex";
          elements.muniSelectWrap.style.display = "none";
          elements.resetClipBtn.style.display = "inline-flex";
          if (elements.countySelect.value) {
            onCountySelected(elements.countySelect.value);
          }
        } else if (mode === "muni") {
          elements.countySelectWrap.style.display = "none";
          elements.muniSelectWrap.style.display = "flex";
          elements.resetClipBtn.style.display = "inline-flex";
          if (elements.muniSelect.value) {
            onMuniSelected(elements.muniSelect.value);
          }
        }
      });
    });

    // 5. County Selector Event
    elements.countySelect?.addEventListener("change", (e) => {
      const county = e.target.value;
      if (county) {
        setCountySelection(county);
        onCountySelected(county);
      } else {
        elements.clipBadge.style.display = "none";
        onResetClip();
      }
    });

    // 6. Municipality Selector Event
    elements.muniSelect?.addEventListener("change", (e) => {
      const muniId = e.target.value;
      if (muniId) {
        const text = elements.muniSelect.options[elements.muniSelect.selectedIndex].text;
        elements.clipBadge.style.display = "inline-flex";
        elements.clipBadge.textContent = `Clipped: ${text}`;
        onMuniSelected(muniId);
      } else {
        elements.clipBadge.style.display = "none";
        onResetClip();
      }
    });

    // 7. Reset Clip Button
    elements.resetClipBtn?.addEventListener("click", () => {
      const allRadio = document.querySelector('input[name="clipMode"][value="all"]');
      if (allRadio) allRadio.checked = true;
      elements.countySelectWrap.style.display = "none";
      elements.muniSelectWrap.style.display = "none";
      elements.resetClipBtn.style.display = "none";
      elements.clipBadge.style.display = "none";
      if (elements.countySelect) elements.countySelect.value = "";
      if (elements.muniSelect) elements.muniSelect.value = "";
      onResetClip();
    });

    // 8. Zoom Extent Button
    elements.zoomExtentBtn?.addEventListener("click", onZoomExtent);

    // 9. Basemap Switcher
    elements.basemapCards.forEach((card) => {
      card.addEventListener("click", () => {
        elements.basemapCards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        const basemapKey = card.getAttribute("data-bm");
        onBasemapChange(basemapKey);
      });
    });
  }

  function bindLoadingIndicator(layerView) {
    if (!elements.loadingPill || !layerView) return;
    layerView.watch("updating", (isUpdating) => {
      if (isUpdating) {
        elements.loadingPill.classList.remove("hidden");
      } else {
        elements.loadingPill.classList.add("hidden");
      }
    });
  }

  return {
    init(callbacks) {
      cacheDOMElements();
      bindEvents(callbacks);
    },
    populateCountySelect,
    populateMuniSelect,
    setCountySelection,
    updateStatusBadge,
    bindLoadingIndicator
  };
})();
