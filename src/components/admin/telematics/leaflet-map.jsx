import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./telematics.scss";

// Thin React wrapper around Leaflet with OpenStreetMap tiles (free, no API
// key; attribution is required by the OSM tile policy).
//
//   markers: [{ id, lat, lng, color, label, title, course, moving }]
//   routes:  [{ id, color, points: [[lat, lng], ...] }]
//   fitKey:  change it to re-fit the view to the current markers/routes
//   focus:   { lat, lng, key } — pans there whenever `key` changes
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
// Rentwin Aliağa office.
const DEFAULT_CENTER = [38.7996, 26.9707];
const DEFAULT_ZOOM = 11;

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const markerIcon = (m) =>
  L.divIcon({
    className: "tlm-marker",
    html:
      `<span class="tlm-marker__dot" style="--tlm-c:${escapeHtml(m.color || "#64748b")}">` +
      (m.moving && Number.isFinite(m.course)
        ? `<span class="tlm-marker__arrow" style="transform:rotate(${Math.round(m.course)}deg)"></span>`
        : "") +
      `</span>` +
      (m.label ? `<span class="tlm-marker__label">${escapeHtml(m.label)}</span>` : ""),
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const LeafletMap = ({ markers = [], routes = [], fitKey, focus, onMarkerClick, height = 480, className = "" }) => {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    const map = L.map(elRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // The map may mount inside a hidden tab or a modal that is still
    // animating; recompute its size whenever the container changes.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();

    for (const r of routes) {
      if (!r.points?.length) continue;
      L.polyline(r.points, { color: r.color || "#2563eb", weight: 4, opacity: 0.85 }).addTo(group);
      L.circleMarker(r.points[0], { radius: 5, color: "#fff", weight: 2, fillColor: "#16a34a", fillOpacity: 1 }).addTo(group);
      L.circleMarker(r.points[r.points.length - 1], { radius: 5, color: "#fff", weight: 2, fillColor: "#dc2626", fillOpacity: 1 }).addTo(group);
    }

    for (const m of markers) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      const marker = L.marker([m.lat, m.lng], { icon: markerIcon(m), title: m.title || m.label || "" });
      marker.on("click", () => clickRef.current?.(m.id));
      marker.addTo(group);
    }
  }, [markers, routes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = [
      ...markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)).map((m) => [m.lat, m.lng]),
      ...routes.flatMap((r) => r.points || []),
    ];
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !Number.isFinite(focus.lat)) return;
    map.setView([focus.lat, focus.lng], Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  return <div ref={elRef} className={`tlm-map ${className}`} style={{ height }} />;
};

export default LeafletMap;
