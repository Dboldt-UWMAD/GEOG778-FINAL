/**
 * Application Bootstrap & Map Orchestrator
 * Connects ArcGIS MapView, Layer Services, Filter Services, Widgets, and UI Controller.
 */

(function () {
  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/MapImageLayer",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/geometry/Polygon",
    "esri/widgets/Legend",
    "esri/widgets/Home",
    "esri/widgets/ScaleBar",
    "esri/widgets/Search",
    "esri/widgets/Fullscreen",
    "esri/core/reactiveUtils"
  ], function (
    Map,
    MapView,
    FeatureLayer,
    MapImageLayer,
    GraphicsLayer,
    Graphic,
    Polygon,
    Legend,
    Home,
    ScaleBar,
    Search,
    Fullscreen,
    reactiveUtils
  ) {
    const config = window.AppConfig;
    const layerService = window.LayerService;
    const filterService = window.FilterService;
    const uiController = window.UIController;

    // 1. Initialize GIS Layers
    const { parcelLayer, muniLayer, countyLayer, orderedLayers } = layerService.initLayers(
      FeatureLayer,
      MapImageLayer,
      config
    );

    // 2. Instantiate Map & MapView
    const map = new Map({
      basemap: config.map.defaultBasemap,
      layers: orderedLayers
    });

    // Initialize Graphic Highlight Layer for Spatial Clipping
    filterService.init(GraphicsLayer, map);

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: config.map.initialCenter,
      zoom: config.map.initialZoom,
      constraints: {
        minZoom: config.map.minZoom,
        maxZoom: config.map.maxZoom
      },
      ui: {
        components: ["attribution"]
      }
    });

    // 3. Mount Native Widgets
    const homeWidget = new Home({ view: view });
    const searchWidget = new Search({ view: view });
    const fullscreenWidget = new Fullscreen({ view: view });
    const scaleBar = new ScaleBar({ view: view, unit: "dual" });

    view.ui.add(homeWidget, "top-right");
    view.ui.add(fullscreenWidget, "top-right");
    view.ui.add(searchWidget, "top-right");
    view.ui.add(scaleBar, "bottom-right");

    // 4. Initialize Legend within the floating panel container
    new Legend({
      view: view,
      container: "legendDiv",
      layerInfos: [
        { layer: parcelLayer, title: "Parcels (Mailing State)" },
        { layer: muniLayer, title: "WI DNR Municipalities" },
        { layer: countyLayer, title: "County Boundaries" }
      ]
    });

    // 5. Connect UI Controller & Event Handlers
    uiController.init({
      onLayerToggle(key, visible) {
        layerService.setVisibility(key, visible);
        uiController.updateStatusBadge(layerService.getActiveCount());
      },
      onLayerOpacity(key, opacity) {
        layerService.setOpacity(key, opacity);
      },
      onZoomExtent() {
        layerService.zoomToParcelExtent(view);
      },
      onBasemapChange(basemapKey) {
        map.basemap = basemapKey;
      },
      async onCountySelected(countyName) {
        try {
          await filterService.clipToCounty(countyName, view, parcelLayer, Graphic, Polygon);
        } catch (err) {
          console.error("County clipping error:", err);
        }
      },
      async onMuniSelected(muniId) {
        try {
          await filterService.clipToMunicipality(muniId, view, parcelLayer, Graphic, Polygon);
        } catch (err) {
          console.error("Municipality clipping error:", err);
        }
      },
      onResetClip() {
        filterService.clearClip(parcelLayer, view);
      }
    });

    // 6. Asynchronously populate County and Municipality Selectors
    filterService.loadCounties().then((counties) => {
      uiController.populateCountySelect(counties);
    }).catch((err) => console.warn("Failed to load county list:", err));

    filterService.loadMunicipalities().then((munis) => {
      uiController.populateMuniSelect(munis);
    }).catch((err) => console.warn("Failed to load municipalities list:", err));

    // 7. Handle Popup Action: "Filter parcels to this County"
    reactiveUtils.on(
      () => view.popup,
      "trigger-action",
      async (event) => {
        if (event.action.id === "filter-to-county") {
          const selectedFeature = view.popup.selectedFeature;
          const countyName = selectedFeature?.attributes?.name;
          if (countyName && filterService.ALLOWED_COUNTIES.includes(countyName)) {
            uiController.setCountySelection(countyName);
            await filterService.clipToCounty(countyName, view, parcelLayer, Graphic, Polygon);
          }
        }
      }
    );

    // 8. Connect Async Data Loading Feedback
    view.whenLayerView(parcelLayer).then((layerView) => {
      uiController.bindLoadingIndicator(layerView);
    });
  });
})();
