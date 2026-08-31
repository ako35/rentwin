import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const EMPTY_FORM = { name: "", code: "" };

const AdminLocationsPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const data = await services.branch.getBranches();
      setBranches(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreate();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({ name: branch.name, code: branch.code });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await services.branch.updateBranch(editingId, form);
        utils.functions.swalToast(t("locations.toasts.updateSuccess"), "success");
      } else {
        await services.branch.addBranch(form);
        utils.functions.swalToast(t("locations.toasts.createSuccess"), "success");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        editingId ? t("locations.toasts.updateError") : t("locations.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (branch) => {
    utils.functions
      .swalQuestion(t("locations.toasts.deleteConfirmTitle"), t("locations.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.branch.deleteBranch(branch.id);
          utils.functions.swalToast(t("locations.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("locations.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-locations-page">
      <div className="admin-locations-page__toolbar">
        <h2>{t("locations.pageTitle")}</h2>
        <Button onClick={openCreate}>{t("locations.addBranch")}</Button>
      </div>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("locations.table.name")}</th>
              <th>{t("locations.table.code")}</th>
              <th>{t("locations.table.vehicleCount")}</th>
              <th>{t("locations.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center">{t("locations.noBranches")}</td>
              </tr>
            )}
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td>{branch.name}</td>
                <td>{branch.code}</td>
                <td>{branch.vehicleCount}</td>
                <td className="admin-locations-page__actions">
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(branch)} title={t("locations.edit")}>
                    <BsPencil />
                  </Button>
                  {!branch.builtIn && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(branch)} title={t("locations.delete")}>
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
          <Modal.Title>{editingId ? t("locations.editBranch") : t("locations.addBranch")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("locations.nameLabel")}</Form.Label>
            <Form.Control
              value={form.name}
              placeholder={t("locations.namePlaceholder")}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("locations.codeLabel")}</Form.Label>
            <Form.Control
              value={form.code}
              placeholder={t("locations.codePlaceholder")}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => setShowModal(false)}>{t("locations.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>{t("locations.save")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminLocationsPage;
