import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../utils";
import { getDocumentAiErrorKey } from "../../../utils/document-ai-error";
import { services } from "../../../services";

// "Belgeden Doldur": the admin picks a photo/PDF of a customer document —
// a driving licence / ID / passport for an individual (a passport covers a
// foreign customer, who has no T.C. kimlik no), a company stamp or tax
// registration for a corporate customer — Gemini extracts fields on the server
// extracted fields are handed back up to prefill the form. The admin still
// reviews before saving. The scanned file itself is handed back too (2nd arg)
// so the caller can also save it as the customer's own document, without a
// second upload.
// Wrong or unreadable documents are reported as not detected instead of showing
// success without filling any fields.
const hasExtractedFields = (fields) =>
  !!fields &&
  Object.entries(fields).some(
    ([key, value]) => key !== "documentDetected" && value !== null && value !== undefined && value !== ""
  );

const DocumentScan = ({ customerType, onExtracted }) => {
  const { t } = useTranslation("admin");
  const inputRef = useRef();
  const [scanning, setScanning] = useState(false);

  const isCorporate = customerType === "Kurumsal";
  const kind = isCorporate ? "corporate" : "individual";
  const tr = (key) => t(`users.documentScan.${key}`);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const prepared = await utils.functions.downscaleImage(file);
      if (prepared.size > 4 * 1024 * 1024) {
        utils.functions.swalToast(tr("tooLarge"), "error");
        return;
      }
      const fields = await services.documentAi.extractDocument(prepared, kind);
      if (!fields.documentDetected || !hasExtractedFields(fields)) {
        utils.functions.swalToast(tr("notDetected"), "error");
        return;
      }
      onExtracted(fields, prepared);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      console.warn("Gemini customer document extraction failed", error?.response?.data?.code || error.message);
      utils.functions.swalToast(t(getDocumentAiErrorKey(error)), "error");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <Form.Group className="customer-form__doc-scan">
      <Form.Control
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        ref={inputRef}
        onChange={handleChange}
        id={`selectCustomerDoc-${kind}`}
        className="d-none"
        disabled={scanning}
      />
      <Button
        as={Form.Label}
        htmlFor={`selectCustomerDoc-${kind}`}
        variant="outline-secondary"
        size="sm"
        disabled={scanning}
      >
        {scanning && <Spinner animation="border" size="sm" className="me-1" />}
        {scanning ? tr("reading") : tr(isCorporate ? "buttonCorporate" : "buttonIndividual")}
      </Button>
      <span className="text-muted">{tr(isCorporate ? "hintCorporate" : "hintIndividual")}</span>
    </Form.Group>
  );
};

export default DocumentScan;
