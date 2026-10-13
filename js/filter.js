/**
 * Spatial Clip & Filter Service
 * Provides boundary selection, geometry queries, and server-side parcel clipping.
 */

window.FilterService = (function () {
  let graphicsLayer = null;
  let activeMaskPolygon = null;

  function init(GraphicsLayer, map) {
    graphicsLayer = new GraphicsLayer({
      title: "Active Clip Boundary",
      listMode: "hide"
    });
    map.add(graphicsLayer);
  }

  /**
   * Fetch distinct counties from WisconsinCountyBoundary
   */
  async function loadCounties() {
    const url = "https://services7.arcgis.com/Tk0IbKIKhaoYn5sa/arcgis/rest/services/WisconsinCountyBoundary/FeatureServer/0/query";
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "name",
      returnGeometry: "false",
      orderByFields: "name ASC",
      f: "pjson"
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();
    const seen = new Set();
    const list = [];

    (data.features || []).forEach((f) => {
      const name = f.attributes?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    });

    return list.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Fetch distinct municipalities from DNR Municipality Boundaries
   */
  async function loadMunicipalities() {
    const url = "https://dnrmaps.wi.gov/arcgis/rest/services/DW_Map_Dynamic/EN_Municipality_Boundary_WTM_Ext/MapServer/0/query";
    const params = new URLSearchParams({
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
   * Clip parcel layer to a selected County
   */
  async function clipToCounty(countyName, view, parcelLayer, Graphic, Polygon) {
    if (!countyName) {
      clearClip(parcelLayer);
      return;
    }

    // 1. Query county geometry (using WTM SR 3071 matching parcel layer)
    const url = "https://services7.arcgis.com/Tk0IbKIKhaoYn5sa/arcgis/rest/services/WisconsinCountyBoundary/FeatureServer/0/query";
    const params = new URLSearchParams({
      where: `name = '${countyName.replace(/'/g, "''")}'`,
      outFields: "name",
      returnGeometry: "true",
      outSR: "3071",
      f: "pjson"
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();
    const feat = data.features?.[0];

    if (!feat || !feat.geometry) {
      throw new Error("Could not retrieve boundary geometry for " + countyName);
    }

    const polygon = new Polygon({
      rings: feat.geometry.rings,
      spatialReference: { wkid: 3071 }
    });

    // 2. Apply server-side spatial / attribute filter to parcels
    applyFilter(parcelLayer, polygon, `UPPER(CONAME) = '${countyName.toUpperCase().replace(/'/g, "''")}'`);

    // 3. Render boundary highlight & zoom
    highlightBoundary(polygon, Graphic);
    await view.goTo(polygon.extent.expand(1.15), { duration: 900 });
  }

  /**
   * Clip parcel layer to a selected Municipality
   */
  async function clipToMunicipality(objectId, view, parcelLayer, Graphic, Polygon) {
    if (!objectId) {
      clearClip(parcelLayer);
      return;
    }

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

    // Apply spatial filter using geometry
    applyFilter(parcelLayer, polygon, null);

    // Highlight and zoom
    highlightBoundary(polygon, Graphic);
    await view.goTo(polygon.extent.expand(1.15), { duration: 900 });
  }

  function applyFilter(parcelLayer, polygon, whereClause) {
    activeMaskPolygon = polygon;
    const filterConfig = {
      geometry: polygon,
      spatialRelationship: "intersects"
    };

    if (whereClause) {
      filterConfig.where = whereClause;
    }

    parcelLayer.filter = filterConfig;
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

  function clearClip(parcelLayer) {
    activeMaskPolygon = null;
    if (parcelLayer) {
      parcelLayer.filter = null;
      parcelLayer.definitionExpression = null;
    }
    if (graphicsLayer) {
      graphicsLayer.removeAll();
    }
  }

  return {
    init,
    loadCounties,
    loadMunicipalities,
    clipToCounty,
    clipToMunicipality,
    clearClip
  };
})();
