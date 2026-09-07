import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import RoRow from "./RoRow";
import SaveFirstHint from "./SaveFirstHint";

// Top tab: the contract's invoice. Before one exists the operator enters the
// real number / date / amount from their accounting system (each blank field
// falls back to a default); once created it is shown read-only.
const InvoiceTab = ({ isCreate, contractId, invoice, onInvoiceCreated, total, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const [invoicing, setInvoicing] = useState(false);
  const [form, setForm] = useState({
    number: "",
    issuedAt: moment().format("YYYY-MM-DD"),
    grossAmount: "",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const createInvoice = async () => {
    setInvoicing(true);
    try {
      const created = await services.contract.createInvoice(contractId, {
        number: form.number.trim() || undefined,
        issuedAt: form.issuedAt || undefined,
        grossAmount: form.grossAmount !== "" ? Number(form.grossAmount) : undefined,
      });
      onInvoiceCreated(created);
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
    } catch (err) {
      const code = err?.response?.data?.code;
      utils.functions.swalToast(
        code === "INVOICE_NUMBER_TAKEN"
          ? c("invoice.numberTaken")
          : t("reservations.contract.records.error"),
        "error"
      );
    } finally {
      setInvoicing(false);
    }
  };

  if (isCreate) return <SaveFirstHint />;

  if (!invoice) {
    return (
      // Plain <div>, not <form> — this lives inside the contract's outer <Form>.
      <div
        className="contract-records__form"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && !invoicing) {
            e.preventDefault();
            createInvoice();
          }
        }}
      >
        <p className="text-muted">{c("invoice.none")}</p>
        <div className="contract-records__fields">
          <Form.Group>
            <Form.Label>{c("invoice.number")}</Form.Label>
            <Form.Control
              value={form.number}
              onChange={set("number")}
              placeholder={c("invoice.numberAuto")}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("invoice.issuedAt")}</Form.Label>
            <Form.Control type="date" value={form.issuedAt} onChange={set("issuedAt")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("invoice.amount")}</Form.Label>
            <Form.Control
              type="number"
              value={form.grossAmount}
              onChange={set("grossAmount")}
              placeholder={total ? money(total) : ""}
            />
          </Form.Group>
        </div>
        <div className="contract-records__form-actions">
          <Button type="button" size="sm" disabled={invoicing} onClick={createInvoice}>
            {invoicing && <Spinner animation="border" size="sm" />} {c("invoice.create")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RoRow label={c("invoice.number")} value={invoice.number} />
      <RoRow label={c("invoice.issuedAt")} value={utils.functions.getDate(invoice.issuedAt)} />
      <RoRow label={c("invoice.customer")} value={invoice.customerTitle} />
      <RoRow label={c("invoice.taxNo")} value={invoice.taxNo} />
      <RoRow label={c("invoice.net")} value={`${money(invoice.netAmount)} TL`} />
      <RoRow label={c("invoice.tax")} value={`${money(invoice.taxAmount)} TL`} />
      <RoRow label={c("invoice.gross")} value={`${money(invoice.grossAmount)} TL`} />
      <Button variant="warning" size="sm" className="mt-2" onClick={() => window.print()}>{c("print")}</Button>
    </>
  );
};

export default InvoiceTab;
