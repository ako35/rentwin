import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const EMPTY = { name: "", unitPrice: "", perDay: true, active: true };

const AdminExtrasPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setExtras(await services.extra.getExtras(true));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (extra) => {
    setEditingId(extra.id);
    setForm({ name: extra.name, unitPrice: extra.unitPrice, perDay: extra.perDay, active: extra.active });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) await services.extra.updateExtra(editingId, form);
      else await services.extra.addExtra(form);
      utils.functions.swalToast(t("extras.toasts.saveSuccess"), "success");
      setShowModal(false);
      loadData();
    } catch (error) {
      utils.functions.swalToast(t("extras.toasts.saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (extra) => {
    utils.functions
      .swalQuestion(t("extras.toasts.deleteConfirm"), t("extras.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.extra.deleteExtra(extra.id);
          utils.functions.swalToast(t("extras.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("extras.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-extras-page">
      <div className="admin-extras-page__toolbar">
        <h2>{t("extras.pageTitle")}</h2>
        <Button onClick={openCreate}>{t("extras.add")}</Button>
      </div>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("extras.name")}</th>
              <th>{t("extras.unitPrice")}</th>
              <th>{t("extras.billing")}</th>
              <th>{t("extras.active")}</th>
              <th>{t("extras.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {extras.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">{t("extras.empty")}</td>
              </tr>
            )}
            {extras.map((extra) => (
              <tr key={extra.id}>
                <td>{extra.name}</td>
                <td>{extra.unitPrice} TL</td>
                <td>{t(extra.perDay ? "extras.perDay" : "extras.perRental")}</td>
                <td>{extra.active ? "✓" : "—"}</td>
                <td className="admin-extras-page__actions">
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(extra)}>
                    <BsPencil />
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(extra)}>
                    <BsTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? t("extras.editTitle") : t("extras.add")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("extras.name")}</Form.Label>
            <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("extras.unitPrice")}</Form.Label>
            <Form.Control
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </Form.Group>
          <Form.Check
            type="checkbox"
            id="extra-perday"
            className="mb-2"
            label={t("extras.perDay")}
            checked={form.perDay}
            onChange={(e) => setForm({ ...form, perDay: e.target.checked })}
          />
          <Form.Check
            type="checkbox"
            id="extra-active"
            label={t("extras.active")}
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>{t("extras.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{t("extras.save")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminExtrasPage;
