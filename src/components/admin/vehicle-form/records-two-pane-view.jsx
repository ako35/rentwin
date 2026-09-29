import { Button, Form, Spinner, Table } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import Loading from "../../common/loading/loading";
import InsuranceScan from "./insurance-scan";
import InspectionScan from "./inspection-scan";

// config.aiScan -> the scan component it should show above the inline form.
const AI_SCAN_COMPONENTS = { insurance: InsuranceScan, inspection: InspectionScan };

// Two-pane records view (Sigorta/Kasko, Muayene/Egzoz, Bakım/Tamir):
// side-by-side group lists on the left, an inline add/edit form on the
// right, with per-group totals.
const RecordsTwoPaneView = ({
  config, t, i18n, rows, loading, formik, editing, saving,
  fieldLabel, formatCell, buildItems, setEditing, toFormValues,
  handleDelete, onManageDocuments, onScanFile,
}) => {
  const groupRows = (type) => rows.filter((row) => row[config.typeField] === type);
  const groupTotal = (type) =>
    groupRows(type).reduce((sum, row) => sum + (Number(row[config.totalField]) || 0), 0);
  const inlineFields = config.fields.filter((field) => field.name !== config.typeField);
  const ScanComponent = config.aiScan && AI_SCAN_COMPONENTS[config.aiScan];

  const startEdit = (row) => {
    setEditing(row);
    onScanFile(null);
    formik.resetForm({ values: toFormValues(row) });
  };
  const cancelEdit = () => {
    setEditing(null);
    onScanFile(null);
    formik.resetForm({ values: config.initialValues });
  };

  // Whichever scan component is active, its extracted field names already
  // match the formik field names 1:1 (see InsuranceScan/InspectionScan) — no
  // allowlist/translation needed, just drop in whatever came back non-empty.
  // A single setValues call (rather than one setFieldValue per field) so
  // formik validates the fully-merged result in one pass — several
  // setFieldValue calls in a row each validate against the pre-loop values,
  // leaving stale "required" errors (and a disabled "Ekle" button) for fields
  // a *later* call in the same batch had already filled. The scanned file
  // itself is handed up too, so the caller can attach it as the record's own
  // document once saved — sparing the operator from uploading it twice.
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
                        <td colSpan={config.listColumns.length + 1} className="text-center text-muted">
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
                          <button type="button" onClick={() => onManageDocuments(row)}>
                            {t("vehicles.records.manageDocuments")}
                            {!!row._count?.documents && ` (${row._count.documents})`}
                          </button>
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
                  <strong>{groupTotal(group.type).toLocaleString(i18n.language)} TL</strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="records-two-pane__form">
        {ScanComponent && !editing && (
          <div className="records-two-pane__ai-scan">
            <ScanComponent onExtracted={handleAiExtracted} />
            <span className="text-muted">{t(`vehicles.${config.aiScan}Scan.hint`)}</span>
          </div>
        )}
        {/* Not a <form>: RecordsTwoPaneView renders inline inside the vehicle
            edit page's own <Form> (unlike RecordsTableView's modal, which
            portals out of it), so a nested <form> here would be invalid HTML —
            Chromium was observed falling back to a native GET submission on
            click (bypassing formik.handleSubmit entirely and losing the
            record). Submit explicitly via the button's onClick + Enter-key
            handling below instead. */}
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
              formik.handleSubmit();
            }
          }}
        >
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
            <Button type="button" onClick={() => formik.handleSubmit()} disabled={saving || !formik.isValid}>
              {saving && <Spinner animation="border" size="sm" />}{" "}
              {editing ? t("vehicles.records.save") : t("vehicles.records.add")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsTwoPaneView;
