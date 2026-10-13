/**
 * Spatial Clip & Filter Service
 * Restricts parcel boundaries directly by the county field "CONAME" on the parcel layer
 * (Grant, Green, Iowa, Lafayette, Richland), with map click selection and polygon highlighting.
 */

window.FilterService = (function () {
  let graphicsLayer = null;

  // Exact 5 counties present in the Wisconsin Statewide Parcel by State Ownership dataset
  const ALLOWED_COUNTIES = Object.freeze([
    "Grant",
    "Green",
    "Iowa",
    "Lafayette",
    "Richland"
  ]);

  function init(GraphicsLayer, map) {
    graphicsLayer = new GraphicsLayer({
      title: "Active Clip Boundary",
      listMode: "hide"
    });
    map.add(graphicsLayer);
  }

  /**
   * Return the strict list of target counties
   */
  async function loadCounties() {
    return [...ALLOWED_COUNTIES];
  }

  /**
   * Fetch distinct municipalities within the 5 target counties' bounding extent
   */
  async function loadMunicipalities() {
    const url = "https://dnrmaps.wi.gov/arcgis/rest/services/DW_Map_Dynamic/EN_Municipality_Boundary_WTM_Ext/MapServer/0/query";
    const params = new URLSearchParams({
      geometry: JSON.stringify({
        xmin: 426762,
        ymin: 225497,
        xmax: 572107,
        ymax: 342460,
        spatialReference: { wkid: 3071 }
      }),
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      inSR: "3071",
      where: "MCD_TYPE_CODE in ('C','V')",
      outFields: "OBJECTID,MCD_NAME,MCD_LOWERCASE_NAME,MCD_TYPE_CODE",
      returnGeometry: "false",
      orderByFields: "MCD_LOWERCASE_NAME ASC",
      resultRecordCount: "1000",
      f: "pjson"
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();
    const mapItems = new Map();

    (data.features || []).forEach((f) => {
      const id = f.attributes?.OBJECTID;
      const name = f.attributes?.MCD_LOWERCASE_NAME || f.attributes?.MCD_NAME;
      const type = f.attributes?.MCD_TYPE_CODE === "C" ? "City" : "Village";
      if (id && name && !mapItems.has(name)) {
        mapItems.set(name, { id, name: `${name} (${type})`, rawName: name });
      }
    });

    return Array.from(mapItems.values()).sort((a, b) => a.rawName.localeCompare(b.rawName));
  }

  /**
   * Filter the parcel layer to ONLY show parcels in the selected county
   * uses the CONAME (County Name) attribute on the parcel layer: CONAME = 'GRANT', etc.
   */
  async function clipToCounty(countyName, view, parcelLayer, Graphic, Polygon) {
    if (!countyName) {
      await clearClip(parcelLayer, view);
      return;
    }

    const matchedCounty = ALLOWED_COUNTIES.find(
      (c) => c.toLowerCase() === countyName.trim().toLowerCase()
    );

    if (!matchedCounty) {
      console.warn(`County ${countyName} is not one of the 5 supported counties.`);
      return;
    }

    // 1. Direct attribute filter on the parcel layer using CONAME (all uppercase in the database)
    const upperCounty = matchedCounty.toUpperCase();
    parcelLayer.definitionExpression = `CONAME = '${upperCounty}'`;

    // Clear any previous layerView client filter
    try {
      const layerView = await view.whenLayerView(parcelLayer);
      layerView.filter = null;
    } catch {
      // ignore
    }

    // 2. Query and highlight the county boundary polygon
    try {
      const url = "https://services7.arcgis.com/Tk0IbKIKhaoYn5sa/arcgis/rest/services/WisconsinCountyBoundary/FeatureServer/0/query";
      const params = new URLSearchParams({
        where: `name = '${matchedCounty}'`,
        outFields: "name",
        returnGeometry: "true",
        outSR: "3071",
        f: "pjson"
      });

      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      const feat = data.features?.[0];

      if (feat && feat.geometry) {
        const polygon = new Polygon({
          rings: feat.geometry.rings,
          spatialReference: { wkid: 3071 }
        });

        highlightBoundary(polygon, Graphic);
        await view.goTo(polygon.extent.expand(1.15), { duration: 900 });
        return;
      }
    } catch (err) {
      console.warn("Could not retrieve boundary graphic:", err);
    }

    // Fallback: zoom to parcel extent matching the definitionExpression
    try {
      const extentResult = await parcelLayer.queryExtent();
      if (extentResult && extentResult.extent) {
        await view.goTo(extentResult.extent.expand(1.15), { duration: 900 });
      }
    } catch {
      // Ignore extent error
    }
  }

  /**
   * Filter the parcel layer to a selected Municipality
   */
  async function clipToMunicipality(objectId, view, parcelLayer, Graphic, Polygon) {
    if (!objectId) {
      await clearClip(parcelLayer, view);
      return;
    }

    try {
      const url = "https://dnrmaps.wi.gov/arcgis/rest/services/DW_Map_Dynamic/EN_Municipality_Boundary_WTM_Ext/MapServer/0/query";
      const params = new URLSearchParams({
        where: `OBJECTID = ${objectId}`,
        outFields: "OBJECTID,MCD_NAME,MCD_LOWERCASE_NAME",
        returnGeometry: "true",
        outSR: "3071",
        f: "pjson"
      });

      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      const feat = data.features?.[0];

      if (!feat || !feat.geometry) {
        throw new Error("Could not retrieve municipality geometry");
      }

      const polygon = new Polygon({
        rings: feat.geometry.rings,
        spatialReference: { wkid: 3071 }
      });

      // Filter via FeatureLayerView spatial filter so only parcels inside this municipality render
      const layerView = await view.whenLayerView(parcelLayer);
      layerView.filter = {
        geometry: polygon,
        spatialRelationship: "intersects"
      };

      // Reset definition expression so it considers all parcels across the region
      parcelLayer.definitionExpression = null;

      highlightBoundary(polygon, Graphic);
      await view.goTo(polygon.extent.expand(1.15), { duration: 900 });
    } catch (err) {
      console.error("Municipality clip error:", err);
    }
  }

  function highlightBoundary(polygon, Graphic) {
    if (!graphicsLayer) return;
    graphicsLayer.removeAll();

    const graphic = new Graphic({
      geometry: polygon,
      symbol: {
        type: "simple-fill",
        color: [37, 99, 235, 0.08],
        outline: {
          color: [37, 99, 235, 0.95],
          width: 2.5,
          style: "solid"
        }
      }
    });

    graphicsLayer.add(graphic);
  }

  async function clearClip(parcelLayer, view) {
    if (parcelLayer) {
      parcelLayer.definitionExpression = null;
      if (view) {
        try {
          const layerView = await view.whenLayerView(parcelLayer);
          layerView.filter = null;
        } catch {
          // ignore
        }
      }
    }
    if (graphicsLayer) {
      graphicsLayer.removeAll();
    }
  }

  return {
    init,
    ALLOWED_COUNTIES,
    loadCounties,
    loadMunicipalities,
    clipToCounty,
    clipToMunicipality,
    clearClip
  };
})();
