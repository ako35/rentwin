import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiCarWheel, GiMechanicGarage } from "react-icons/gi";
import { BsShieldCheck, BsShield, BsReceipt, BsSignpost2, BsFileEarmarkText } from "react-icons/bs";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import "./maintenance-alert-bar.scss";

const CATEGORIES = [
  { key: "maintenance", icon: <GiMechanicGarage /> },
  { key: "inspection", icon: <GiCarWheel /> },
  { key: "insurance", icon: <BsShieldCheck /> },
  { key: "kasko", icon: <BsShield /> },
  { key: "tax", icon: <BsReceipt /> },
];

const HGS_KEY = "hgsPending";
const INVOICE_KEY = "invoicePending";

// Maps an alert category to the vehicle-detail record tab it belongs to —
// Sigorta and Kasko are both entries on the vehicle form's single "insurance"
// tab (two-pane Sigorta/Kasko view), so both point there.
const VEHICLE_TAB_BY_CATEGORY = {
  maintenance: "maintenance",
  inspection: "inspection",
  insurance: "insurance",
  kasko: "insurance",
  tax: "tax",
};

const custName = (u) =>
  (u?.companyTitle || `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || "—");

// HGS Kontrolü and Fatura Bekleyen are the same row shape (closed contracts
// that still need something done) — one shared table for both.
const ClosedContractsTable = ({ rows, onRowClick }) => {
  const { t } = useTranslation("admin");
  return (
    <table className="maintenance-alert-bar__table maintenance-alert-bar__table--hgs">
      <thead>
        <tr>
          <th>{t("alertBar.col.contractNo")}</th>
          <th>{t("alertBar.col.plate")}</th>
          <th>{t("alertBar.col.customer")}</th>
          <th>{t("alertBar.col.closedAt")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="maintenance-alert-bar__rowlink" onClick={() => onRowClick(row)}>
            <td>{row.contractNo || "—"}</td>
            <td className="maintenance-alert-bar__plate">{row.car?.licensePlate || "—"}</td>
            <td title={custName(row.user)}>{custName(row.user)}</td>
            <td>{utils.functions.getDate(row.returnedAt || row.dropOffTime)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MaintenanceAlertBar = ({ alerts, hgsPending = [], invoicePending = [] }) => {
  const { t, i18n } = useTranslation("admin");
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);

  const categories = alerts?.categories || {};

  const activeList = open && open !== HGS_KEY && open !== INVOICE_KEY ? categories[open] || [] : [];

  const goToContract = (row) => navigate(`${constants.routes.adminContracts}/${row.id}`);

  return (
    <div className="maintenance-alert-bar">
      <div className="maintenance-alert-bar__row">
        <div className="maintenance-alert-bar__tabs">
          {CATEGORIES.map(({ key, icon }) => {
            const list = categories[key] || [];
            const overdue = list.some(
              (item) =>
                item.missing ||
                (item.daysLeft != null && item.daysLeft < 0) ||
                (item.kmLeft != null && item.kmLeft < 0)
            );
            return (
              <button
                key={key}
                type="button"
                className={
                  "maintenance-alert-bar__tab" +
                  (list.length ? " maintenance-alert-bar__tab--due" : "") +
                  (overdue ? " maintenance-alert-bar__tab--overdue" : "") +
                  (open === key ? " maintenance-alert-bar__tab--active" : "")
                }
                onClick={() => setOpen(open === key ? null : key)}
              >
                {icon} {t(`alertBar.${key}`)} ({list.length})
              </button>
            );
          })}

          <button
            type="button"
            className={
              "maintenance-alert-bar__tab" +
              (hgsPending.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
              (open === HGS_KEY ? " maintenance-alert-bar__tab--active" : "")
            }
            onClick={() => setOpen(open === HGS_KEY ? null : HGS_KEY)}
          >
            <BsSignpost2 /> {t("alertBar.hgs")} ({hgsPending.length})
          </button>

          <button
            type="button"
            className={
              "maintenance-alert-bar__tab" +
              (invoicePending.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
              (open === INVOICE_KEY ? " maintenance-alert-bar__tab--active" : "")
            }
            onClick={() => setOpen(open === INVOICE_KEY ? null : INVOICE_KEY)}
          >
            <BsFileEarmarkText /> {t("alertBar.invoicePending")} ({invoicePending.length})
          </button>
        </div>
      </div>

      {open && open !== HGS_KEY && open !== INVOICE_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">
            {t(`alertBar.${open}`)} — {t("alertBar.dueWithin", { days: alerts?.windowDays?.[open] ?? 30 })}
            {open === "maintenance" && alerts?.windowKm?.maintenance
              ? ` / ${t("alertBar.dueWithinKm", { km: alerts.windowKm.maintenance })}`
              : ""}
          </div>
          {activeList.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.none")}</div>
          ) : (
            <div className="maintenance-alert-bar__chips">
              {activeList.map((item) => {
                const urgent =
                  item.missing ||
                  (item.daysLeft != null && item.daysLeft < 0) ||
                  (item.kmLeft != null && item.kmLeft < 0);
                const statusParts = [];
                if (item.daysLeft != null) {
                  statusParts.push(
                    item.daysLeft < 0
                      ? t("alertBar.daysOverdue", { days: Math.abs(item.daysLeft) })
                      : t("alertBar.daysLeft", { days: item.daysLeft })
                  );
                }
                if (item.kmLeft != null) {
                  statusParts.push(
                    item.kmLeft < 0
                      ? t("alertBar.kmOverdue", { km: Math.abs(item.kmLeft).toLocaleString(i18n.language) })
                      : t("alertBar.kmLeft", { km: item.kmLeft.toLocaleString(i18n.language) })
                  );
                }
                const statusText = item.missing ? t("alertBar.noRecord") : statusParts.join(" · ");
                return (
                  <button
                    key={item.vehicleId + (item.date || "missing")}
                    type="button"
                    className={"maintenance-alert-bar__chip" + (urgent ? " maintenance-alert-bar__chip--overdue" : "")}
                    title={`${item.name} — ${statusText}`}
                    onClick={() =>
                      navigate(
                        `${constants.routes.adminVehicles}/${item.vehicleId}?tab=${VEHICLE_TAB_BY_CATEGORY[open]}`
                      )
                    }
                  >
                    {item.plate}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {open === HGS_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.hgsHead")}</div>
          {hgsPending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.hgsNone")}</div>
          ) : (
            <ClosedContractsTable rows={hgsPending} onRowClick={goToContract} />
          )}
        </div>
      )}

      {open === INVOICE_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.invoicePendingHead")}</div>
          {invoicePending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.invoicePendingNone")}</div>
          ) : (
            <ClosedContractsTable rows={invoicePending} onRowClick={goToContract} />
          )}
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlertBar;
