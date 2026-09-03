import { useTranslation } from "react-i18next";
import { ContractRecords } from "../../../../../components";

// Left card: the contract's billable extras. Blocked until the contract exists.
const ExtrasSection = ({ isCreate, contractId, catalog, recordLabels, extrasTotal, onChange, money }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  return (
    <section className="contract-card">
      <h3>{c("ekstralarTitle")}</h3>
      {isCreate ? (
        <p className="text-muted mb-0">{c("saveFirstHint")}</p>
      ) : (
        <ContractRecords
          contractId={contractId}
          resource="extras"
          onChange={onChange}
          catalog={catalog.map((x) => ({
            label: `${x.name} (${x.unitPrice} TL${x.perDay ? "/gün" : ""})`,
            values: { name: x.name, unitPrice: x.unitPrice, perDay: x.perDay, quantity: 1 },
          }))}
          initial={{ name: "", unitPrice: "", perDay: true, quantity: 1 }}
          columns={[
            { key: "name", label: c("extrasFields.name") },
            { key: "unitPrice", label: c("extrasFields.unitPrice"), kind: "money" },
            { key: "quantity", label: c("extrasFields.quantity") },
          ]}
          fields={[
            { name: "name", label: c("extrasFields.name") },
            { name: "unitPrice", label: c("extrasFields.unitPrice"), type: "number" },
            { name: "quantity", label: c("extrasFields.quantity"), type: "number" },
          ]}
          labels={recordLabels}
          footer={
            <div className="contract-page__ro" style={{ marginTop: "0.5rem" }}>
              <span>{c("extrasTotal")}</span>
              <strong>{money(extrasTotal)} TL</strong>
            </div>
          }
        />
      )}
    </section>
  );
};

export default ExtrasSection;
