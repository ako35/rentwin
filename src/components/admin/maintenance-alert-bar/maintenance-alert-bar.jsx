import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { GiCarWheel, GiMechanicGarage } from "react-icons/gi";
import { BsShieldCheck, BsShield, BsReceipt } from "react-icons/bs";
import { utils } from "../../../utils";
import "./maintenance-alert-bar.scss";

const CATEGORIES = [
  { key: "maintenance", icon: <GiMechanicGarage /> },
  { key: "inspection", icon: <GiCarWheel /> },
  { key: "insurance", icon: <BsShieldCheck /> },
  { key: "kasko", icon: <BsShield /> },
  { key: "tax", icon: <BsReceipt /> },
];

const MaintenanceAlertBar = ({ alerts, autoRefresh, onAutoRefreshChange }) => {
  const { t } = useTranslation("admin");
  const [open, setOpen] = useState(null);

  const categories = alerts?.categories || {};
  const showComingSoon = () => utils.functions.swalToast(t("alertBar.comingSoonToast"), "info");

  const activeList = open ? categories[open] || [] : [];

  return (
    <div className="maintenance-alert-bar">
      <div className="maintenance-alert-bar__row">
        <div className="maintenance-alert-bar__tabs">
          {CATEGORIES.map(({ key, icon }) => {
            const list = categories[key] || [];
            const overdue = list.some((item) => item.daysLeft < 0);
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
        </div>
        <div className="maintenance-alert-bar__actions">
          <button type="button" className="maintenance-alert-bar__link" onClick={showComingSoon}>
            {t("alertBar.exchangeRates")}
          </button>
          <button type="button" className="maintenance-alert-bar__link" onClick={showComingSoon}>
            {t("alertBar.settings")}
          </button>
          <Form.Check
            type="switch"
            id="admin-auto-refresh"
            label={t("alertBar.autoRefresh")}
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange?.(e.target.checked)}
          />
        </div>
      </div>

      {open && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">
            {t(`alertBar.${open}`)} — {t("alertBar.dueWithin", { days: alerts?.windowDays ?? 30 })}
          </div>
          {activeList.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.none")}</div>
          ) : (
            <table className="maintenance-alert-bar__table">
              <thead>
                <tr>
                  <th>{t("alertBar.col.plate")}</th>
                  <th>{t("alertBar.col.vehicle")}</th>
                  <th>{t("alertBar.col.date")}</th>
                  <th>{t("alertBar.col.remaining")}</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((item) => (
                  <tr key={item.vehicleId + item.date}>
                    <td className="maintenance-alert-bar__plate">{item.plate}</td>
                    <td>{item.name}</td>
                    <td>{utils.functions.getDate(item.date)}</td>
                    <td
                      className={
                        "maintenance-alert-bar__days" +
                        (item.daysLeft < 0 ? " maintenance-alert-bar__days--overdue" : "")
                      }
                    >
                      {item.daysLeft < 0
                        ? t("alertBar.daysOverdue", { days: Math.abs(item.daysLeft) })
                        : t("alertBar.daysLeft", { days: item.daysLeft })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlertBar;
