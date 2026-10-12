import { useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const today = () => new Date().toISOString().slice(0, 10);

// Marks a vehicle passive: capture the date (defaults to today) and an
// optional free-text reason. Unlike "Satıldı", this is reversible — the
// vehicle stays owned and editable, just pulled out of active rotation.
const MarkPassiveModal = ({ show, onHide, onConfirm, saving }) => {
  const { t } = useTranslation("admin");
  const [passiveAt, setPassiveAt] = useState(today());
  const [passiveNote, setPassiveNote] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onConfirm({ passiveAt, passiveNote: passiveNote.trim() || undefined });
  };

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>{t("vehicles.passive.modalTitle")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("vehicles.passive.dateLabel")}</Form.Label>
            <Form.Control
              type="date"
              value={passiveAt}
              max={today()}
              onChange={(e) => setPassiveAt(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("vehicles.passive.noteLabel")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={passiveNote}
              onChange={(e) => setPassiveNote(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
            {t("vehicles.cancel")}
          </Button>
          <Button type="submit" variant="warning" disabled={saving || !passiveAt}>
            {saving && <Spinner animation="border" size="sm" />} {t("vehicles.passive.confirm")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MarkPassiveModal;
