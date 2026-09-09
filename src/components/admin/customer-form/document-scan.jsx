import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";

// "Belgeden Doldur": the admin picks a photo/PDF of a customer document —
// a driving licence / ID for an individual, a company stamp or tax registration
// for a corporate customer — Gemini reads it server-side and the extracted
// fields are handed back up to prefill the form. The admin still reviews before
// saving.
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
      const fields = await services.user.extractCustomerDocument(prepared, kind);
      onExtracted(fields);
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
        {tr(isCorporate ? "buttonCorporate" : "buttonIndividual")}
      </Button>
      <span className="text-muted">{tr(isCorporate ? "hintCorporate" : "hintIndividual")}</span>
    </Form.Group>
  );
};

export default DocumentScan;
