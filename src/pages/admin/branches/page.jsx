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

const AdminBranchesPage = () => {
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
        utils.functions.swalToast(t("branches.toasts.updateSuccess"), "success");
      } else {
        await services.branch.addBranch(form);
        utils.functions.swalToast(t("branches.toasts.createSuccess"), "success");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        editingId ? t("branches.toasts.updateError") : t("branches.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (branch) => {
    utils.functions
      .swalQuestion(t("branches.toasts.deleteConfirmTitle"), t("branches.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.branch.deleteBranch(branch.id);
          utils.functions.swalToast(t("branches.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("branches.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-branches-page">
      <div className="admin-branches-page__toolbar">
        <h2>{t("branches.pageTitle")}</h2>
        <Button onClick={openCreate}>{t("branches.addBranch")}</Button>
      </div>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("branches.table.name")}</th>
              <th>{t("branches.table.code")}</th>
              <th>{t("branches.table.vehicleCount")}</th>
              <th>{t("branches.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center">{t("branches.noBranches")}</td>
              </tr>
            )}
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td>{branch.name}</td>
                <td>{branch.code}</td>
                <td>{branch.vehicleCount}</td>
                <td className="admin-branches-page__actions">
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(branch)} title={t("branches.edit")}>
                    <BsPencil />
                  </Button>
                  {!branch.builtIn && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(branch)} title={t("branches.delete")}>
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
          <Modal.Title>{editingId ? t("branches.editBranch") : t("branches.addBranch")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("branches.nameLabel")}</Form.Label>
            <Form.Control
              value={form.name}
              placeholder={t("branches.namePlaceholder")}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("branches.codeLabel")}</Form.Label>
            <Form.Control
              value={form.code}
              placeholder={t("branches.codePlaceholder")}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => setShowModal(false)}>{t("branches.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>{t("branches.save")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminBranchesPage;
