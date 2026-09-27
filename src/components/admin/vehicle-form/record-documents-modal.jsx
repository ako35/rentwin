import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { BsFileEarmarkText, BsTrash, BsUpload } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";
import Loading from "../../common/loading/loading";

// Documents attached to one specific insurance/tax/maintenance/inspection row
// (e.g. the policy scan for that exact Sigorta record) — opened via the
// "Belge Ekle" action next to the row. Distinct from VehicleDocumentsTab,
// which manages the vehicle's general (not record-specific) documents.
const RecordDocumentsModal = ({ show, onHide, resource, record, onChanged }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`vehicles.documentsTab.${key}`, opts);

  const inputRef = useRef();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const recordId = record?.id;

  const loadData = async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      setRows(await services.vehicle.getRecordDocuments(resource, recordId));
    } catch (error) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, recordId]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await services.vehicle.addRecordDocument(resource, recordId, { name, file });
      setName("");
      utils.functions.swalToast(c("uploadSuccess"), "success");
      await loadData();
      onChanged?.();
    } catch (error) {
      utils.functions.swalToast(c("error"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (document) => {
    utils.functions
      .swalQuestion(c("removeConfirm", { name: document.name }), "", { danger: true })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setBusyId(document.id);
        try {
          await services.vehicle.deleteVehicleDocument(document.id);
          utils.functions.swalToast(c("removeSuccess"), "success");
          await loadData();
          onChanged?.();
        } catch (error) {
          utils.functions.swalToast(c("error"), "error");
        } finally {
          setBusyId(null);
        }
      });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t("vehicles.records.documentsModal.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="vehicle-documents-tab__upload">
          <Form.Control
            type="text"
            placeholder={c("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploading}
          />
          <input
            type="file"
            className="d-none"
            ref={inputRef}
            onChange={(e) => {
              handleUpload(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline-primary" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Spinner animation="border" size="sm" /> : <BsUpload className="me-1" />}
            {c("upload")}
          </Button>
        </div>

        {loading ? (
          <Loading height={120} />
        ) : (
          <Table hover responsive className="vehicle-records-panel__table">
            <thead>
              <tr>
                <th>{c("name")}</th>
                <th>{c("uploadedAt")}</th>
                <th className="text-end">{c("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">{c("empty")}</td>
                </tr>
              )}
              {rows.map((document) => (
                <tr key={document.id}>
                  <td>
                    <a href={document.blobUrl} target="_blank" rel="noreferrer">
                      <BsFileEarmarkText className="me-1" />
                      {document.name}
                    </a>
                  </td>
                  <td>{utils.functions.formatDateTime(document.createdAt)}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={busyId === document.id}
                      onClick={() => handleDelete(document)}
                    >
                      {busyId === document.id ? <Spinner animation="border" size="sm" /> : <BsTrash />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={onHide}>
          {t("vehicles.records.cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RecordDocumentsModal;
