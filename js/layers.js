/**
 * Layer Management Service
 * Factory and lifecycle controller for GIS Feature and MapImage layers.
 */

window.LayerService = (function () {
  let parcelLayer = null;
  let muniLayer = null;
  let countyLayer = null;

  /**
   * Instantiate and configure layers using ArcGIS SDK modules
   */
  function initLayers(FeatureLayer, MapImageLayer, config) {
    const { parcels, municipalities, counties } = config.services;

    // 1. County Boundaries Layer (Base layer for spatial reference)
    countyLayer = new FeatureLayer({
      url: counties.url,
      title: counties.title,
      outFields: ["*"],
      opacity: counties.defaultOpacity,
      visible: counties.defaultVisible,
      renderer: counties.renderer,
      popupTemplate: counties.popupTemplate
    });

    // 2. Municipality Boundaries Layer (WI DNR Dynamic Map Service)
    muniLayer = new MapImageLayer({
      url: municipalities.url,
      title: municipalities.title,
      opacity: municipalities.defaultOpacity,
      visible: municipalities.defaultVisible,
      sublayers: [
        {
          id: municipalities.sublayerId,
          visible: true,
          title: "Municipality Boundary",
          popupTemplate: municipalities.popupTemplate
        }
      ]
    });

    // 3. Statewide Parcels Layer (Highest detail feature layer)
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
      muniLayer,
      countyLayer,
      orderedLayers: [countyLayer, muniLayer, parcelLayer]
    };
  }

  function getLayer(key) {
    switch (key) {
      case "parcels": return parcelLayer;
      case "municipalities": return muniLayer;
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
    return [parcelLayer, muniLayer, countyLayer].filter((l) => l && l.visible).length;
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
      // Fallback to pre-defined fullExtent if available
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
