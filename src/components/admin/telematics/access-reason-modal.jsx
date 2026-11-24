import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { ACCESS_REASONS } from "./telematics-format";

// KVKK: a rented vehicle's location only opens with a stated reason, and the
// backend logs every such access. `intro` explains what is being opened.
const AccessReasonModal = ({ show, intro, submitLabel, saving, onHide, onConfirm }) => {
  const { t } = useTranslation("admin");
  const r = (key, opts) => t(`telematics.reasonModal.${key}`, opts);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (show) {
      setReason("");
      setNote("");
      setTouched(false);
    }
  }, [show]);

  const noteMissing = reason === "OTHER" && !note.trim();
  const canSubmit = !!reason && !noteMissing && !saving;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (canSubmit) onConfirm({ reason, note: note.trim() });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{r("title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {intro && <p className="tlm-reason__intro">{intro}</p>}
          <Form.Group className="mb-3">
            <Form.Label>{r("reason")}</Form.Label>
            {ACCESS_REASONS.map((key) => (
              <Form.Check
                key={key}
                type="radio"
                id={`tlm-reason-${key}`}
                name="tlm-reason"
                label={r(`reasons.${key}`)}
                checked={reason === key}
                onChange={() => setReason(key)}
              />
            ))}
          </Form.Group>
          <Form.Group>
            <Form.Label>{r("note")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={500}
              value={note}
              placeholder={r("notePlaceholder")}
              isInvalid={touched && noteMissing}
              onChange={(e) => setNote(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{r("noteRequired")}</Form.Control.Feedback>
          </Form.Group>
          <p className="tlm-reason__legal">{r("legal")}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>
            {r("cancel")}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {saving && <Spinner animation="border" size="sm" />} {submitLabel || r("submit")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AccessReasonModal;
