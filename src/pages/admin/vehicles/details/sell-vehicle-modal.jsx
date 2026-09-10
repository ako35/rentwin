import { useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const today = () => new Date().toISOString().slice(0, 10);

// Marks a vehicle sold: capture the sale date (defaults to today) and an
// optional free-text note. The vehicle is then retired from the fleet.
const SellVehicleModal = ({ show, onHide, onConfirm, saving }) => {
  const { t } = useTranslation("admin");
  const [soldAt, setSoldAt] = useState(today());
  const [saleNote, setSaleNote] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onConfirm({ soldAt, saleNote: saleNote.trim() || undefined });
  };

  return (
    <Modal show={show} onHide={saving ? undefined : onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>{t("vehicles.sold.modalTitle")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("vehicles.sold.dateLabel")}</Form.Label>
            <Form.Control
              type="date"
              value={soldAt}
              max={today()}
              onChange={(e) => setSoldAt(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("vehicles.sold.noteLabel")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={saleNote}
              onChange={(e) => setSaleNote(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
            {t("vehicles.cancel")}
          </Button>
          <Button type="submit" variant="danger" disabled={saving || !soldAt}>
            {saving && <Spinner animation="border" size="sm" />} {t("vehicles.sold.confirm")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default SellVehicleModal;
