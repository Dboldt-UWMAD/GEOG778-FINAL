/**
 * Application Bootstrap & Map Orchestrator
 * Connects ArcGIS MapView, Layer Services, Filter Services, Top 5 Bar Chart, and UI Controller.
 */

(function () {
  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
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

    let activeCounty = "";

    // 1. Initialize GIS Layers (Parcels & Counties)
    const { parcelLayer, countyLayer, orderedLayers } = layerService.initLayers(
      FeatureLayer,
      config
    );

    // 2. Instantiate Map & MapView
    const map = new Map({
      basemap: config.map.defaultBasemap,
      layers: orderedLayers
    });

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
        { layer: countyLayer, title: "County Boundaries" }
      ]
    });

    // Helper: update live bar chart
    async function updateChart(county) {
      try {
        const top5 = await filterService.fetchTop5States(county);
        uiController.renderBarChart(top5, county);
      } catch (err) {
        console.error("Error refreshing top 5 chart:", err);
      }
    }

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
        activeCounty = countyName;
        try {
          await filterService.clipToCounty(countyName, view, parcelLayer, Graphic, Polygon);
        } catch (err) {
          console.error("County filter error:", err);
        }
        await updateChart(activeCounty);
      },
      async onResetClip() {
        activeCounty = "";
        await filterService.clearClip(parcelLayer);
        await updateChart("");
      }
    });

    // 6. Populate County Select dropdown & load initial chart
    const allowedCounties = filterService.loadCounties();
    uiController.populateCountySelect(allowedCounties);
    updateChart("");

    // 7. Handle County Popup Action: "Filter parcels to this County"
    reactiveUtils.on(
      () => view.popup,
      "trigger-action",
      async (event) => {
        if (event.action.id === "filter-to-county") {
          const selectedFeature = view.popup.selectedFeature;
          const countyName = selectedFeature?.attributes?.name;
          if (countyName && filterService.ALLOWED_COUNTIES.includes(countyName)) {
            activeCounty = countyName;
            uiController.setCountySelection(countyName);
            await filterService.clipToCounty(countyName, view, parcelLayer, Graphic, Polygon);
            await updateChart(activeCounty);
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
