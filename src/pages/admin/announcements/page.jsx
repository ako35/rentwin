import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const EMPTY_FORM = { title: "", body: "", active: true };

const AdminAnnouncementsPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const data = await services.announcement.getAnnouncements();
      setAnnouncements(data);
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
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (announcement) => {
    setEditingId(announcement.id);
    setForm({ title: announcement.title, body: announcement.body, active: announcement.active });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await services.announcement.updateAnnouncement(editingId, form);
        utils.functions.swalToast(t("announcementsPage.toasts.updateSuccess"), "success");
      } else {
        await services.announcement.addAnnouncement(form);
        utils.functions.swalToast(t("announcementsPage.toasts.createSuccess"), "success");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        editingId ? t("announcementsPage.toasts.updateError") : t("announcementsPage.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (announcement) => {
    utils.functions
      .swalQuestion(t("announcementsPage.toasts.deleteConfirmTitle"), t("announcementsPage.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.announcement.deleteAnnouncement(announcement.id);
          utils.functions.swalToast(t("announcementsPage.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("announcementsPage.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-announcements-page">
      <div className="admin-announcements-page__toolbar">
        <h2>{t("announcementsPage.pageTitle")}</h2>
        <Button onClick={openCreate}>{t("announcementsPage.addAnnouncement")}</Button>
      </div>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("announcementsPage.table.title")}</th>
              <th>{t("announcementsPage.table.status")}</th>
              <th>{t("announcementsPage.table.createdAt")}</th>
              <th>{t("announcementsPage.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center">{t("announcementsPage.noAnnouncements")}</td>
              </tr>
            )}
            {announcements.map((announcement) => (
              <tr key={announcement.id}>
                <td>{announcement.title}</td>
                <td>
                  <Badge bg={announcement.active ? "success" : "secondary"}>
                    {announcement.active ? t("announcementsPage.active") : t("announcementsPage.inactive")}
                  </Badge>
                </td>
                <td>{utils.functions.getDate(announcement.createdAt)}</td>
                <td className="admin-announcements-page__actions">
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(announcement)} title={t("announcementsPage.edit")}>
                    <BsPencil />
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(announcement)} title={t("announcementsPage.delete")}>
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
          <Modal.Title>{editingId ? t("announcementsPage.editAnnouncement") : t("announcementsPage.addAnnouncement")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("announcementsPage.titleLabel")}</Form.Label>
            <Form.Control
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("announcementsPage.bodyLabel")}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </Form.Group>
          <Form.Check
            type="switch"
            id="announcement-active"
            label={t("announcementsPage.activeLabel")}
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => setShowModal(false)}>{t("announcementsPage.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.title || !form.body}>{t("announcementsPage.save")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminAnnouncementsPage;
