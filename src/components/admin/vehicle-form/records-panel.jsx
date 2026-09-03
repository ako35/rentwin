import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Alert } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { dateFieldNames } from "./record-configs";
import RecordsTableView from "./records-table-view";
import RecordsTwoPaneView from "./records-two-pane-view";

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

  if (!vehicleId) {
    return (
      <Alert variant="secondary" className="mb-0">
        {t("vehicles.records.saveVehicleFirst")}
      </Alert>
    );
  }

  const view = {
    config, t, i18n, rows, loading, formik, editing, saving,
    showModal, setShowModal, setEditing, toFormValues,
    fieldLabel, formatCell, buildItems,
    openCreate, openEdit, handleDelete,
  };

  return config.twoPane ? <RecordsTwoPaneView {...view} /> : <RecordsTableView {...view} />;
};

export default RecordsPanel;
