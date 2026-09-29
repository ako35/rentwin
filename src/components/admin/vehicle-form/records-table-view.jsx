import { Badge, Button, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { BsPaperclip, BsPencil, BsTrash } from "react-icons/bs";
import CustomForm from "../../common/custom-form/custom-form";
import Loading from "../../common/loading/loading";
import InspectionScan from "./inspection-scan";

// config.aiScan -> the scan component it should show above the add-record
// modal's fields (Sigorta/Kasko's own "Poliçeden Doldur" lives in the
// two-pane view instead, since that tab never uses this view).
const AI_SCAN_COMPONENTS = { inspection: InspectionScan };

// Default records view: a full-width table + an add/edit modal. Used by every
// record type except Sigorta/Kasko (which use the two-pane view).
const RecordsTableView = ({
  config, t, rows, loading, formik, editing, saving, showModal, setShowModal,
  fieldLabel, formatCell, buildItems, openCreate, openEdit, handleDelete, onManageDocuments, onScanFile,
}) => {
  const gridFields = config.fields.filter((field) => !field.full);
  const fullFields = config.fields.filter((field) => field.full);
  const ScanComponent = config.aiScan && AI_SCAN_COMPONENTS[config.aiScan];

  // Same reasoning as RecordsTwoPaneView's handleAiExtracted: one setValues
  // call so formik validates the fully-merged result in a single pass — see
  // that file's comment for why several setFieldValue calls in a row would
  // leave stale "required" errors (and a disabled "Kaydet") behind.
  const handleAiExtracted = (fields, file) => {
    const patch = {};
    Object.entries(fields).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      patch[key] = typeof value === "number" ? String(value) : value;
    });
    formik.setValues({ ...formik.values, ...patch });
    if (file) onScanFile(file);
  };

  return (
    <div className="vehicle-records-panel">
      <div className="vehicle-records-panel__head">
        <h3>{t(`vehicles.records.${config.tabKey}.title`)}</h3>
        <Button size="sm" onClick={openCreate}>{t("vehicles.records.add")}</Button>
      </div>

      {loading ? (
        <Loading height={160} />
      ) : (
        <Table hover responsive className="vehicle-records-panel__table">
          <thead>
            <tr>
              {config.columns.map((col) => (
                <th key={col.key}>{fieldLabel(col.key)}</th>
              ))}
              <th className="text-end">{t("vehicles.records.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={config.columns.length + 1} className="text-center text-muted">
                  {t("vehicles.records.empty")}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                {config.columns.map((col) => (
                  <td key={col.key}>{formatCell(col, row[col.key])}</td>
                ))}
                <td className="vehicle-records-panel__actions text-end">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    title={t("vehicles.records.manageDocuments")}
                    onClick={() => onManageDocuments(row)}
                  >
                    <BsPaperclip />
                    {!!row._count?.documents && (
                      <Badge bg="dark" className="ms-1">{row._count.documents}</Badge>
                    )}
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => openEdit(row)}>
                    <BsPencil />
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(row)}>
                    <BsTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} size="lg" onHide={() => setShowModal(false)}>
        <Form noValidate onSubmit={formik.handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editing ? t("vehicles.records.editTitle") : t("vehicles.records.new")}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {ScanComponent && !editing && (
              <div className="vehicle-records-panel__ai-scan">
                <ScanComponent onExtracted={handleAiExtracted} />
                <span className="text-muted">{t(`vehicles.${config.aiScan}Scan.hint`)}</span>
              </div>
            )}
            <Row className="row-cols-1 row-cols-md-2">
              {gridFields.map((field) => (
                <CustomForm
                  key={field.name}
                  formik={formik}
                  asGroup={Col}
                  name={field.name}
                  label={fieldLabel(field.name)}
                  type={field.type || "text"}
                  rows={field.rows}
                  itemsArr={field.options ? buildItems(field) : []}
                />
              ))}
            </Row>
            {fullFields.map((field) => (
              <CustomForm
                key={field.name}
                formik={formik}
                name={field.name}
                label={fieldLabel(field.name)}
                type={field.type || "text"}
                rows={field.rows}
                itemsArr={field.options ? buildItems(field) : []}
              />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setShowModal(false)}>
              {t("vehicles.records.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !formik.isValid}>
              {saving && <Spinner animation="border" size="sm" />} {t("vehicles.records.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default RecordsTableView;
