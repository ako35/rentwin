import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Table } from "react-bootstrap";
import moment from "moment/moment";
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
  // Pick-up month filter ("YYYY-MM"); empty = every contract.
  const [month, setMonth] = useState("");

  const c = (key, opts) => t(`vehicles.contractsTab.${key}`, opts);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    services.contract
      .getContractsByVehicle(vehicleId)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  // Same UTC day convention as the Alış column (utils getDateUTC), so the
  // month a row is filed under matches the date shown on it.
  const visibleRows = month
    ? rows.filter((r) => moment.utc(r.pickUpTime).format("YYYY-MM") === month)
    : rows;

  // Earnings of the visible rows (the selected month, or all). Cancelled
  // contracts never earned anything, so they stay out of the total.
  const earningRows = visibleRows.filter((r) => r.status !== "CANCELLED");
  const earnings = earningRows.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
    : "";

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
        <div className="vehicle-records-panel__filter">
          <Form.Control
            type="month"
            size="sm"
            value={month}
            aria-label={c("monthFilter")}
            title={c("monthFilter")}
            onChange={(e) => setMonth(e.target.value)}
          />
          {month && (
            <Button variant="link" size="sm" className="p-0" onClick={() => setMonth("")}>
              {c("allMonths")}
            </Button>
          )}
        </div>
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
          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                {rows.length === 0 ? c("empty") : c("emptyMonth")}
              </td>
            </tr>
          )}
          {visibleRows.map((r) => (
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
        {rows.length > 0 && (
          <tfoot>
            <tr className="vehicle-records-panel__total">
              <td colSpan={4}>
                {month ? c("monthTotal", { month: monthLabel }) : c("total")}
                <span>{c("contractCount", { n: earningRows.length })}</span>
              </td>
              <td className="text-end">{money(earnings)} TL</td>
              <td />
            </tr>
          </tfoot>
        )}
      </Table>
    </div>
  );
};

export default VehicleContractsTab;
