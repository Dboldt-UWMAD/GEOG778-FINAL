/**
 * County Filter & Top 5 Owner Mailing States Analytics Service
 * Provides county parcel filtering by CONAME, polygon outline highlights,
 * and live dynamic aggregation for the top 5 owner states.
 */

window.FilterService = (function () {
  let graphicsLayer = null;

  // The 5 target counties present in the parcel dataset
  const ALLOWED_COUNTIES = Object.freeze([
    "Grant",
    "Green",
    "Iowa",
    "Lafayette",
    "Richland"
  ]);

  // Valid 2-letter US State postal codes (filters out data-entry noise like "Well")
  const US_STATES = new Set([
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
  ]);

  function init(GraphicsLayer, map) {
    graphicsLayer = new GraphicsLayer({
      title: "Active Clip Boundary",
      listMode: "hide"
    });
    map.add(graphicsLayer);
  }

  function loadCounties() {
    return [...ALLOWED_COUNTIES];
  }

  /**
   * Filter the parcel layer to ONLY show parcels in the selected county
   * uses the CONAME attribute on the parcel layer: CONAME = 'GRANT', etc.
   */
  async function clipToCounty(countyName, view, parcelLayer, Graphic, Polygon) {
    if (!countyName) {
      await clearClip(parcelLayer);
      return;
    }

    const matchedCounty = ALLOWED_COUNTIES.find(
      (c) => c.toLowerCase() === countyName.trim().toLowerCase()
    );

    if (!matchedCounty) {
      console.warn(`County ${countyName} is not in the allowed list.`);
      return;
    }

    const upperCounty = matchedCounty.toUpperCase();
    parcelLayer.definitionExpression = `CONAME = '${upperCounty}'`;

    // Query and highlight the county boundary polygon
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

    try {
      const extentResult = await parcelLayer.queryExtent();
      if (extentResult?.extent) {
        await view.goTo(extentResult.extent.expand(1.15), { duration: 900 });
      }
    } catch {
      // Ignore
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

  async function clearClip(parcelLayer) {
    if (parcelLayer) {
      parcelLayer.definitionExpression = null;
    }
    if (graphicsLayer) {
      graphicsLayer.removeAll();
    }
  }

  /**
   * Intelligently queries the parcel layer for top 5 owner mailing states
   * dynamically responding to the current county filter (or all 5 counties).
   */
  async function fetchTop5States(currentCounty) {
    const url = "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_by_State_Ownership/FeatureServer/4/query";

    let whereClause = "mailing_state IS NOT NULL";
    if (currentCounty && ALLOWED_COUNTIES.includes(currentCounty)) {
      whereClause += ` AND CONAME = '${currentCounty.toUpperCase()}'`;
    }

    const params = new URLSearchParams({
      where: whereClause,
      groupByFieldsForStatistics: "mailing_state",
      outStatistics: JSON.stringify([
        {
          statisticType: "count",
          onStatisticField: "OBJECTID",
          outStatisticFieldName: "state_count"
        }
      ]),
      orderByFields: "state_count DESC",
      resultRecordCount: "12",
      f: "pjson"
    });

    const res = await fetch(`${url}?${params.toString()}`);
    const data = await res.json();
    const rawFeatures = data.features || [];

    // Filter valid state abbreviations and extract top 5
    const validStates = [];
    for (const f of rawFeatures) {
      const st = (f.attributes?.mailing_state || "").trim().toUpperCase();
      const count = f.attributes?.state_count || 0;
      if (US_STATES.has(st)) {
        validStates.push({ state: st, count });
        if (validStates.length === 5) break;
      }
    }

    return validStates;
  }

  return {
    init,
    ALLOWED_COUNTIES,
    loadCounties,
    clipToCounty,
    clearClip,
    fetchTop5States
  };
})();
