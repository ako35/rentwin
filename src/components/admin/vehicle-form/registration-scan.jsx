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

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const fields = await services.vehicle.extractRegistration(file);
      onExtracted(fields);
      utils.functions.swalToast(t("vehicles.registrationScan.success"), "success");
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.data?.message || t("vehicles.registrationScan.error"),
        "error"
      );
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
