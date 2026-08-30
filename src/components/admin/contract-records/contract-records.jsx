import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./contract-records.scss";

/**
 * Inline list + add/edit form for a reservation sub-resource (drivers, payments).
 *
 * @param resource  "drivers" | "payments"
 * @param columns   [{ key, label, kind }]  kind: "text" | "date" | "money"
 * @param fields    [{ name, label, type }] type: "text" | "date" | "number" | "select", options
 * @param initial   blank form values
 * @param onChange  called after any mutation (parent can refresh totals)
 * @param labels    { add, save, cancel, edit, delete, empty }
 */
const ContractRecords = ({ reservationId, resource, columns, fields, initial, onChange, labels }) => {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(initial);

  const dateFieldNames = useMemo(
    () => fields.filter((f) => f.type === "date").map((f) => f.name),
    [fields]
  );

  const load = async () => {
    if (!reservationId) return;
    setLoading(true);
    try {
      const data = await services.reservation.getRecords(reservationId, resource);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId, resource]);

  const reset = () => {
    setEditing(null);
    setValues(initial);
  };

  const startEdit = (row) => {
    setEditing(row);
    const next = { ...initial };
    Object.keys(initial).forEach((key) => {
      const raw = row[key];
      if (raw === null || raw === undefined) next[key] = "";
      else if (dateFieldNames.includes(key)) next[key] = utils.functions.getDate(raw);
      else next[key] = raw;
    });
    setValues(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await services.reservation.updateRecord(resource, editing.id, values);
      else await services.reservation.addRecord(reservationId, resource, values);
      reset();
      await load();
      onChange?.();
    } catch {
      utils.functions.swalToast(labels.error, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = (row) => {
    utils.functions.swalQuestion(labels.deleteConfirm, labels.deleteConfirmText).then(async (r) => {
      if (!r.isConfirmed) return;
      try {
        await services.reservation.deleteRecord(resource, row.id);
        await load();
        onChange?.();
      } catch {
        utils.functions.swalToast(labels.error, "error");
      }
    });
  };

  const cell = (col, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (col.format) return col.format(value);
    if (col.kind === "date") return utils.functions.getDate(value);
    if (col.kind === "money")
      return Number(value).toLocaleString(i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    return value;
  };

  return (
    <div className="contract-records">
      <Table hover size="sm" className="mb-2">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th className="text-end">{labels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length + 1} className="text-center">
                <Spinner animation="border" size="sm" />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="text-center text-muted">
                {labels.empty}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={row.id} className={editing?.id === row.id ? "table-active" : ""}>
                {columns.map((col) => (
                  <td key={col.key}>{cell(col, row[col.key])}</td>
                ))}
                <td className="contract-records__actions text-end">
                  <button type="button" onClick={() => startEdit(row)}>
                    {labels.edit}
                  </button>
                  <button type="button" onClick={() => remove(row)}>
                    {labels.delete}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </Table>

      <form className="contract-records__form" onSubmit={submit}>
        <div className="contract-records__fields">
          {fields.map((field) => (
            <Form.Group key={field.name}>
              <Form.Label>{field.label}</Form.Label>
              {field.type === "select" ? (
                <Form.Select
                  value={values[field.name]}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                >
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control
                  type={field.type || "text"}
                  value={values[field.name]}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                />
              )}
            </Form.Group>
          ))}
        </div>
        <div className="contract-records__form-actions">
          {editing && (
            <Button type="button" variant="outline-secondary" size="sm" onClick={reset}>
              {labels.cancel}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" />} {editing ? labels.save : labels.add}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContractRecords;
