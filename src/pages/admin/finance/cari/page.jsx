import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import { formatMoney } from "../../contracts/details/contract-helpers";
import "../style.scss";

const { routes } = constants;

const DEBIT_CATEGORIES = ["TRAFFIC_FINE", "DAMAGE", "FUEL", "MANUAL_DEBIT"];
const CREDIT_CATEGORIES = ["PAYMENT", "REFUND", "DISCOUNT", "MANUAL_CREDIT"];
const PAYMENT_METHODS = ["Cash", "CreditCard", "Transfer", "Other"];
const FILTER_CATEGORIES = ["RENTAL", ...DEBIT_CATEGORIES, ...CREDIT_CATEGORIES];

const today = () => moment().format("YYYY-MM-DD");

const EntryModal = ({ show, mode, entry, onHide, onSaved, userId }) => {
  const { t } = useTranslation("admin");
  const f = (key) => t(`finance.${key}`);
  const isCredit = mode === "credit";
  const categories = isCredit ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setForm(
      entry
        ? {
            date: moment(entry.date).format("YYYY-MM-DD"),
            category: entry.category,
            amount: String(entry.amount ?? ""),
            method: entry.method || "Cash",
            description: entry.description || "",
            invoiceNo: entry.invoiceNo || "",
          }
        : {
            date: today(),
            category: categories[categories.length - 1],
            amount: "",
            method: "Cash",
            description: "",
            invoiceNo: "",
          }
    );
  }, [show, entry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return null;

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }));
  const canSave = Number(form.amount) > 0;

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        userId,
        direction: isCredit ? "CREDIT" : "DEBIT",
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        description: form.description.trim() || undefined,
        method: isCredit ? form.method : undefined,
        invoiceNo: !isCredit ? form.invoiceNo.trim() || undefined : undefined,
      };
      if (entry) await services.ledger.updateLedgerEntry(entry.id, payload);
      else await services.ledger.addLedgerEntry(payload);
      utils.functions.swalToast(f("saved"), "success");
      onSaved();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || f("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isCredit ? f("collectTitle") : f("chargeTitle")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="finance-modal">
        <Form.Group className="mb-2">
          <Form.Label>{f("fields.date")}</Form.Label>
          <Form.Control type="date" value={form.date} onChange={set("date")} />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{f("fields.category")}</Form.Label>
          <Form.Select value={form.category} onChange={set("category")}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t(`finance.categories.${c}`)}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>{f("fields.amount")}</Form.Label>
          <Form.Control type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} autoFocus />
        </Form.Group>
        {isCredit && (
          <Form.Group className="mb-2">
            <Form.Label>{f("fields.method")}</Form.Label>
            <Form.Select value={form.method} onChange={set("method")}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`finance.methods.${m}`)}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
        {!isCredit && (
          <Form.Group className="mb-2">
            <Form.Label>{f("fields.invoiceNo")}</Form.Label>
            <Form.Control value={form.invoiceNo} onChange={set("invoiceNo")} />
          </Form.Group>
        )}
        <Form.Group>
          <Form.Label>{f("fields.description")}</Form.Label>
          <Form.Control as="textarea" rows={2} value={form.description} onChange={set("description")} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          {f("cancel")}
        </Button>
        <Button onClick={submit} disabled={!canSave || saving}>
          {saving && <Spinner animation="border" size="sm" />} {f("save")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const AdminCariLedgerPage = () => {
  const { userId } = useParams();
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");
  const f = (key) => t(`finance.${key}`);
  const money = (v) => formatMoney(v, i18n.language);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: "", to: "", category: "" });
  const [modal, setModal] = useState({ show: false, mode: "credit", entry: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await services.ledger.getUserLedger(userId, filters));
    } catch (error) {
      console.log(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setModal((m) => ({ ...m, show: false }));
    load();
  };

  const removeEntry = (entry) => {
    utils.functions.swalQuestion(f("deleteConfirmTitle"), f("deleteConfirmText"), { danger: true }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await services.ledger.deleteLedgerEntry(entry.id);
        utils.functions.swalToast(f("deleted"), "success");
        load();
      } catch (error) {
        utils.functions.swalToast(error?.response?.data?.message || f("saveError"), "error");
      }
    });
  };

  const balanceClass = useMemo(() => {
    if (!data) return "";
    return data.balance < 0 ? "is-negative" : "is-positive";
  }, [data]);

  if (loading && !data) return <Loading height={400} />;
  if (!data) return <div className="finance-page">{f("loadError")}</div>;

  return (
    <div className="finance-page">
      <div className="finance-page__head">
        <div>
          <Link to={routes.adminFinance} className="finance-page__back">
            &larr; {f("backToList")}
          </Link>
          <h2>
            {data.user.name}
            {data.user.customerCode && <span className="finance-page__code">{data.user.customerCode}</span>}
          </h2>
        </div>
        <span className={`finance-page__balance ${balanceClass}`}>
          {f("currentBalance")}: {money(data.balance)} TL
        </span>
      </div>

      <div className="finance-page__actions">
        <Button onClick={() => setModal({ show: true, mode: "credit", entry: null })}>{f("collectAction")}</Button>
        <Button variant="outline-primary" onClick={() => setModal({ show: true, mode: "debit", entry: null })}>
          {f("chargeAction")}
        </Button>
        <span className="finance-page__actions-spacer" />
        <Link to={`${routes.adminFinance}/cari/${userId}/ekstre`} target="_blank" className="btn btn-outline-secondary">
          {f("printStatement")}
        </Link>
      </div>

      <div className="finance-page__filters">
        <label>
          {f("filters.from")}
          <Form.Control size="sm" type="date" value={filters.from} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))} />
        </label>
        <label>
          {f("filters.to")}
          <Form.Control size="sm" type="date" value={filters.to} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))} />
        </label>
        <label>
          {f("filters.category")}
          <Form.Select size="sm" value={filters.category} onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value }))}>
            <option value="">{f("filters.allCategories")}</option>
            {FILTER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`finance.categories.${c}`)}
              </option>
            ))}
          </Form.Select>
        </label>
        {(filters.from || filters.to || filters.category) && (
          <Button size="sm" variant="link" onClick={() => setFilters({ from: "", to: "", category: "" })}>
            {f("filters.clear")}
          </Button>
        )}
      </div>

      <div className="finance-page__panel">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>{f("table.date")}</th>
              <th>{f("table.doc")}</th>
              <th>{f("table.description")}</th>
              <th className="text-end">{f("table.debit")}</th>
              <th className="text-end">{f("table.credit")}</th>
              <th className="text-end">{f("table.balance")}</th>
              <th className="ledger-table__act" />
            </tr>
          </thead>
          <tbody>
            {(filters.from || filters.to || filters.category) && (
              <tr className="ledger-table__opening">
                <td colSpan={5}>{f("table.opening")}</td>
                <td className="text-end">{money(data.opening)}</td>
                <td />
              </tr>
            )}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="ledger-table__empty">
                  {f("table.empty")}
                </td>
              </tr>
            )}
            {data.rows.map((r) => {
              const manual = r.source === "MANUAL";
              return (
                <tr key={r.id}>
                  <td>{moment(r.date).format("DD.MM.YYYY")}</td>
                  <td>
                    {r.contractId ? (
                      <Link to={`${routes.adminContracts}/${r.contractId}`} className="ledger-table__doc">
                        {r.contractNo || "—"}
                      </Link>
                    ) : (
                      r.invoiceNo || "—"
                    )}
                  </td>
                  <td>
                    <span className={`ledger-badge ledger-badge--${r.direction === "CREDIT" ? "credit" : "debit"}`}>
                      {t(`finance.categories.${r.category}`)}
                    </span>
                    {r.description && <span className="ledger-table__note"> {r.description}</span>}
                    {r.method && r.direction === "CREDIT" && (
                      <span className="ledger-table__note"> · {t(`finance.methods.${r.method}`)}</span>
                    )}
                  </td>
                  <td className="text-end">{r.direction === "DEBIT" ? money(r.amount) : ""}</td>
                  <td className="text-end">{r.direction === "CREDIT" ? money(r.amount) : ""}</td>
                  <td className="text-end ledger-table__bal">{money(r.balance)}</td>
                  <td className="ledger-table__act">
                    {manual && (
                      <>
                        <button
                          type="button"
                          className="ghost-btn"
                          title={f("edit")}
                          onClick={() => setModal({ show: true, mode: r.direction === "CREDIT" ? "credit" : "debit", entry: r })}
                        >
                          ✎
                        </button>
                        <button type="button" className="ghost-btn ghost-btn--danger" title={f("delete")} onClick={() => removeEntry(r)}>
                          🗑
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{f("table.totals")}</td>
              <td className="text-end">{money(data.debit)}</td>
              <td className="text-end">{money(data.credit)}</td>
              <td className="text-end ledger-table__bal">{money(data.balance)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <EntryModal
        show={modal.show}
        mode={modal.mode}
        entry={modal.entry}
        userId={userId}
        onHide={() => setModal((m) => ({ ...m, show: false }))}
        onSaved={onSaved}
      />
    </div>
  );
};

export default AdminCariLedgerPage;
