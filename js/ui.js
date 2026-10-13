/**
 * UI & Interaction Controller
 * Manages view states, segmented tabs, collapsible panel, and DOM events.
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

  function bindEvents({ onLayerToggle, onLayerOpacity, onZoomExtent, onBasemapChange }) {
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

    // 3. Layer Toggles
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

    // 4. Zoom Extent Button
    elements.zoomExtentBtn?.addEventListener("click", onZoomExtent);

    // 5. Basemap Switcher
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
    updateStatusBadge,
    bindLoadingIndicator
  };
})();
