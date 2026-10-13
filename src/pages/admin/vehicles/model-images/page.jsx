import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Form, Spinner } from "react-bootstrap";
import { BsCheckLg, BsImage, BsPencil, BsStars, BsTrash, BsUpload, BsXLg } from "react-icons/bs";
import { Loading } from "../../../../components";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import "./style.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;

const groupKey = (row) => `${row.brand} ${row.model}`;
// A slot is either the generic (no-colour) one or one specific colour —
// upload/generate/delete all key off {brand, model, color}.
const slotKey = (row, color) => `${groupKey(row)}::${color || ""}`;

// One image slot — the generic one or a specific colour — shared by both.
const ImageSlot = ({ row, color, vehicleCount, image, compact, busy, c, onUpload, onGenerate, onDelete }) => {
  const inputRef = useRef();
  return (
    <div className={`model-image-slot${compact ? " model-image-slot--compact" : ""}`}>
      <div className="model-image-card__thumb">
        {image ? (
          <img src={`${API_URL}/files/display/${image.id}`} alt={`${row.brand} ${row.model} ${color || ""}`} />
        ) : (
          <div className="model-image-card__placeholder">
            <BsImage />
            <span>{c("noImage")}</span>
          </div>
        )}
        {busy && (
          <div className="model-image-card__busy">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {image?.source === "AI" && (
          <Badge bg="dark" className="model-image-card__tag">AI</Badge>
        )}
      </div>

      <div className="model-image-slot__body">
        <div className="model-image-slot__title">
          <strong>{color || c("generic")}</strong>
          <Badge bg="light" text="dark">{c("vehicleCount", { n: vehicleCount })}</Badge>
        </div>

        <div className="model-image-card__actions">
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            className="d-none"
            ref={inputRef}
            onChange={(e) => {
              onUpload(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
            <BsUpload className="me-1" />
            {c("upload")}
          </Button>
          <Button size="sm" variant="outline-secondary" disabled={busy} onClick={onGenerate}>
            <BsStars className="me-1" />
            {c("generate")}
          </Button>
          {image && (
            <Button size="sm" variant="outline-danger" disabled={busy} onClick={onDelete}>
              <BsTrash />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminVehicleModelImagesPage = () => {
  const { t } = useTranslation("admin");
  const c = (k, o) => t(`vehicles.modelImages.${k}`, o);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [busySlot, setBusySlot] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState({ brand: "", model: "" });
  const [renaming, setRenaming] = useState(false);

  const loadData = async () => {
    try {
      setRows(await services.vehicle.listModelImages());
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (row, color, file) => {
    if (!file) return;
    setBusySlot(slotKey(row, color));
    try {
      await services.vehicle.uploadModelImage({ brand: row.brand, model: row.model, color, file });
      utils.functions.swalToast(c("uploadSuccess"), "success");
      await loadData();
    } catch (error) {
      utils.functions.swalToast(c("error"), "error");
    } finally {
      setBusySlot(null);
    }
  };

  const handleGenerate = async (row, color) => {
    setBusySlot(slotKey(row, color));
    try {
      await services.vehicle.generateModelImage({ brand: row.brand, model: row.model, color });
      utils.functions.swalToast(c("generateSuccess"), "success");
      await loadData();
    } catch (error) {
      const quota = error?.response?.data?.code === "AI_IMAGE_QUOTA";
      utils.functions.swalToast(c(quota ? "quota" : "error"), "error");
    } finally {
      setBusySlot(null);
    }
  };

  const handleDelete = (row, color, image) => {
    const label = color ? `${row.brand} ${row.model} — ${color}` : `${row.brand} ${row.model}`;
    utils.functions
      .swalQuestion(c("removeConfirm", { name: label }), "", { danger: true })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setBusySlot(slotKey(row, color));
        try {
          await services.vehicle.deleteModelImage(image.id);
          utils.functions.swalToast(c("removeSuccess"), "success");
          await loadData();
        } catch (error) {
          utils.functions.swalToast(c("error"), "error");
        } finally {
          setBusySlot(null);
        }
      });
  };

  // Bulk-fix a marka/model typo for a whole group at once — every vehicle in
  // it, plus its own uploaded images, move to the corrected name.
  const startEdit = (row) => {
    setEditingKey(groupKey(row));
    setEditForm({ brand: row.brand, model: row.model });
  };
  const cancelEdit = () => setEditingKey(null);

  const submitEdit = async (row) => {
    const toBrand = editForm.brand.trim();
    const toModel = editForm.model.trim();
    if (!toBrand || !toModel) {
      utils.functions.swalToast(c("renameEmpty"), "error");
      return;
    }
    if (toBrand === row.brand && toModel === row.model) {
      setEditingKey(null);
      return;
    }
    const result = await utils.functions.swalQuestion(
      c("renameConfirmTitle"),
      c("renameConfirmText", { n: row.vehicleCount, from: `${row.brand} ${row.model}`, to: `${toBrand} ${toModel}` })
    );
    if (!result.isConfirmed) return;

    setRenaming(true);
    try {
      await services.vehicle.renameModelGroup({ fromBrand: row.brand, fromModel: row.model, toBrand, toModel });
      utils.functions.swalToast(c("renameSuccess"), "success");
      setEditingKey(null);
      await loadData();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || c("error"), "error");
    } finally {
      setRenaming(false);
    }
  };

  if (loading) return <Loading height={400} />;

  return (
    <div className="model-images-page">
      <header className="model-images-page__head">
        <h2>{c("title")}</h2>
        <p>{c("subtitle")}</p>
      </header>

      {rows.length === 0 ? (
        <p className="model-images-page__empty">{c("emptyFleet")}</p>
      ) : (
        <div className="model-images-page__list">
          {rows.map((row) => (
            <article key={groupKey(row)} className="model-image-card">
              <div className="model-image-card__head">
                {editingKey === groupKey(row) ? (
                  <Form
                    className="model-image-card__rename"
                    onSubmit={(e) => { e.preventDefault(); submitEdit(row); }}
                  >
                    <Form.Control
                      size="sm"
                      autoFocus
                      value={editForm.brand}
                      onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))}
                      placeholder={c("renameBrandPlaceholder")}
                      disabled={renaming}
                    />
                    <Form.Control
                      size="sm"
                      value={editForm.model}
                      onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                      placeholder={c("renameModelPlaceholder")}
                      disabled={renaming}
                    />
                    <Button type="submit" size="sm" variant="outline-primary" disabled={renaming} title={c("renameSave")}>
                      {renaming ? <Spinner animation="border" size="sm" /> : <BsCheckLg />}
                    </Button>
                    <Button
                      type="button" size="sm" variant="outline-secondary" disabled={renaming}
                      onClick={cancelEdit} title={c("renameCancel")}
                    >
                      <BsXLg />
                    </Button>
                  </Form>
                ) : (
                  <div className="model-image-card__title">
                    <strong>{row.brand} {row.model}</strong>
                    <Button
                      type="button" size="sm" variant="link" className="model-image-card__edit-btn"
                      onClick={() => startEdit(row)} title={c("renameEdit")}
                    >
                      <BsPencil />
                    </Button>
                  </div>
                )}
                <Badge bg="light" text="dark">{c("vehicleCount", { n: row.vehicleCount })}</Badge>
              </div>

              <div className="model-image-card__slots">
                <ImageSlot
                  row={row}
                  color=""
                  vehicleCount={row.vehicleCount}
                  image={row.genericImage}
                  busy={busySlot === slotKey(row, "")}
                  c={c}
                  onUpload={(file) => handleUpload(row, "", file)}
                  onGenerate={() => handleGenerate(row, "")}
                  onDelete={() => handleDelete(row, "", row.genericImage)}
                />
                {row.colors.map((cRow) => (
                  <ImageSlot
                    key={cRow.color}
                    row={row}
                    color={cRow.color}
                    vehicleCount={cRow.vehicleCount}
                    image={cRow.image}
                    compact
                    busy={busySlot === slotKey(row, cRow.color)}
                    c={c}
                    onUpload={(file) => handleUpload(row, cRow.color, file)}
                    onGenerate={() => handleGenerate(row, cRow.color)}
                    onDelete={() => handleDelete(row, cRow.color, cRow.image)}
                  />
                ))}
              </div>

              {row.colors.length === 0 && <p className="model-image-card__hint">{c("noColors")}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVehicleModelImagesPage;
