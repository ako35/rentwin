// Whitelisted vehicle columns writable from the admin form, plus the coercion
// rules that turn empty-string form values into proper nulls / numbers / dates.
const VEHICLE_FIELDS = [
  "brand",
  "model",
  "licensePlate",
  "transmission",
  "fuelType",
  "outOfService",
  "branchId",
  "nextMaintenanceDate",
  "nextInspectionDate",
  "modelYear",
  "chassisNo",
  "engineNo",
  "currentKm",
  "registrationSerialNo",
  "registrationDate",
  "color",
  "notes",
];

const DATE_FIELDS = ["nextMaintenanceDate", "nextInspectionDate", "registrationDate"];
// Optional numeric columns: an empty-string form value must land as null, not NaN.
const NULLABLE_NUMBER_FIELDS = ["modelYear", "currentKm"];
// Optional string/enum columns: an empty-string form value must land as null.
const NULLABLE_STRING_FIELDS = [
  "chassisNo",
  "engineNo",
  "registrationSerialNo",
  "color",
  "notes",
  "branchId",
];

const pickVehicleFields = (body) =>
  VEHICLE_FIELDS.reduce((data, field) => {
    if (body[field] === undefined) return data;

    const value = body[field];

    if (DATE_FIELDS.includes(field)) {
      data[field] = value ? new Date(value) : null;
    } else if (NULLABLE_NUMBER_FIELDS.includes(field)) {
      data[field] = value === "" || value === null ? null : Number(value);
    } else if (NULLABLE_STRING_FIELDS.includes(field)) {
      data[field] = value === "" ? null : value;
    } else {
      data[field] = value;
    }

    return data;
  }, {});

module.exports = { VEHICLE_FIELDS, DATE_FIELDS, NULLABLE_NUMBER_FIELDS, NULLABLE_STRING_FIELDS, pickVehicleFields };
