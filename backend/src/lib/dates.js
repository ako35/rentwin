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

module.exports = { parseFrontendDateTime, hoursBetween, round2 };
