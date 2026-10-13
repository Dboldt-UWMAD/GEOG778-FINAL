/**
 * Application Bootstrap & Map Orchestrator
 * Connects ArcGIS MapView, Layer Services, Widgets, and UI Controller.
 */

(function () {
  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/layers/MapImageLayer",
    "esri/widgets/Legend",
    "esri/widgets/Home",
    "esri/widgets/ScaleBar",
    "esri/widgets/Search",
    "esri/widgets/Fullscreen"
  ], function (
    Map,
    MapView,
    FeatureLayer,
    MapImageLayer,
    Legend,
    Home,
    ScaleBar,
    Search,
    Fullscreen
  ) {
    const config = window.AppConfig;
    const layerService = window.LayerService;
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
      }
    });

    // 6. Connect Async Data Loading Feedback
    view.whenLayerView(parcelLayer).then((layerView) => {
      uiController.bindLoadingIndicator(layerView);
    });
  });
})();
