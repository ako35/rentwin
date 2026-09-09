// Drop the fields Gemini read off a customer document into the form. Only
// non-empty values are written, so a partly-read document never blanks a field
// the operator already filled. Phone numbers are normalised to the 10-digit
// form the masked input expects.
const DOC_FIELDS = [
  "firstName",
  "lastName",
  "nationalId",
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
    // city must be set before district so the district dropdown has its options.
    formik.setFieldValue(key, value);
  });
};
