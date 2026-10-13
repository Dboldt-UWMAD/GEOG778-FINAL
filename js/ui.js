/**
 * UI & Interaction Controller
 * Manages view states, segmented tabs, county filter selection,
 * and the dynamic Top 5 Owner Mailing States bar chart.
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

      // Layer 2: Counties
      countyToggle: document.getElementById("countyToggle"),
      countyOpacity: document.getElementById("countyOpacitySlider"),
      countyOpacityLabel: document.getElementById("countyOpacityLabel"),

      // County Filter Controls
      countySelect: document.getElementById("countySelect"),
      resetClipBtn: document.getElementById("resetClipBtn"),
      clipBadge: document.getElementById("clipBadge"),

      // Top 5 States Bar Chart Container
      barChartContainer: document.getElementById("barChartContainer"),
      chartScopeLabel: document.getElementById("chartScopeLabel"),

      // Basemap Buttons
      basemapCards: document.querySelectorAll(".basemap-card"),

      // Loading Indicator
      loadingPill: document.getElementById("loadingIndicator")
    };
  }

  function updateStatusBadge(activeCount, totalCount = 2) {
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
    elements.countySelect.innerHTML = '<option value="">All 5 Counties</option>';
    counties.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} County`;
      elements.countySelect.appendChild(opt);
    });
  }

  function setCountySelection(countyName) {
    if (elements.countySelect) {
      elements.countySelect.value = countyName || "";
    }
    if (countyName) {
      if (elements.resetClipBtn) elements.resetClipBtn.style.display = "inline-flex";
      if (elements.clipBadge) {
        elements.clipBadge.style.display = "inline-flex";
        elements.clipBadge.textContent = `${countyName} County`;
      }
    } else {
      if (elements.resetClipBtn) elements.resetClipBtn.style.display = "none";
      if (elements.clipBadge) elements.clipBadge.style.display = "none";
    }
  }

  /**
   * Render dynamic, responsive bar chart for top 5 owner states
   */
  function renderBarChart(stateData, currentCounty) {
    if (!elements.barChartContainer) return;

    if (elements.chartScopeLabel) {
      elements.chartScopeLabel.textContent = currentCounty
        ? `${currentCounty} County`
        : "5-County Region";
    }

    if (!stateData || stateData.length === 0) {
      elements.barChartContainer.innerHTML = '<p style="font-size: 0.74rem; color: var(--color-text-muted);">No parcel data available.</p>';
      return;
    }

    const maxCount = Math.max(...stateData.map((d) => d.count), 1);

    const html = stateData
      .map((item, idx) => {
        const percent = Math.max(6, Math.round((item.count / maxCount) * 100));
        const formattedCount = item.count.toLocaleString();
        const isWI = item.state === "WI";
        const barColor = isWI
          ? "linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)"
          : "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)";

        return `
          <div class="chart-row">
            <div class="chart-state-badge ${isWI ? 'highlight' : ''}">${item.state}</div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width: ${percent}%; background: ${barColor};">
                <span class="chart-bar-val">${formattedCount}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    elements.barChartContainer.innerHTML = html;
  }

  function bindEvents({
    onLayerToggle,
    onLayerOpacity,
    onZoomExtent,
    onBasemapChange,
    onCountySelected,
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

    // 4. County Selector Event
    elements.countySelect?.addEventListener("change", (e) => {
      const county = e.target.value;
      setCountySelection(county);
      if (county) {
        onCountySelected(county);
      } else {
        onResetClip();
      }
    });

    // 5. Reset Filter Button
    elements.resetClipBtn?.addEventListener("click", () => {
      setCountySelection("");
      onResetClip();
    });

    // 6. Zoom Extent Button
    elements.zoomExtentBtn?.addEventListener("click", onZoomExtent);

    // 7. Basemap Switcher
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
    setCountySelection,
    renderBarChart,
    updateStatusBadge,
    bindLoadingIndicator
  };
})();
