import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import moment from "moment/moment";
import { BsReceipt } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";
import "./invoice-tab.scss";

// Top tab: the invoices raised against this contract. A contract can carry
// several (partial billing, corrections). Summary + list on top, an
// accordion add/edit form at the bottom. Amounts are entered VAT-inclusive;
// the backend splits net / tax at the contract's fixed rate.
const emptyForm = () => ({
  id: null,
  number: "",
  issuedAt: moment().format("YYYY-MM-DD"),
  grossAmount: "",
  customerTitle: "",
  taxNo: "",
  note: "",
});

const InvoiceTab = ({ isCreate, contractId, invoices, onInvoicesChange, total, vatRate, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const rc = (key) => t(`reservations.contract.records.${key}`);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (isCreate) return <SaveFirstHint />;

  const list = Array.isArray(invoices) ? invoices : [];
  const invoicedTotal = list.reduce((s, inv) => s + (Number(inv.grossAmount) || 0), 0);
  const rate = Number(vatRate) || 20;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const openAdd = () => setForm(emptyForm());
  const openEdit = (inv) =>
    setForm({
      id: inv.id,
      number: inv.number || "",
      issuedAt: moment(inv.issuedAt).format("YYYY-MM-DD"),
      grossAmount: inv.grossAmount != null ? String(inv.grossAmount) : "",
      customerTitle: inv.customerTitle || "",
      taxNo: inv.taxNo || "",
      note: inv.note || "",
    });
  const close = () => setForm(null);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const gross = form.grossAmount !== "" ? Number(form.grossAmount) : undefined;
      if (form.id) {
        await services.contract.updateInvoice(form.id, {
          number: form.number.trim(),
          issuedAt: form.issuedAt,
          grossAmount: gross ?? 0,
          customerTitle: form.customerTitle.trim(),
          taxNo: form.taxNo.trim(),
          note: form.note.trim(),
        });
      } else {
        await services.contract.createInvoice(contractId, {
          number: form.number.trim() || undefined,
          issuedAt: form.issuedAt || undefined,
          grossAmount: gross,
          customerTitle: form.customerTitle.trim() || undefined,
          taxNo: form.taxNo.trim() || undefined,
          note: form.note.trim() || undefined,
        });
      }
      close();
      onInvoicesChange?.();
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
    } catch (err) {
      utils.functions.swalToast(
        err?.response?.data?.code === "INVOICE_NUMBER_TAKEN" ? c("invoice.numberTaken") : rc("error"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (inv) => {
    utils.functions
      .swalQuestion(c("invoice.deleteConfirm"), c("invoice.deleteConfirmText"), { danger: true })
      .then(async (r) => {
        if (!r.isConfirmed) return;
        try {
          await services.contract.deleteInvoice(inv.id);
          if (form?.id === inv.id) close();
          onInvoicesChange?.();
        } catch {
          utils.functions.swalToast(rc("error"), "error");
        }
      });
  };

  const previewGross = form && form.grossAmount !== "" ? Number(form.grossAmount) || 0 : 0;
  const previewNet = previewGross / (1 + rate / 100);

  return (
    <div className="contract-page__inv">
      <div className="contract-page__inv-head">
        <div className="contract-page__inv-sum">
          <span>{c("invoice.invoicedTotal")}</span>
          <strong>{money(invoicedTotal)} TL</strong>
        </div>
        {!form && (
          <Button type="button" size="sm" onClick={openAdd}>
            + {c("invoice.addBtn")}
          </Button>
        )}
      </div>

      <Table hover size="sm" className="contract-page__inv-table mb-0">
        <thead>
          <tr>
            <th>{c("invoice.number")}</th>
            <th>{c("invoice.issuedAt")}</th>
            <th>{c("invoice.customer")}</th>
            <th className="text-end">{c("invoice.gross")}</th>
            <th className="text-end">{rc("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan={5}>
                <div className="contract-records__empty">
                  <BsReceipt />
                  <span>{c("invoice.none")}</span>
                </div>
              </td>
            </tr>
          )}
          {list.map((inv) => (
            <tr key={inv.id} className={form?.id === inv.id ? "table-active" : ""}>
              <td>{inv.number}</td>
              <td>{utils.functions.getDate(inv.issuedAt)}</td>
              <td>{inv.customerTitle || "—"}</td>
              <td className="text-end">{money(inv.grossAmount)} TL</td>
              <td className="contract-records__actions text-end">
                <button type="button" onClick={() => openEdit(inv)}>{rc("edit")}</button>
                <button type="button" onClick={() => remove(inv)}>{rc("delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {form && (
        <div
          className="contract-page__inv-card"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && !saving) {
              e.preventDefault();
              save();
            }
          }}
        >
          <div className="contract-page__inv-card-head">
            {form.id ? c("invoice.editTitle") : c("invoice.newTitle")}
          </div>
          <div className="contract-page__inv-fields">
            <Form.Group>
              <Form.Label>{c("invoice.number")}</Form.Label>
              <Form.Control value={form.number} onChange={set("number")} placeholder={c("invoice.numberAuto")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("invoice.issuedAt")}</Form.Label>
              <Form.Control type="date" value={form.issuedAt} onChange={set("issuedAt")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("invoice.amount")}</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={form.grossAmount}
                onChange={set("grossAmount")}
                placeholder={total ? money(total) : ""}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("invoice.customer")}</Form.Label>
              <Form.Control
                value={form.customerTitle}
                onChange={set("customerTitle")}
                placeholder={c("invoice.customerAuto")}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("invoice.taxNo")}</Form.Label>
              <Form.Control value={form.taxNo} onChange={set("taxNo")} />
            </Form.Group>
            <Form.Group className="contract-page__inv-note">
              <Form.Label>{c("invoice.note")}</Form.Label>
              <Form.Control value={form.note} onChange={set("note")} />
            </Form.Group>
          </div>
          {previewGross > 0 && (
            <div className="contract-page__inv-preview">
              <span>
                {c("invoice.net")}: <strong>{money(previewNet)} TL</strong>
              </span>
              <span>
                {c("invoice.tax")} %{rate}: <strong>{money(previewGross - previewNet)} TL</strong>
              </span>
            </div>
          )}
          <div className="contract-page__inv-actions">
            <Button type="button" variant="outline-secondary" size="sm" onClick={close}>
              {rc("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={save}>
              {saving && <Spinner animation="border" size="sm" />} {form.id ? rc("save") : rc("add")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTab;
