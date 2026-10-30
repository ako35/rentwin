import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../utils";
import { getDocumentAiErrorKey } from "../../../utils/document-ai-error";
import { services } from "../../../services";

// "Poliçeden Doldur": admin picks a photo/PDF of a trafik sigortası or kasko
// poliçesi and we hand {type, company, policyNo, startDate, endDate, premium}
// back up so the caller can prefill the
// Sigorta/Kasko add-record form — the admin still reviews/corrects before
// saving. The scanned file itself is handed back too (2nd arg) so the caller
// can also attach it as the record's own document on save, without a second
// upload. Same "nothing extracted" guard as Ruhsattan/Belgeden Doldur: a 200
// with every field null reads as silent failure otherwise.
const hasExtractedFields = (fields) =>
  !!fields &&
  Object.entries(fields).some(
    ([key, value]) => key !== "documentDetected" && value !== null && value !== undefined && value !== ""
  );

const InsuranceScan = ({ onExtracted }) => {
  const { t } = useTranslation("admin");
  const inputRef = useRef();
  const [scanning, setScanning] = useState(false);

  const tr = (key) => t(`vehicles.insuranceScan.${key}`);

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
      const fields = await services.documentAi.extractDocument(prepared, "insurance");
      if (!fields.documentDetected || !hasExtractedFields(fields)) {
        utils.functions.swalToast(tr("notDetected"), "error");
        return;
      }
      onExtracted(fields, prepared);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      console.warn("Gemini insurance extraction failed", error?.response?.data?.code || error.message);
      utils.functions.swalToast(t(getDocumentAiErrorKey(error)), "error");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <Form.Group className="vehicle-form__insurance-scan">
      <Form.Control
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        ref={inputRef}
        onChange={handleChange}
        id="selectInsurancePolicy"
        className="d-none"
        disabled={scanning}
      />
      <Button as={Form.Label} htmlFor="selectInsurancePolicy" variant="outline-secondary" size="sm" disabled={scanning}>
        {scanning && <Spinner animation="border" size="sm" className="me-1" />}
        {scanning ? tr("reading") : tr("button")}
      </Button>
      <span className="text-muted small">{tr("hint")}</span>
    </Form.Group>
  );
};

export default InsuranceScan;
