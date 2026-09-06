import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal } from "react-bootstrap";
import { BsBuilding, BsCarFront, BsKey, BsPencil, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const EMPTY_FORM = { name: "" };

const AdminBranchesPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [fleet, setFleet] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [data, fleetStats] = await Promise.all([
        services.branch.getBranches(),
        services.vehicle.getFleetStats().catch(() => null),
      ]);
      setBranches(data);
      setFleet(fleetStats);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => [
      { key: "branchCount", icon: <BsBuilding />, value: branches.length },
      {
        key: "vehicleCount",
        icon: <BsCarFront />,
        value: fleet?.total ?? branches.reduce((s, b) => s + (b.vehicleCount || 0), 0),
      },
      { key: "rentedCount", icon: <BsKey />, value: fleet?.rented ?? 0 },
    ],
    [branches, fleet]
  );

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
    setForm({ name: branch.name });
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
      .swalQuestion(t("branches.toasts.deleteConfirmTitle"), t("branches.toasts.deleteConfirmText"), { danger: true })
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
        <>
          <div className="admin-branches-page__stats">
            {stats.map((s) => (
              <div className="stat-card" key={s.key}>
                <span className="stat-card__icon">{s.icon}</span>
                <div>
                  <strong>{s.value}</strong>
                  <span>{t(`branches.stats.${s.key}`)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-branches-page__panel">
            <table className="branch-table">
              <thead>
                <tr>
                  <th>{t("branches.table.code")}</th>
                  <th>{t("branches.table.name")}</th>
                  <th>{t("branches.table.vehicleCount")}</th>
                  <th className="branch-table__actions-col">{t("branches.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 && (
                  <tr>
                    <td colSpan={4} className="branch-table__empty">{t("branches.noBranches")}</td>
                  </tr>
                )}
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>
                      <span className="branch-table__code">{branch.code}</span>
                    </td>
                    <td className="branch-table__name">{branch.name}</td>
                    <td>
                      <span
                        className={`branch-table__count${branch.vehicleCount ? " is-active" : ""}`}
                      >
                        {t("branches.vehicleBadge", { count: branch.vehicleCount || 0 })}
                      </span>
                    </td>
                    <td className="branch-table__actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => openEdit(branch)}
                        title={t("branches.edit")}
                      >
                        <BsPencil />
                      </button>
                      {!branch.builtIn && (
                        <button
                          type="button"
                          className="ghost-btn ghost-btn--danger"
                          onClick={() => handleDelete(branch)}
                          title={t("branches.delete")}
                        >
                          <BsTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? t("branches.editBranch") : t("branches.addBranch")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>{t("branches.nameLabel")}</Form.Label>
            <Form.Control
              value={form.name}
              placeholder={t("branches.namePlaceholder")}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Form.Group>
          {!editingId && <p className="branch-modal__hint">{t("branches.codeAutoHint")}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={() => setShowModal(false)}>{t("branches.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>{t("branches.save")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminBranchesPage;
