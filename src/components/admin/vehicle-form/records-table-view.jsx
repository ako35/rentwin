import { Button, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import CustomForm from "../../common/custom-form/custom-form";
import Loading from "../../common/loading/loading";

// Default records view: a full-width table + an add/edit modal. Used by every
// record type except Sigorta/Kasko (which use the two-pane view).
const RecordsTableView = ({
  config, t, rows, loading, formik, editing, saving, showModal, setShowModal,
  fieldLabel, formatCell, buildItems, openCreate, openEdit, handleDelete,
}) => {
  const gridFields = config.fields.filter((field) => !field.full);
  const fullFields = config.fields.filter((field) => field.full);

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
