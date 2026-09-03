import { Button, Form, Spinner, Table } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import Loading from "../../common/loading/loading";

// Two-pane records view (Sigorta / Kasko): side-by-side group lists on the left,
// an inline add/edit form on the right, with per-group totals.
const RecordsTwoPaneView = ({
  config, t, i18n, rows, loading, formik, editing, saving,
  fieldLabel, formatCell, buildItems, setEditing, toFormValues,
  handleDelete,
}) => {
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
};

export default RecordsTwoPaneView;
