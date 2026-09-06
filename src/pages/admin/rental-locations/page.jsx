import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Table } from "react-bootstrap";
import { BsGeoAlt, BsPencil, BsTrash, BsUpload } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;
const imageUrl = (id) => `${API_URL}/files/display/${id}`;

const AdminRentalLocationsPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...loc} = edit
  const [name, setName] = useState("");
  const [imageId, setImageId] = useState(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const loadData = async () => {
    try {
      setLocations(await services.location.getLocations());
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (loc) => {
    setEditing(loc || {});
    setName(loc?.name || "");
    setImageId(loc?.imageId || null);
    setPreview(loc?.imageId ? imageUrl(loc.imageId) : "");
    setFile(null);
  };

  const closeModal = () => {
    setEditing(null);
    setFile(null);
    setPreview("");
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openModal(null);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let nextImageId = imageId;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploaded = await services.location.uploadLocationImage(formData);
        nextImageId = uploaded.imageId;
      }

      if (editing?.id) {
        await services.location.updateLocation(editing.id, { name: name.trim(), imageId: nextImageId });
        utils.functions.swalToast(t("rentalLocations.toasts.updateSuccess"), "success");
      } else {
        await services.location.addLocation({ name: name.trim(), imageId: nextImageId });
        utils.functions.swalToast(t("rentalLocations.toasts.createSuccess"), "success");
      }
      closeModal();
      loadData();
    } catch (error) {
      utils.functions.swalToast(
        t(editing?.id ? "rentalLocations.toasts.updateError" : "rentalLocations.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (location) => {
    utils.functions
      .swalQuestion(t("rentalLocations.toasts.deleteConfirmTitle"), t("rentalLocations.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.location.deleteLocation(location.id);
          utils.functions.swalToast(t("rentalLocations.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("rentalLocations.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-rental-locations-page">
      <div className="admin-rental-locations-page__toolbar">
        <h2>{t("rentalLocations.pageTitle")}</h2>
        <Button onClick={() => openModal(null)}>{t("rentalLocations.add")}</Button>
      </div>
      <p className="admin-rental-locations-page__hint">{t("rentalLocations.hint")}</p>

      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive className="admin-rental-locations-page__table">
          <thead>
            <tr>
              <th>{t("rentalLocations.table.image")}</th>
              <th>{t("rentalLocations.table.name")}</th>
              <th>{t("rentalLocations.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center">{t("rentalLocations.empty")}</td>
              </tr>
            )}
            {locations.map((location) => (
              <tr key={location.id}>
                <td>
                  <span className="admin-rental-locations-page__thumb">
                    {location.imageId ? (
                      <img src={imageUrl(location.imageId)} alt={location.name} loading="lazy" />
                    ) : (
                      <BsGeoAlt />
                    )}
                  </span>
                </td>
                <td>{location.name}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => openModal(location)}
                    title={t("rentalLocations.edit")}
                  >
                    <BsPencil />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(location)}
                    title={t("rentalLocations.delete")}
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
            {editing?.id ? t("rentalLocations.editTitle") : t("rentalLocations.addTitle")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="admin-rental-locations-page__modal">
          <Form.Group className="mb-3">
            <Form.Label>{t("rentalLocations.nameLabel")}</Form.Label>
            <Form.Control
              value={name}
              autoFocus
              placeholder={t("rentalLocations.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>{t("rentalLocations.imageLabel")}</Form.Label>
            <div className="admin-rental-locations-page__image">
              {preview ? (
                <img src={preview} alt={name} />
              ) : (
                <span className="admin-rental-locations-page__image-empty">
                  <BsGeoAlt />
                  {t("rentalLocations.imageEmpty")}
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
            <div className="admin-rental-locations-page__image-actions">
              <Button size="sm" variant="outline-primary" onClick={() => fileRef.current?.click()}>
                <BsUpload /> {t("rentalLocations.imageSelect")}
              </Button>
              {preview && (
                <Button size="sm" variant="outline-danger" onClick={removeImage}>
                  {t("rentalLocations.imageRemove")}
                </Button>
              )}
            </div>
            <Form.Text muted>{t("rentalLocations.imageHint")}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal} disabled={saving}>
            {t("rentalLocations.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {t("rentalLocations.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminRentalLocationsPage;
