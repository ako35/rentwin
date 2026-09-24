import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Table } from "react-bootstrap";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading, RowLink } from "../../../../components";

const { routes } = constants;

// Full rental history for this customer — every contract ever opened under
// them, either as the renting customer or as the reference cari on a
// corporate booking (matches services.contract.getContractsByUser). Rows
// link straight into the contract detail page.
const CustomerContractsTab = ({ userId }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const c = (key) => t(`users.contractsTab.${key}`);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    services.contract
      .getContractsByUser(userId)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const money = (v) =>
    Number(v || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) return <Loading height={160} />;

  return (
    <div className="vehicle-records-panel">
      <div className="vehicle-records-panel__head">
        <h3>{c("title")}</h3>
      </div>

      <Table hover responsive className="vehicle-records-panel__table">
        <thead>
          <tr>
            <th>{c("contractNo")}</th>
            <th>{c("vehicle")}</th>
            <th>{c("pickUpDate")}</th>
            <th>{c("dropOffDate")}</th>
            <th className="text-end">{c("amount")}</th>
            <th>{c("status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">{c("empty")}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="vehicle-records-panel__row--clickable row-link-host">
              <td>
                <RowLink to={`${routes.adminContracts}/${r.id}`} label={r.contractNo} />
                {r.contractNo || "—"}
              </td>
              <td>{[r.vehicle, r.plate].filter(Boolean).join(" — ") || "—"}</td>
              <td>{utils.functions.getDateUTC(r.pickUpTime)}</td>
              <td>{utils.functions.getDateUTC(r.returnedAt || r.dropOffTime)}</td>
              <td className="text-end">{money(r.totalPrice)}</td>
              <td>
                <span className={`vehicle-records-panel__badge vehicle-records-panel__badge--${(r.status || "").toLowerCase()}`}>
                  {tCommon(`options.contractStatus.${r.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CustomerContractsTab;
