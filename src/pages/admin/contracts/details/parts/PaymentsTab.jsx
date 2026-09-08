import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { BsWallet2 } from "react-icons/bs";
import { ContractRecords } from "../../../../../components";
import SaveFirstHint from "./SaveFirstHint";
import "./payments-tab.scss";

// Sub tab: grand total / collected / remaining balance as three financial
// badge cards (a negative balance is called out in rose), then the payments
// ledger. New rows default their date to today.
const PaymentsTab = ({ isCreate, contractId, recordLabels, total, collected, onPaymentsChange, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) return <SaveFirstHint />;

  const balance = collected - total;

  return (
    <>
      <div className="contract-page__fin-cards">
        <div className="contract-page__fin-card">
          <span className="contract-page__fin-label">{c("grandTotal")}</span>
          <span className="contract-page__fin-value">{money(total)} TL</span>
        </div>
        <div className="contract-page__fin-card">
          <span className="contract-page__fin-label">{c("collected")}</span>
          <span className="contract-page__fin-value is-paid">{money(collected)} TL</span>
        </div>
        <div className={`contract-page__fin-card${balance < 0 ? " is-due" : ""}`}>
          <span className="contract-page__fin-label">{c("balanceRemaining")}</span>
          <span className="contract-page__fin-value">{money(balance)} TL</span>
        </div>
      </div>
      <ContractRecords
        contractId={contractId}
        resource="payments"
        onChange={onPaymentsChange}
        initial={{ amount: "", method: "Cash", paidAt: moment().format("YYYY-MM-DD"), note: "" }}
        emptyIcon={<BsWallet2 />}
        columns={[
          { key: "paidAt", label: c("payments.paidAt"), kind: "date" },
          { key: "method", label: c("payments.method"), format: (val) => c(`paymentMethods.${val}`) },
          { key: "amount", label: c("payments.amount"), kind: "money" },
          { key: "note", label: c("payments.note") },
        ]}
        fields={[
          { name: "amount", label: c("payments.amount"), type: "number" },
          {
            name: "method",
            label: c("payments.method"),
            type: "select",
            options: ["Cash", "CreditCard", "Transfer", "Other"].map((m) => ({
              value: m,
              label: c(`paymentMethods.${m}`),
            })),
          },
          { name: "paidAt", label: c("payments.paidAt"), type: "date" },
          { name: "note", label: c("payments.note") },
        ]}
        labels={recordLabels}
      />
    </>
  );
};

export default PaymentsTab;
