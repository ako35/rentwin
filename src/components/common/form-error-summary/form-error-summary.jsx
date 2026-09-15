// Shows every current validation message from a flat Formik `errors` object as
// a single red line — lets a disabled "Oluştur" button explain itself instead
// of just sitting inert.
const FormErrorSummary = ({ errors, className = "" }) => {
  const messages = [...new Set(Object.values(errors || {}).filter((v) => typeof v === "string" && v))];
  if (!messages.length) return null;

  return <div className={`invalid-feedback d-block mb-0 ${className}`.trim()}>{messages.join(" · ")}</div>;
};

export default FormErrorSummary;
