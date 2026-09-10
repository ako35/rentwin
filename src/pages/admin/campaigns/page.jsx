import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import { BsMegaphone, BsPencil, BsTrash, BsUpload } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;
const imageUrl = (id) => `${API_URL}/files/display/${id}`;

const EMPTY = {
  title: "",
  description: "",
  ctaLabel: "",
  ctaUrl: "",
  startsAt: "",
  endsAt: "",
  active: true,
  sortOrder: 0,
};

const trDate = (value) => (value ? new Date(value).toLocaleDateString("tr-TR") : "");

const AdminCampaignsPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(EMPTY);
  const [imageId, setImageId] = useState(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const loadData = async () => {
    try {
      setCampaigns(await services.campaign.getCampaignsAdmin());
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (campaign) => {
    setEditing(campaign || {});
    setForm(
      campaign
        ? {
            title: campaign.title || "",
            description: campaign.description || "",
            ctaLabel: campaign.ctaLabel || "",
            ctaUrl: campaign.ctaUrl || "",
            startsAt: campaign.startsAt ? utils.functions.getDate(campaign.startsAt) : "",
            endsAt: campaign.endsAt ? utils.functions.getDate(campaign.endsAt) : "",
            active: campaign.active ?? true,
            sortOrder: campaign.sortOrder ?? 0,
          }
        : EMPTY
    );
    setImageId(campaign?.imageId || null);
    setPreview(campaign?.imageId ? imageUrl(campaign.imageId) : "");
    setFile(null);
  };

  const closeModal = () => {
    setEditing(null);
    setFile(null);
    setPreview("");
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    setFile(picked);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(picked);
  };

  const removeImage = () => {
    setFile(null);
    setImageId(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      let nextImageId = imageId;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const uploaded = await services.campaign.uploadCampaignImage(fd);
        nextImageId = uploaded.imageId;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        imageId: nextImageId,
        ctaLabel: form.ctaLabel.trim() || null,
        ctaUrl: form.ctaUrl.trim() || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (editing?.id) {
        await services.campaign.updateCampaign(editing.id, payload);
        utils.functions.swalToast(t("campaignsPage.toasts.updateSuccess"), "success");
      } else {
        await services.campaign.addCampaign(payload);
        utils.functions.swalToast(t("campaignsPage.toasts.createSuccess"), "success");
      }
      closeModal();
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        t(editing?.id ? "campaignsPage.toasts.updateError" : "campaignsPage.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (campaign) => {
    utils.functions
      .swalQuestion(
        t("campaignsPage.toasts.deleteConfirmTitle"),
        t("campaignsPage.toasts.deleteConfirmText"),
        { danger: true }
      )
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.campaign.deleteCampaign(campaign.id);
          utils.functions.swalToast(t("campaignsPage.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("campaignsPage.toasts.deleteError"), "error");
        }
      });
  };

  const dateRange = (campaign) => {
    if (campaign.startsAt && campaign.endsAt) return `${trDate(campaign.startsAt)} – ${trDate(campaign.endsAt)}`;
    if (campaign.endsAt) return `… – ${trDate(campaign.endsAt)}`;
    if (campaign.startsAt) return `${trDate(campaign.startsAt)} – …`;
    return "—";
  };

  return (
    <div className="admin-campaigns-page">
      <div className="admin-campaigns-page__toolbar">
        <h2>{t("campaignsPage.pageTitle")}</h2>
        <Button onClick={() => openModal(null)}>{t("campaignsPage.add")}</Button>
      </div>
      <p className="admin-campaigns-page__hint">{t("campaignsPage.hint")}</p>

      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive className="admin-campaigns-page__table">
          <thead>
            <tr>
              <th>{t("campaignsPage.table.image")}</th>
              <th>{t("campaignsPage.table.title")}</th>
              <th>{t("campaignsPage.table.status")}</th>
              <th>{t("campaignsPage.table.dates")}</th>
              <th>{t("campaignsPage.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">{t("campaignsPage.empty")}</td>
              </tr>
            )}
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>
                  <span className="admin-campaigns-page__thumb">
                    {campaign.imageId ? (
                      <img src={imageUrl(campaign.imageId)} alt={campaign.title} loading="lazy" />
                    ) : (
                      <BsMegaphone />
                    )}
                  </span>
                </td>
                <td>{campaign.title}</td>
                <td>
                  <Badge bg={campaign.active ? "success" : "secondary"}>
                    {campaign.active ? t("campaignsPage.active") : t("campaignsPage.inactive")}
                  </Badge>
                </td>
                <td>{dateRange(campaign)}</td>
                <td className="admin-campaigns-page__actions">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => openModal(campaign)}
                    title={t("campaignsPage.edit")}
                  >
                    <BsPencil />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(campaign)}
                    title={t("campaignsPage.delete")}
                  >
                    <BsTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={editing !== null} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editing?.id ? t("campaignsPage.editTitle") : t("campaignsPage.addTitle")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="admin-campaigns-page__modal">
          <Form.Group className="mb-3">
            <Form.Label>{t("campaignsPage.titleLabel")}</Form.Label>
            <Form.Control value={form.title} autoFocus onChange={set("title")} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("campaignsPage.descriptionLabel")}</Form.Label>
            <Form.Control as="textarea" rows={4} value={form.description} onChange={set("description")} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("campaignsPage.imageLabel")}</Form.Label>
            <div className="admin-campaigns-page__image">
              {preview ? (
                <img src={preview} alt={form.title} />
              ) : (
                <span className="admin-campaigns-page__image-empty">
                  <BsMegaphone />
                  {t("campaignsPage.imageEmpty")}
                </span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            <div className="admin-campaigns-page__image-actions">
              <Button size="sm" variant="outline-primary" onClick={() => fileRef.current?.click()}>
                <BsUpload /> {t("campaignsPage.imageSelect")}
              </Button>
              {preview && (
                <Button size="sm" variant="outline-danger" onClick={removeImage}>
                  {t("campaignsPage.imageRemove")}
                </Button>
              )}
            </div>
            <Form.Text muted>{t("campaignsPage.imageHint")}</Form.Text>
          </Form.Group>

          <div className="admin-campaigns-page__row">
            <Form.Group className="mb-3">
              <Form.Label>{t("campaignsPage.startsAtLabel")}</Form.Label>
              <Form.Control type="date" value={form.startsAt} onChange={set("startsAt")} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t("campaignsPage.endsAtLabel")}</Form.Label>
              <Form.Control type="date" value={form.endsAt} onChange={set("endsAt")} />
            </Form.Group>
          </div>

          <div className="admin-campaigns-page__row">
            <Form.Group className="mb-3">
              <Form.Label>{t("campaignsPage.ctaLabelLabel")}</Form.Label>
              <Form.Control value={form.ctaLabel} onChange={set("ctaLabel")} placeholder={t("campaignsPage.ctaLabelPlaceholder")} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t("campaignsPage.ctaUrlLabel")}</Form.Label>
              <Form.Control value={form.ctaUrl} onChange={set("ctaUrl")} placeholder="/vehicles" />
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>{t("campaignsPage.sortOrderLabel")}</Form.Label>
            <Form.Control type="number" value={form.sortOrder} onChange={set("sortOrder")} />
            <Form.Text muted>{t("campaignsPage.sortOrderHint")}</Form.Text>
          </Form.Group>

          <Form.Check
            type="switch"
            id="campaign-active"
            label={t("campaignsPage.activeLabel")}
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal} disabled={saving}>
            {t("campaignsPage.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()}>
            {t("campaignsPage.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminCampaignsPage;
