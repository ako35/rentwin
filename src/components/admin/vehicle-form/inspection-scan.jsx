import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";

// "Belgeden Doldur": same pattern as InsuranceScan (see that file for the full
// rationale) — admin picks a photo/PDF of a TÜVTÜRK araç muayene raporu or an
// egzoz emisyon ölçüm belgesi, Claude reads it server-side and we hand
// {type, date, result, expiryDate, station, cost} back up to prefill the
// Muayene/Egzoz add-record form. The scanned file is handed back too (2nd
// arg) so the caller can attach it as the record's own document on save.
const hasExtractedFields = (fields) =>
  !!fields &&
  Object.entries(fields).some(
    ([key, value]) => key !== "documentDetected" && value !== null && value !== undefined && value !== ""
  );

const InspectionScan = ({ onExtracted }) => {
  const { t } = useTranslation("admin");
  const inputRef = useRef();
  const [scanning, setScanning] = useState(false);

  const tr = (key) => t(`vehicles.inspectionScan.${key}`);

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
      const fields = await services.vehicle.extractInspection(prepared);
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
    <Form.Group className="vehicle-form__inspection-scan">
      <Form.Control
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        ref={inputRef}
        onChange={handleChange}
        id="selectInspectionDocument"
        className="d-none"
        disabled={scanning}
      />
      <Button as={Form.Label} htmlFor="selectInspectionDocument" variant="outline-secondary" size="sm" disabled={scanning}>
        {scanning && <Spinner animation="border" size="sm" className="me-1" />}
        {tr("button")}
      </Button>
    </Form.Group>
  );
};

export default InspectionScan;
