import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";

// "Poliçeden Doldur": admin picks a photo/PDF of a trafik sigortası or kasko
// poliçesi, Claude reads it server-side and we hand {type, company, policyNo,
// startDate, endDate, premium} back up so the caller can prefill the
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
      const fields = await services.vehicle.extractInsurance(prepared);
      if (!hasExtractedFields(fields)) {
        utils.functions.swalToast(tr("notDetected"), "error");
        return;
      }
      onExtracted(fields, prepared);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      const key =
        code === "AI_QUOTA"
          ? "quota"
          : status === 502 || status === 503
            ? "busy"
            : status === 413
              ? "tooLarge"
              : "error";
      utils.functions.swalToast(tr(key), "error");
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
        {tr("button")}
      </Button>
    </Form.Group>
  );
};

export default InsuranceScan;
