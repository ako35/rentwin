import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const EMPTY_FORM = { name: "", brand: "", model: "" };

const AdminVehicleClassesPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const data = await services.vehicleClass.getVehicleClasses();
      setClasses(data);
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

  const openEdit = (vehicleClass) => {
    setEditingId(vehicleClass.id);
    setForm({ name: vehicleClass.name, brand: vehicleClass.brand, model: vehicleClass.model });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await services.vehicleClass.updateVehicleClass(editingId, form);
        utils.functions.swalToast(t("vehicleClasses.toasts.updateSuccess"), "success");
      } else {
        await services.vehicleClass.addVehicleClass(form);
        utils.functions.swalToast(t("vehicleClasses.toasts.createSuccess"), "success");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        editingId ? t("vehicleClasses.toasts.updateError") : t("vehicleClasses.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (vehicleClass) => {
    utils.functions
      .swalQuestion(
        t("vehicleClasses.toasts.deleteConfirmTitle"),
        t("vehicleClasses.toasts.deleteConfirmText")
      )
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.vehicleClass.deleteVehicleClass(vehicleClass.id);
          utils.functions.swalToast(t("vehicleClasses.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("vehicleClasses.toasts.deleteError"), "error");
        }
      });
  };

  const canSave = form.name.trim() && form.brand.trim() && form.model.trim();

  return (
    <div className="admin-vehicle-classes-page">
      <div className="admin-vehicle-classes-page__toolbar">
        <h2>{t("vehicleClasses.pageTitle")}</h2>
        <Button onClick={openCreate}>{t("vehicleClasses.addClass")}</Button>
      </div>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("vehicleClasses.table.name")}</th>
              <th>{t("vehicleClasses.table.brand")}</th>
              <th>{t("vehicleClasses.table.model")}</th>
              <th>{t("vehicleClasses.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center">
                  {t("vehicleClasses.noClasses")}
                </td>
              </tr>
            )}
            {classes.map((vehicleClass) => (
              <tr key={vehicleClass.id}>
                <td>{vehicleClass.name}</td>
                <td>{vehicleClass.brand}</td>
                <td>{vehicleClass.model}</td>
                <td className="admin-vehicle-classes-page__actions">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => openEdit(vehicleClass)}
                    title={t("vehicleClasses.edit")}
                  >
                    <BsPencil />
                  </Button>
                  {!vehicleClass.builtIn && (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleDelete(vehicleClass)}
                      title={t("vehicleClasses.delete")}
                    >
                      <BsTrash />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? t("vehicleClasses.editClass") : t("vehicleClasses.addClass")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("vehicleClasses.nameLabel")}</Form.Label>
            <Form.Control
              value={form.name}
              placeholder={t("vehicleClasses.namePlaceholder")}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("vehicleClasses.brandLabel")}</Form.Label>
            <Form.Control
              value={form.brand}
              placeholder={t("vehicleClasses.brandPlaceholder")}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("vehicleClasses.modelLabel")}</Form.Label>
            <Form.Control
              value={form.model}
              placeholder={t("vehicleClasses.modelPlaceholder")}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => setShowModal(false)}>
            {t("vehicleClasses.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {t("vehicleClasses.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminVehicleClassesPage;
