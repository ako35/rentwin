import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { CREDIT_CATEGORIES, DEBIT_CATEGORIES, PAYMENT_METHODS } from "./ledger-constants";

const today = () => moment().format("YYYY-MM-DD");

// Add / edit a manual ledger entry (debit = "Borç Ekle", credit = "Tahsilat").
// Holds its own draft state, keyed off `show`; on save it calls the ledger
// service and hands control back via onSaved (parent closes + reloads).
const EntryModal = ({ show, mode, entry, onHide, onSaved, userId }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const f = (key) => t(`finance.${key}`);
  const isCredit = mode === "credit";
  const categories = isCredit ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState([]);

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
            contractId: entry.contractId || "",
          }
        : {
            date: today(),
            category: categories[categories.length - 1],
            amount: "",
            method: "Cash",
            description: "",
            invoiceNo: "",
            contractId: "",
          }
    );
  }, [show, entry]); // eslint-disable-line react-hooks/exhaustive-deps

  // A credit entry (tahsilat) may be tied to one of this customer's contracts,
  // so it also counts toward that contract's own balance on the contract list.
  useEffect(() => {
    if (!show || !isCredit) return;
    services.contract
      .getContractsByUser(userId)
      .then((data) => setContracts(Array.isArray(data) ? data : []))
      .catch(() => setContracts([]));
  }, [show, isCredit, userId]);

  if (!form) return null;

  const contractLabel = (c) => {
    const parts = [
      c.contractNo || "—",
      c.vehicle ? `${c.vehicle}${c.plate ? ` ${c.plate}` : ""}` : null,
      moment(c.pickUpTime).format("DD.MM.YYYY"),
      tCommon(`options.contractStatus.${c.status}`),
    ].filter(Boolean);
    return parts.join(" · ");
  };

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
        contractId: isCredit && form.contractId ? form.contractId : undefined,
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
        {isCredit && (
          <Form.Group className="mb-2">
            <Form.Label>{f("fields.contract")}</Form.Label>
            <Form.Select value={form.contractId} onChange={set("contractId")}>
              <option value="">{f("fields.noContract")}</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contractLabel(c)}
                </option>
              ))}
            </Form.Select>
            <Form.Text muted>{f("fields.contractHint")}</Form.Text>
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

export default EntryModal;
