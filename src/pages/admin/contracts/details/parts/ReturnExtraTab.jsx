import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { BsBoxSeam, BsPlusLg } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";

// Return-time charge list. A single add form — a category dropdown plus an
// amount and an optional note (its placeholder adapts to the picked category) —
// feeds the table below it. The summed lines are cached on
// Contract.returnExtraAmount by the backend and flow straight into the grand
// total, so every change reloads the contract.
const CATEGORIES = [
  "HGS_OGS",
  "KM_EXCESS",
  "ONE_WAY",
  "DAMAGE",
  "ROADSIDE",
  "CLEANING",
  "FUEL",
  "OTHER",
];
const EMPTY = { category: "", description: "", amount: "" };

const ReturnExtraTab = ({ isCreate, contractId, onChange, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.returnCharges.${key}`, opts);
  const rc = (key) => t(`reservations.contract.records.${key}`);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const data = await services.contract.getRecords(contractId, "returnCharges");
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
  }, [contractId]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0) * (Number(r.quantity) || 1), 0),
    [rows]
  );

  if (isCreate) return <SaveFirstHint />;

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const afterChange = async () => {
    await load();
    onChange?.();
  };

  const persist = async (payload) => {
    setSaving(true);
    try {
      if (editing) await services.contract.updateRecord("returnCharges", editing.id, payload);
      else await services.contract.addRecord(contractId, "returnCharges", payload);
      if (editing) closeForm();
      else setForm(EMPTY); // keep the form open for the next line
      await afterChange();
    } catch {
      utils.functions.swalToast(rc("error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    if (saving || !form.category || form.amount === "") return;
    persist({
      category: form.category,
      description: form.description.trim(),
      amount: form.amount,
    });
  };

  const startAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({ category: row.category, description: row.description || "", amount: row.amount ?? "" });
    setOpen(true);
  };

  const remove = (row) => {
    utils.functions
      .swalQuestion(rc("deleteConfirm"), rc("deleteConfirmText"), { danger: true })
      .then(async (r) => {
        if (!r.isConfirmed) return;
        try {
          await services.contract.deleteRecord("returnCharges", row.id);
          if (editing?.id === row.id) closeForm();
          await afterChange();
        } catch {
          utils.functions.swalToast(rc("error"), "error");
        }
      });
  };

  return (
    <div className="contract-page__rex">
      {!open && (
        <button type="button" className="contract-page__rex-add" onClick={startAdd}>
          <BsPlusLg /> {c("addLine")}
        </button>
      )}

      {open && (
        <div
          className="contract-page__rex-card"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
              submit();
            }
          }}
        >
          <div className="contract-page__rex-card-head">
            <span>{editing ? c("editingLine") : c("newLine")}</span>
          </div>

          <div className="contract-page__rex-form">
            <Form.Group className="contract-page__rex-f-cat">
              <Form.Label>{c("category")}</Form.Label>
              <Form.Select
                autoFocus
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">{c("categoryPlaceholder")}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {c(`cat.${cat}`)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="contract-page__rex-f-amount">
              <Form.Label>{c("amount")}</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="contract-page__rex-f-desc">
              <Form.Label>{c("description")}</Form.Label>
              <Form.Control
                value={form.description}
                placeholder={form.category ? c(`hint.${form.category}`) : ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Form.Group>
          </div>

          <div className="contract-page__rex-card-actions">
            <Button type="button" variant="outline-secondary" size="sm" onClick={closeForm}>
              {rc("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !form.category || form.amount === ""}
              onClick={submit}
            >
              {saving && <Spinner animation="border" size="sm" />}{" "}
              {editing ? rc("save") : c("addBtn")}
            </Button>
          </div>
        </div>
      )}

      <Table hover size="sm" className="contract-page__rex-table mb-0">
        <thead>
          <tr>
            <th>{c("category")}</th>
            <th>{c("description")}</th>
            <th className="text-end">{c("lineTotal")}</th>
            <th className="text-end">{rc("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={4} className="text-center">
                <Spinner animation="border" size="sm" />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={4}>
                <div className="contract-records__empty">
                  <BsBoxSeam />
                  <span>{rc("empty")}</span>
                </div>
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={row.id} className={editing?.id === row.id ? "table-active" : ""}>
                <td>
                  <span className={`contract-page__rex-badge cat-${row.category}`}>
                    {c(`cat.${row.category}`)}
                  </span>
                </td>
                <td>
                  {row.description || "—"}
                  {row.quantity > 1 ? ` ×${row.quantity}` : ""}
                </td>
                <td className="text-end">{money((row.amount || 0) * (row.quantity || 1))} TL</td>
                <td className="contract-records__actions text-end">
                  <button type="button" onClick={() => startEdit(row)}>
                    {rc("edit")}
                  </button>
                  <button type="button" onClick={() => remove(row)}>
                    {rc("delete")}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </Table>

      <div className="contract-page__rex-total">
        <div className="contract-page__rex-total-label">
          <span>{c("total")}</span>
          <small>{c("totalHint")}</small>
        </div>
        <strong>{money(total)} TL</strong>
      </div>
    </div>
  );
};

export default ReturnExtraTab;
