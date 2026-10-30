import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../../../utils";
import { getDocumentAiErrorKey } from "../../../../../utils/document-ai-error";
import { services } from "../../../../../services";

// "Faturadan Doldur": Gemini reads the issued invoice and returns {number, issuedAt, periodFrom,
// periodTo, grossAmount, customerTitle, taxNo} to prefill the Fatura form —
// the same file also becomes the invoice's stored PDF once saved (see
// InvoiceTab's onExtracted). Same "nothing extracted" guard as the other
// scan buttons: a 200 with every field null reads as silent failure otherwise.
const hasExtractedFields = (fields) =>
  !!fields &&
  Object.entries(fields).some(
    ([key, value]) => key !== "documentDetected" && value !== null && value !== undefined && value !== ""
  );

const InvoiceScan = ({ onExtracted }) => {
  const { t } = useTranslation("admin");
  const inputRef = useRef();
  const [scanning, setScanning] = useState(false);

  const tr = (key) => t(`reservations.contract.invoice.scan.${key}`);

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
      const fields = await services.documentAi.extractDocument(prepared, "invoice");
      if (!fields.documentDetected || !hasExtractedFields(fields)) {
        utils.functions.swalToast(tr("notDetected"), "error");
        return;
      }
      onExtracted(fields, prepared);
      utils.functions.swalToast(tr("success"), "success");
    } catch (error) {
      console.warn("Gemini invoice extraction failed", error?.response?.data?.code || error.message);
      utils.functions.swalToast(t(getDocumentAiErrorKey(error)), "error");
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  return (
    <Form.Group className="contract-page__inv-scan">
      <Form.Control
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        ref={inputRef}
        onChange={handleChange}
        id="selectInvoiceDoc"
        className="d-none"
        disabled={scanning}
      />
      <Button as={Form.Label} htmlFor="selectInvoiceDoc" variant="outline-secondary" size="sm" disabled={scanning}>
        {scanning && <Spinner animation="border" size="sm" className="me-1" />}
        {scanning ? tr("reading") : tr("button")}
      </Button>
      <span className="text-muted small">{tr("hint")}</span>
    </Form.Group>
  );
};

export default InvoiceScan;
