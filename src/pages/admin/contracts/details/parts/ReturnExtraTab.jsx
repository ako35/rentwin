import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { BsCalculator, BsBoxSeam } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";

// Return-time charge matrix: quick-add chips per category, a km-excess
// calculator, an inline add/edit row and a live "return extras" total. The
// summed lines are cached on Contract.returnExtraAmount by the backend, which
// feeds the grand total — so onChange reloads the contract.
const CATEGORIES = ["HGS_OGS", "KM_EXCESS", "DAMAGE", "ROADSIDE", "CLEANING", "FUEL", "OTHER"];
const QUICK = ["HGS_OGS", "KM_EXCESS", "DAMAGE", "ROADSIDE", "CLEANING"];

const EMPTY = { category: "HGS_OGS", description: "", amount: "", quantity: 1 };

const ReturnExtraTab = ({ isCreate, contractId, pickUpKm, kmLimit, onChange, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.returnCharges.${key}`, opts);
  const rc = (key) => t(`reservations.contract.records.${key}`);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [calc, setCalc] = useState(null); // null = closed; else { returnKm, allowedKm, unitPrice }

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

  const reset = () => {
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
      reset();
      await afterChange();
    } catch {
      utils.functions.swalToast(rc("error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (!saving) persist(form);
  };

  const startEdit = (row) => {
    setEditing(row);
    setForm({
      category: row.category,
      description: row.description || "",
      amount: row.amount ?? "",
      quantity: row.quantity ?? 1,
    });
  };

  const remove = (row) => {
    utils.functions.swalQuestion(rc("deleteConfirm"), rc("deleteConfirmText")).then(async (r) => {
      if (!r.isConfirmed) return;
      try {
        await services.contract.deleteRecord("returnCharges", row.id);
        await afterChange();
      } catch {
        utils.functions.swalToast(rc("error"), "error");
      }
    });
  };

  const openCalc = () =>
    setCalc({ returnKm: "", allowedKm: kmLimit ? String(kmLimit) : "", unitPrice: "" });

  const calcExcessKm =
    calc && Number(calc.returnKm)
      ? Math.max(0, Number(calc.returnKm) - (Number(pickUpKm) || 0) - (Number(calc.allowedKm) || 0))
      : 0;
  const calcAmount = calc ? calcExcessKm * (Number(calc.unitPrice) || 0) : 0;

  const addExcessLine = () =>
    persist({
      category: "KM_EXCESS",
      description: c("kmExcessNote", { km: calcExcessKm, unit: Number(calc.unitPrice) || 0 }),
      amount: calcAmount,
      quantity: 1,
    }).then(() => setCalc(null));

  return (
    <div className="contract-page__rex">
      <div className="contract-page__rex-chips">
        {QUICK.map((cat) => (
          <button
            key={cat}
            type="button"
            className={form.category === cat && !editing ? "is-active" : ""}
            onClick={() => {
              reset();
              if (cat === "KM_EXCESS") openCalc();
              else setForm({ ...EMPTY, category: cat });
            }}
          >
            + {c(`cat.${cat}`)}
          </button>
        ))}
      </div>

      {calc && (
        <div className="contract-page__rex-calc">
          <div className="contract-page__rex-calc-head">
            <BsCalculator /> {c("kmCalcTitle")}
          </div>
          <div className="contract-page__rex-calc-grid">
            <Form.Group>
              <Form.Label>{c("pickUpKm")}</Form.Label>
              <Form.Control value={pickUpKm || "—"} disabled />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("returnKm")}</Form.Label>
              <Form.Control
                type="number"
                value={calc.returnKm}
                onChange={(e) => setCalc({ ...calc, returnKm: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("allowedKm")}</Form.Label>
              <Form.Control
                type="number"
                value={calc.allowedKm}
                onChange={(e) => setCalc({ ...calc, allowedKm: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("unitPrice")}</Form.Label>
              <Form.Control
                type="number"
                value={calc.unitPrice}
                onChange={(e) => setCalc({ ...calc, unitPrice: e.target.value })}
              />
            </Form.Group>
          </div>
          <div className="contract-page__rex-calc-foot">
            <span>
              {c("excessKm")}: <strong>{calcExcessKm} km</strong> · {c("calcAmount")}:{" "}
              <strong>{money(calcAmount)} TL</strong>
            </span>
            <div>
              <Button type="button" variant="outline-secondary" size="sm" onClick={() => setCalc(null)}>
                {rc("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="ms-2"
                disabled={saving || calcExcessKm <= 0 || calcAmount <= 0}
                onClick={addExcessLine}
              >
                {rc("add")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Table hover size="sm" className="mb-2">
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

      <div
        className="contract-records__form"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
            submit(e);
          }
        }}
      >
        <div className="contract-records__fields">
          <Form.Group>
            <Form.Label>{c("category")}</Form.Label>
            <Form.Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {c(`cat.${cat}`)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("description")}</Form.Label>
            <Form.Control
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("amount")}</Form.Label>
            <Form.Control
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("quantity")}</Form.Label>
            <Form.Control
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Form.Group>
        </div>
        <div className="contract-records__form-actions">
          {editing && (
            <Button type="button" variant="outline-secondary" size="sm" onClick={reset}>
              {rc("cancel")}
            </Button>
          )}
          <Button type="button" size="sm" disabled={saving} onClick={submit}>
            {saving && <Spinner animation="border" size="sm" />} {editing ? rc("save") : rc("add")}
          </Button>
        </div>
      </div>

      <div className="contract-page__rex-total">
        <span>{c("total")}</span>
        <strong>{money(total)} TL</strong>
      </div>
    </div>
  );
};

export default ReturnExtraTab;
