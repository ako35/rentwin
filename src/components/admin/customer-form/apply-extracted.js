// Drop the fields Claude read off a customer document into the form. Only
// non-empty values are written, so a partly-read document never blanks a field
// the operator already filled. Phone numbers are normalised to the 10-digit
// form the masked input expects.
const DOC_FIELDS = [
  "firstName",
  "lastName",
  "nationalId",
  "birthDate",
  "companyTitle",
  "taxOffice",
  "address",
  "city",
  "district",
  "phoneNumber",
];

export const applyExtractedCustomerFields = (formik, fields) => {
  DOC_FIELDS.forEach((key) => {
    let value = fields?.[key];
    if (value === undefined || value === null || value === "") return;
    if (key === "phoneNumber") {
      value = String(value).replace(/\D/g, "").replace(/^0/, "").slice(-10);
      if (!value) return;
    }
    // The native <input type="date"> the birth-date field renders as only
    // accepts a strict YYYY-MM-DD value — silently drop anything else rather
    // than feed it a string it can't display.
    if (key === "birthDate" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    // city must be set before district so the district dropdown has its options.
    formik.setFieldValue(key, value);
  });
};
