import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import RoRow from "./RoRow";
import SaveFirstHint from "./SaveFirstHint";

// Top tab: the contract's invoice — show it, or create one.
const InvoiceTab = ({ isCreate, contractId, invoice, onInvoiceCreated, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const [invoicing, setInvoicing] = useState(false);

  const createInvoice = async () => {
    setInvoicing(true);
    try {
      onInvoiceCreated(await services.contract.createInvoice(contractId));
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setInvoicing(false);
    }
  };

  if (isCreate) return <SaveFirstHint />;

  if (!invoice) {
    return (
      <>
        <p className="text-muted">{c("invoice.none")}</p>
        <Button size="sm" disabled={invoicing} onClick={createInvoice}>
          {invoicing && <Spinner animation="border" size="sm" />} {c("invoice.create")}
        </Button>
      </>
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
