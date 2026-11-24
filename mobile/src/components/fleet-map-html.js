// The map page shown inside the Filo Haritası WebView. Leaflet 1.9.4 and
// OpenStreetMap tiles (no API key), the same stack as the web admin map. The
// Leaflet files are pinned with Subresource Integrity, so a changed file on
// the CDN is refused instead of run.
//
// React Native drives it with injectJavaScript:
//   window.rwUpdate({ vehicles: [{ id, lat, lng, color, label }], me, selectedId, refit })
//   window.rwFocus(lat, lng)
// and it reports back with postMessage: { type: "ready" | "select" | "error" }.
// No coordinates leave the phone: the page only draws what it is given.

export const OFFICE = { lat: 38.7928859, lng: 26.9683881 };

export const FLEET_MAP_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>
  html, body, #map { height: 100%; margin: 0; background: #eef1ee; }
  .rw-m { position: relative; }
  .rw-dot { position: absolute; left: 0; top: 0; width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(15,23,42,.45); box-sizing: border-box; }
  .rw-sel .rw-dot { width: 22px; height: 22px; left: -3px; top: -3px; border-width: 3px; }
  .rw-lbl { position: absolute; left: 20px; top: -2px; padding: 1px 6px; border-radius: 6px;
    background: rgba(255,255,255,.94); color: #17231f; font: 700 11px -apple-system, Roboto, sans-serif;
    white-space: nowrap; box-shadow: 0 1px 3px rgba(15,23,42,.25); }
  .rw-sel .rw-lbl { background: #17231f; color: #fff; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function () {
  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  if (!window.L) { post({ type: "error", code: "LEAFLET" }); return; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  var map = L.map("map", { zoomControl: true }).setView([${OFFICE.lat}, ${OFFICE.lng}], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  var cars = L.layerGroup().addTo(map);
  var meLayer = L.layerGroup().addTo(map);
  var fitted = false;

  function icon(v, selected) {
    return L.divIcon({
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: '<div class="rw-m' + (selected ? " rw-sel" : "") + '"><span class="rw-dot" style="background:' +
        esc(v.color) + '"></span><span class="rw-lbl">' + esc(v.label) + "</span></div>"
    });
  }

  window.rwUpdate = function (data) {
    cars.clearLayers();
    var pts = [];
    (data.vehicles || []).forEach(function (v) {
      L.marker([v.lat, v.lng], { icon: icon(v, v.id === data.selectedId), zIndexOffset: v.id === data.selectedId ? 1000 : 0 })
        .on("click", function () { post({ type: "select", id: v.id }); })
        .addTo(cars);
      pts.push([v.lat, v.lng]);
    });
    meLayer.clearLayers();
    if (data.me) {
      L.circleMarker([data.me.lat, data.me.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .addTo(meLayer);
      pts.push([data.me.lat, data.me.lng]);
    }
    if ((!fitted || data.refit) && pts.length) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
      fitted = true;
    }
  };

  window.rwFocus = function (lat, lng) {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  };

  post({ type: "ready" });
})();
</script>
</body>
</html>`;
