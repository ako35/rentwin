import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Spinner } from "react-bootstrap";
import { BsTrash } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";
import "./photos-tab.scss";

// Top tab: read-only gallery of the pickup/return photos the field team shot
// on the mobile app (see mobile/src/app/contract/[id].js and backend's
// contract-photos module) — uploads only ever originate from mobile, this
// view can only look through and delete. Renders only the angles that
// actually exist (the backend doesn't enforce a fixed shot count/set), so a
// pickup shot with only 3 of the usual 6 angles just shows those 3.
const PhotosTab = ({ isCreate, contractId }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.photosTab.${key}`, opts);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setPhotos(await services.contract.getPhotos(contractId));
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCreate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  if (isCreate) return <SaveFirstHint />;

  const remove = (photo) => {
    utils.functions.swalQuestion(c("removeConfirm"), "", { danger: true }).then(async (result) => {
      if (!result.isConfirmed) return;
      setBusyId(photo.id);
      try {
        await services.contract.deletePhoto(photo.id);
        utils.functions.swalToast(c("removeSuccess"), "success");
        setPreview(null);
        await load();
      } catch {
        utils.functions.swalToast(c("error"), "error");
      } finally {
        setBusyId(null);
      }
    });
  };

  const groups = [
    { stage: "PICKUP", title: c("pickup") },
    { stage: "RETURN", title: c("return") },
  ];

  return (
    <div className="contract-page__photos">
      <p className="contract-page__photos-hint">{c("hint")}</p>

      {loading ? (
        <Spinner animation="border" size="sm" />
      ) : (
        groups.map((group) => {
          const rows = photos.filter((p) => p.stage === group.stage);
          return (
            <div className="contract-page__photos-group" key={group.stage}>
              <h4>{group.title}</h4>
              {rows.length === 0 ? (
                <p className="contract-page__photos-empty">{c("empty")}</p>
              ) : (
                <div className="contract-page__photos-grid">
                  {rows.map((photo) => (
                    <button
                      type="button"
                      key={photo.id}
                      className="contract-page__photos-item"
                      onClick={() => setPreview(photo)}
                    >
                      <img src={photo.blobUrl} alt={c(`angles.${photo.angle}`)} />
                      <span>{c(`angles.${photo.angle}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal show={!!preview} onHide={() => setPreview(null)} centered size="lg">
        {preview && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{c(`angles.${preview.angle}`)}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="contract-page__photos-preview">
              <img src={preview.blobUrl} alt={c(`angles.${preview.angle}`)} />
              <p className="contract-page__photos-meta">
                {preview.takenBy
                  ? c("takenBy", { name: `${preview.takenBy.firstName} ${preview.takenBy.lastName}`.trim() })
                  : c("takenByUnknown")}
                {" · "}
                {c("takenAt", { date: moment(preview.createdAt).format("DD.MM.YYYY HH:mm") })}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                className="contract-page__photos-delete"
                disabled={busyId === preview.id}
                onClick={() => remove(preview)}
              >
                {busyId === preview.id ? <Spinner animation="border" size="sm" /> : <BsTrash />} {c("removeConfirm")}
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PhotosTab;
