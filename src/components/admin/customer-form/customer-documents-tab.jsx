import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { BsFileEarmarkText, BsTrash, BsUpload } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";
import Loading from "../../common/loading/loading";
import "./customer-documents-tab.scss";

// Scanned ehliyet/kimlik/pasaport/kaşe/vergi levhası documents — "Belgeden
// Doldur" (see document-scan.jsx) attaches its own file here automatically;
// this tab is also where the admin can add one by hand or remove one.
// Mirrors vehicle-form/vehicle-documents-tab.jsx for the customer side.
const CustomerDocumentsTab = ({ userId }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`users.documentsTab.${key}`, opts);

  const inputRef = useRef();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    try {
      setRows(await services.user.getUserDocuments(userId));
    } catch (error) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await services.user.addUserDocument(userId, { name, file });
      setName("");
      utils.functions.swalToast(c("uploadSuccess"), "success");
      await loadData();
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
          await services.user.deleteUserDocument(document.id);
          utils.functions.swalToast(c("removeSuccess"), "success");
          await loadData();
        } catch (error) {
          utils.functions.swalToast(c("error"), "error");
        } finally {
          setBusyId(null);
        }
      });
  };

  if (loading) return <Loading height={160} />;

  return (
    <div className="customer-documents-tab">
      <div className="customer-documents-tab__upload">
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

      <Table hover responsive className="customer-documents-tab__table">
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
    </div>
  );
};

export default CustomerDocumentsTab;
