/**
 * Layer Management Service
 * Factory and lifecycle controller for GIS layers (Parcels & Counties).
 */

window.LayerService = (function () {
  let parcelLayer = null;
  let countyLayer = null;

  function initLayers(FeatureLayer, config) {
    const { parcels, counties } = config.services;

    // 1. County Boundaries Layer
    countyLayer = new FeatureLayer({
      url: counties.url,
      title: counties.title,
      outFields: ["*"],
      opacity: counties.defaultOpacity,
      visible: counties.defaultVisible,
      renderer: counties.renderer,
      popupTemplate: counties.popupTemplate
    });

    // 2. Statewide Parcels Layer
    parcelLayer = new FeatureLayer({
      url: parcels.url,
      title: parcels.title,
      outFields: ["*"],
      opacity: parcels.defaultOpacity,
      visible: parcels.defaultVisible,
      popupTemplate: parcels.popupTemplate
    });

    return {
      parcelLayer,
      countyLayer,
      orderedLayers: [countyLayer, parcelLayer]
    };
  }

  function getLayer(key) {
    switch (key) {
      case "parcels": return parcelLayer;
      case "counties": return countyLayer;
      default: return null;
    }
  }

  function setVisibility(key, visible) {
    const layer = getLayer(key);
    if (layer) {
      layer.visible = Boolean(visible);
    }
  }

  function setOpacity(key, opacity) {
    const layer = getLayer(key);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, parseFloat(opacity)));
    }
  }

  function getActiveCount() {
    return [parcelLayer, countyLayer].filter((l) => l && l.visible).length;
  }

  async function zoomToParcelExtent(view) {
    if (!parcelLayer) return;
    try {
      const result = await parcelLayer.queryExtent();
      if (result?.extent) {
        await view.goTo(result.extent.expand(1.1), { duration: 900 });
        return;
      }
    } catch {
      // Fallback
    }

    if (parcelLayer.fullExtent) {
      await view.goTo(parcelLayer.fullExtent.expand(1.1), { duration: 900 });
    }
  }

  return {
    initLayers,
    getLayer,
    setVisibility,
    setOpacity,
    getActiveCount,
    zoomToParcelExtent
  };
})();
