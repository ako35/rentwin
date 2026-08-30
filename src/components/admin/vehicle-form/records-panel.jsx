import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Alert, Button, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { BsPencil, BsTrash } from "react-icons/bs";
import CustomForm from "../../common/custom-form/custom-form";
import Loading from "../../common/loading/loading";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { dateFieldNames } from "./record-configs";

const RecordsPanel = ({ vehicleId, config }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fieldLabel = (name) => t(`vehicles.records.${config.tabKey}.fields.${name}`);
  const dateFields = dateFieldNames(config);

  const loadRows = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const data = await services.vehicle.getVehicleRecords(vehicleId, config.resource);
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setRows([]);
      utils.functions.swalToast(t("vehicles.records.toasts.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, config.resource]);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await services.vehicle.updateVehicleRecord(config.resource, editing.id, values);
        utils.functions.swalToast(t("vehicles.records.toasts.updateSuccess"), "success");
      } else {
        await services.vehicle.addVehicleRecord(vehicleId, config.resource, values);
        utils.functions.swalToast(t("vehicles.records.toasts.createSuccess"), "success");
      }
      setShowModal(false);
      setEditing(null);
      formik.resetForm({ values: config.initialValues });
      loadRows();
    } catch (error) {
      utils.functions.swalToast(
        t(editing ? "vehicles.records.toasts.updateError" : "vehicles.records.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const formik = useFormik({
    initialValues: config.initialValues,
    validationSchema: config.schema,
    onSubmit,
  });

  const toFormValues = (row) => {
    const values = { ...config.initialValues };
    Object.keys(config.initialValues).forEach((key) => {
      const raw = row[key];
      if (raw === null || raw === undefined) {
        values[key] = "";
      } else if (dateFields.includes(key)) {
        values[key] = utils.functions.getDate(raw);
      } else {
        values[key] = raw;
      }
    });
    return values;
  };

  const openCreate = () => {
    setEditing(null);
    formik.resetForm({ values: config.initialValues });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    formik.resetForm({ values: toFormValues(row) });
    setShowModal(true);
  };

  const handleDelete = (row) => {
    utils.functions
      .swalQuestion(
        t("vehicles.records.deleteConfirmTitle"),
        t("vehicles.records.deleteConfirmText")
      )
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.vehicle.deleteVehicleRecord(config.resource, row.id);
          utils.functions.swalToast(t("vehicles.records.toasts.deleteSuccess"), "success");
          loadRows();
        } catch (error) {
          utils.functions.swalToast(t("vehicles.records.toasts.deleteError"), "error");
        }
      });
  };

  const formatCell = (col, value) => {
    if (value === null || value === undefined || value === "") return "—";
    switch (col.kind) {
      case "date":
        return utils.functions.getDate(value);
      case "money":
      case "number":
        return Number(value).toLocaleString(i18n.language);
      case "option":
        return tCommon(`options.${col.optionNs}.${value}`);
      default:
        return value;
    }
  };

  const buildItems = (field) =>
    field.options.map((option) => ({
      ...option,
      name: field.optionNs
        ? tCommon(`options.${field.optionNs}.${option.value}`)
        : String(option.name),
    }));

  const gridFields = config.fields.filter((field) => !field.full);
  const fullFields = config.fields.filter((field) => field.full);

  if (!vehicleId) {
    return (
      <Alert variant="secondary" className="mb-0">
        {t("vehicles.records.saveVehicleFirst")}
      </Alert>
    );
  }

  // ---- Two-pane variant (Sigorta / Kasko) ------------------------------------
  if (config.twoPane) {
    const groupRows = (type) => rows.filter((row) => row[config.typeField] === type);
    const groupTotal = (type) =>
      groupRows(type).reduce((sum, row) => sum + (Number(row[config.totalField]) || 0), 0);
    const inlineFields = config.fields.filter((field) => field.name !== config.typeField);

    const startEdit = (row) => {
      setEditing(row);
      formik.resetForm({ values: toFormValues(row) });
    };
    const cancelEdit = () => {
      setEditing(null);
      formik.resetForm({ values: config.initialValues });
    };

    return (
      <div className="records-two-pane">
        <div className="records-two-pane__lists">
          {loading ? (
            <Loading height={160} />
          ) : (
            config.groups.map((group) => {
              const list = groupRows(group.type);
              return (
                <div className="records-two-pane__group" key={group.key}>
                  <h4>{t(`vehicles.records.${config.tabKey}.groups.${group.key}`)}</h4>
                  <Table hover size="sm" className="mb-1">
                    <thead>
                      <tr>
                        {config.listColumns.map((col) => (
                          <th key={col.key}>{fieldLabel(col.key)}</th>
                        ))}
                        <th className="text-end">{t("vehicles.records.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 && (
                        <tr>
                          <td
                            colSpan={config.listColumns.length + 1}
                            className="text-center text-muted"
                          >
                            {t("vehicles.records.empty")}
                          </td>
                        </tr>
                      )}
                      {list.map((row) => (
                        <tr key={row.id} className={editing?.id === row.id ? "table-active" : ""}>
                          {config.listColumns.map((col) => (
                            <td key={col.key}>{formatCell(col, row[col.key])}</td>
                          ))}
                          <td className="records-two-pane__row-actions text-end">
                            <button type="button" onClick={() => startEdit(row)}>
                              {t("vehicles.records.edit")}
                            </button>
                            <button type="button" onClick={() => handleDelete(row)}>
                              {t("vehicles.records.delete")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="records-two-pane__total">
                    {t(`vehicles.records.${config.tabKey}.groups.${group.key}Total`)}:{" "}
                    <strong>
                      {groupTotal(group.type).toLocaleString(i18n.language)} TL
                    </strong>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="records-two-pane__form">
          <Form noValidate onSubmit={formik.handleSubmit}>
            <div className="records-two-pane__type mb-2">
              {config.groups.map((group) => (
                <Form.Check
                  inline
                  type="radio"
                  key={group.type}
                  id={`${config.tabKey}-type-${group.type}`}
                  name={config.typeField}
                  label={t(`vehicles.records.${config.tabKey}.groups.${group.key}`)}
                  checked={formik.values[config.typeField] === group.type}
                  onChange={() => formik.setFieldValue(config.typeField, group.type)}
                />
              ))}
            </div>
            {inlineFields.map((field) => (
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
            <div className="records-two-pane__form-actions">
              {editing && (
                <Button variant="outline-secondary" type="button" onClick={cancelEdit}>
                  {t("vehicles.records.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={saving || !formik.isValid}>
                {saving && <Spinner animation="border" size="sm" />}{" "}
                {editing ? t("vehicles.records.save") : t("vehicles.records.add")}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-records-panel">
      <div className="vehicle-records-panel__head">
        <h3>{t(`vehicles.records.${config.tabKey}.title`)}</h3>
        <Button size="sm" onClick={openCreate}>
          {t("vehicles.records.add")}
        </Button>
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

export default RecordsPanel;
