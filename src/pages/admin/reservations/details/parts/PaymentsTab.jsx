import { useTranslation } from "react-i18next";
import { ContractRecords } from "../../../../../components";
import RoRow from "./RoRow";
import SaveFirstHint from "./SaveFirstHint";

// Sub tab: grand total / collected / balance + the payments ledger.
const PaymentsTab = ({ isCreate, reservationId, recordLabels, total, collected, onPaymentsChange, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) return <SaveFirstHint />;

  return (
    <>
      <div className="contract-page__pay-summary">
        <RoRow label={c("grandTotal")} value={`${money(total)} TL`} />
        <RoRow label={c("collected")} value={`${money(collected)} TL`} />
        <RoRow label={c("balance")} value={`${money(collected - total)} TL`} />
      </div>
      <ContractRecords
        reservationId={reservationId}
        resource="payments"
        onChange={onPaymentsChange}
        initial={{ amount: "", method: "Cash", paidAt: "", note: "" }}
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
