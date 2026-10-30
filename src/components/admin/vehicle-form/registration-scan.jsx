import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../utils";
import { getDocumentAiErrorKey } from "../../../utils/document-ai-error";
import { services } from "../../../services";

// "Ruhsattan Doldur": admin picks a photo of the registration certificate,
// Gemini extracts the fields on the server; the admin reviews them before saving.
const hasExtractedFields = (fields) =>
  !!fields &&
  Object.entries(fields).some(
    ([key, value]) => key !== "documentDetected" && value !== null && value !== undefined && value !== ""
  );

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
      const prepared = await utils.functions.downscaleImage(file);
      if (prepared.size > 4 * 1024 * 1024) {
        utils.functions.swalToast(tr("tooLarge"), "error");
        return;
      }
      const fields = await services.documentAi.extractDocument(prepared, "registration");
      if (!fields.documentDetected || !hasExtractedFields(fields)) {
        utils.functions.swalToast(tr("notDetected"), "error");
        return;
      }
      onExtracted(fields);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      console.warn("Gemini registration extraction failed", error?.response?.data?.code || error.message);
      utils.functions.swalToast(t(getDocumentAiErrorKey(error)), "error");
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
        {scanning ? tr("reading") : t("vehicles.registrationScan.button")}
      </Button>
      <span className="text-muted small">{tr("hint")}</span>
    </Form.Group>
  );
};

export default RegistrationScan;
