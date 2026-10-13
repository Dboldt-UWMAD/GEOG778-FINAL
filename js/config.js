/**
 * Application Configuration & Data Schemas
 * Centralized store for endpoints, initial map views, popup definitions, and symbology.
 */

window.AppConfig = Object.freeze({
  map: {
    initialCenter: [-90.4, 43.1], // Focused on the 5-county region (Grant, Green, Iowa, Lafayette, Richland)
    initialZoom: 9,
    minZoom: 6,
    maxZoom: 20,
    defaultBasemap: "topo-vector"
  },

  services: {
    parcels: {
      url: "https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/Parcel_by_State_Ownership/FeatureServer/4",
      title: "Parcel by State Ownership",
      defaultOpacity: 0.9,
      defaultVisible: true,
      popupTemplate: {
        title: "Parcel {PARCELID}",
        content: [
          {
            type: "fields",
            fieldInfos: [
              { fieldName: "CONAME", label: "County" },
              { fieldName: "OWNERNME1", label: "Owner Name" },
              { fieldName: "SITEADRESS", label: "Site Address" },
              { fieldName: "mailing_state", label: "Owner Mailing State" },
              { fieldName: "PSTLADRESS", label: "Mailing Address" },
              {
                fieldName: "CNTASSDVALUE",
                label: "Total Assessed Value",
                format: { places: 0, digitSeparator: true }
              },
              {
                fieldName: "ESTFMKVALUE",
                label: "Estimated Fair Market Value",
                format: { places: 0, digitSeparator: true }
              },
              {
                fieldName: "GISACRES",
                label: "GIS Acres",
                format: { places: 2, digitSeparator: true }
              },
              { fieldName: "TAXROLLYEAR", label: "Tax Roll Year" },
              { fieldName: "STATEID", label: "State ID" }
            ]
          }
        ]
      }
    },

    municipalities: {
      url: "https://dnrmaps.wi.gov/arcgis/rest/services/DW_Map_Dynamic/EN_Municipality_Boundary_WTM_Ext/MapServer",
      title: "Municipality Boundaries (WI DNR)",
      defaultOpacity: 0.85,
      defaultVisible: true,
      sublayerId: 0,
      popupTemplate: {
        title: "{MCD_NAME}",
        content: [
          {
            type: "fields",
            fieldInfos: [
              { fieldName: "MCD_NAME", label: "Municipality Name" },
              { fieldName: "MCD_TYPE_CODE", label: "Type Code" },
              { fieldName: "MCD_TOTAL_SQMI_AMT", label: "Square Miles", format: { places: 2 } },
              { fieldName: "MCD_FIPS_CODE", label: "FIPS Code" }
            ]
          }
        ]
      }
    },

    counties: {
      url: "https://services7.arcgis.com/Tk0IbKIKhaoYn5sa/arcgis/rest/services/WisconsinCountyBoundary/FeatureServer/0",
      title: "County Boundaries",
      defaultOpacity: 0.7,
      defaultVisible: true,
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: [22, 163, 74, 0.08],
          outline: {
            color: [22, 101, 52, 0.85],
            width: 1.5
          }
        }
      },
      popupTemplate: {
        title: "{name} County",
        content: [
          {
            type: "fields",
            fieldInfos: [
              { fieldName: "name", label: "County Name" },
              { fieldName: "GEOID", label: "GEOID" },
              { fieldName: "lsad_trans", label: "Jurisdiction" },
              { fieldName: "state", label: "State" }
            ]
          }
        ],
        actions: [
          {
            id: "filter-to-county",
            title: "Filter parcels to this County",
            className: "esri-icon-filter"
          }
        ]
      }
    }
  }
});
