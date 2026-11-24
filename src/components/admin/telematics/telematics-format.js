// Shared display helpers for the GPS tracking screens.

export const ACCESS_REASONS = ["LATE_RETURN", "THEFT", "BREACH", "ASSISTANCE", "OTHER"];

// Same palette as the vehicle status pills (vehicle-form.scss).
export const STATUS_COLORS = {
  AVAILABLE: "#1b7a43",
  RENTED: "#c98a1f",
  OUT_OF_SERVICE: "#b93a3a",
  PASSIVE: "#7c3aed",
  SOLD: "#6b7280",
};

export const ROUTE_COLORS = ["#2563eb", "#9333ea", "#ea580c", "#0891b2"];

export const formatDateTime = (value, lang = "tr") =>
  value
    ? new Date(value).toLocaleString(lang, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const formatTime = (value, lang = "tr") =>
  value ? new Date(value).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) : "";

// "az önce" / "5 dk önce" / "3 sa önce" / full date.
export const agoText = (value, t, lang = "tr") => {
  if (!value) return t("telematics.never");
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return t("telematics.ago.now");
  if (minutes < 60) return t("telematics.ago.minutes", { count: minutes });
  if (minutes < 24 * 60) return t("telematics.ago.hours", { count: Math.floor(minutes / 60) });
  return formatDateTime(value, lang);
};

// No signal for this long counts as a connection problem worth flagging.
export const STALE_MINUTES = 60;
export const isStale = (value) => !value || Date.now() - new Date(value).getTime() > STALE_MINUTES * 60000;

export const eventText = (event, t) => {
  const alarm = event.alarm
    ? t(`telematics.alarms.${event.alarm}`, { defaultValue: event.alarm })
    : "";
  return t(`telematics.events.${event.type}`, {
    defaultValue: event.type,
    speed: event.speedKmh ?? "?",
    alarm,
    name: event.geofenceName || "",
  });
};

// <input type="datetime-local"> value for a Date, in the browser's local time.
export const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const traccarErrorKey = (code) =>
  ["TRACCAR_NOT_CONFIGURED", "TRACCAR_UNREACHABLE", "TRACCAR_AUTH", "TRACCAR_ERROR"].includes(code)
    ? `telematics.errors.${code}`
    : "telematics.errors.generic";
