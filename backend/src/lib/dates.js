const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);

const FRONTEND_FORMAT = "MM/DD/YYYY HH:mm:ss";

// Frontend (src/utils/functions/functions.js combineDateAndTime) sends
// dates as "MM/DD/YYYY HH:mm:ss", not ISO. Parse explicitly, never rely
// on new Date(str) which mis-parses this format inconsistently.
const parseFrontendDateTime = (value) => {
  if (!value) return null;

  const strict = dayjs(value, FRONTEND_FORMAT, true);
  if (strict.isValid()) return strict.toDate();

  // Fallback for callers that already send ISO strings (e.g. query params
  // built manually rather than through combineDateAndTime).
  const iso = dayjs(value);
  return iso.isValid() ? iso.toDate() : null;
};

const hoursBetween = (start, end) => (end.getTime() - start.getTime()) / (1000 * 60 * 60);

const round2 = (value) => Math.round(value * 100) / 100;

const WINDOW_DAYS = { today: 1, 3: 3, 7: 7, 15: 15, 30: 30 };

// Resolves a dashboard "window" query param (today/3/7/15/30) into a
// [from, to) date range starting now. "today" means "until the end of the
// current calendar day", the rest mean "the next N days from now".
const resolveWindow = (window) => {
  const days = WINDOW_DAYS[window] || WINDOW_DAYS[7];
  const from = new Date();
  const to = window === "today" ? dayjs().endOf("day").toDate() : dayjs().add(days, "day").toDate();
  return { from, to };
};

module.exports = { parseFrontendDateTime, hoursBetween, round2, resolveWindow };
