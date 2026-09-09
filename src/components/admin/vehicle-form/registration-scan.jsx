import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";

// "Ruhsattan Doldur": admin picks a photo of the registration certificate,
// Gemini reads it server-side and we hand the extracted fields back up so the
// caller can prefill the form — the admin still reviews/corrects before saving.
const RegistrationScan = ({ onExtracted }) => {
  const { t } = useTranslation("admin");
  const inputRef = useRef();
  const [scanning, setScanning] = useState(false);

  const tr = (key) => t(`vehicles.registrationScan.${key}`);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      // Shrink phone photos client-side — a raw 3-8 MB snap trips the serverless
      // request-body limit; ~2000 px stays sharp enough to read a ruhsat.
      const prepared = await utils.functions.downscaleImage(file);
      if (prepared.size > 4 * 1024 * 1024) {
        utils.functions.swalToast(tr("tooLarge"), "error");
        return;
      }
      const fields = await services.vehicle.extractRegistration(prepared);
      onExtracted(fields);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      const status = error?.response?.status;
      const key = status === 502 || status === 503 ? "busy" : status === 413 ? "tooLarge" : "error";
      utils.functions.swalToast(tr(key), "error");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <Form.Group className="vehicle-form__registration-scan">
      <Form.Control
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        ref={inputRef}
        onChange={handleChange}
        id="selectRegistration"
        className="d-none"
        disabled={scanning}
      />
      <Button as={Form.Label} htmlFor="selectRegistration" variant="outline-secondary" size="sm" disabled={scanning}>
        {scanning && <Spinner animation="border" size="sm" className="me-1" />}
        {t("vehicles.registrationScan.button")}
      </Button>
    </Form.Group>
  );
};

export default RegistrationScan;
