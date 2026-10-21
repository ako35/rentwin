// Contract times are naive Turkey wall-clock stored as UTC (the admin panel
// reads them back with getUTC* too), so they must be displayed from the UTC
// fields — converting to the phone's local time would shift them by +3h.

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const pad = (n) => String(n).padStart(2, "0");

const parse = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const wallTime = (iso) => {
  const d = parse(iso);
  return d ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : "—";
};

export const wallDate = (iso) => {
  const d = parse(iso);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` : "—";
};

export const wallDayName = (iso) => {
  const d = parse(iso);
  return d ? DAYS[d.getUTCDay()] : "";
};

// Uploaded-photo timestamps are real instants (server `now()`), unlike
// contract times — those do get the phone's local time.
export const localStamp = (iso) => {
  const d = parse(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
};

export const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const formatKm = (km) => (km == null || km === "" ? "—" : `${groupThousands(km)} km`);

export const fuelLabel = (eighths) => {
  if (eighths == null || eighths === "") return "—";
  if (Number(eighths) === 0) return "Boş";
  if (Number(eighths) === 8) return "Dolu";
  return `${eighths}/8`;
};

// wa.me wants the international number without "+" or leading zeros.
export const whatsappNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
};
