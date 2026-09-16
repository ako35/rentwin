import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Table } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import Loading from "../../common/loading/loading";

const { routes } = constants;

// Full rental history for this vehicle — every contract ever opened against
// it, open or closed. Rows link straight into the contract detail page.
const VehicleContractsTab = ({ vehicleId }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const c = (key) => t(`vehicles.contractsTab.${key}`);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    services.contract
      .getContractsByVehicle(vehicleId)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const money = (v) =>
    Number(v || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (!vehicleId) {
    return (
      <Alert variant="secondary" className="mb-0">
        {t("vehicles.records.saveVehicleFirst")}
      </Alert>
    );
  }

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
            <th>{c("customer")}</th>
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
            <tr
              key={r.id}
              className="vehicle-records-panel__row--clickable"
              onClick={() => navigate(`${routes.adminContracts}/${r.id}`)}
            >
              <td>{r.contractNo || "—"}</td>
              <td>{r.customerName || "—"}</td>
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

export default VehicleContractsTab;
