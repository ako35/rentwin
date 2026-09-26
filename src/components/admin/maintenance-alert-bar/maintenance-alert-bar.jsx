import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GiCarWheel, GiMechanicGarage } from "react-icons/gi";
import {
  BsShieldCheck,
  BsShield,
  BsReceipt,
  BsSignpost2,
  BsFileEarmarkText,
  BsPersonBadge,
  BsPersonBadgeFill,
  BsPen,
} from "react-icons/bs";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import RowLink from "../row-link/row-link";
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
const KBS_KEY = "kbsPending";
const KBS_RELEASE_KEY = "kbsReleasePending";
const SIGN_KEY = "signPending";

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

// HGS Kontrolü: only ever closed contracts (the check only makes sense once
// the rental is actually over), so a single "closed at" date column is enough.
const ClosedContractsTable = ({ rows }) => {
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
          <tr key={row.id} className="maintenance-alert-bar__rowlink row-link-host">
            <td>
              <RowLink to={`${constants.routes.adminContracts}/${row.id}`} label={row.contractNo || row.car?.licensePlate} />
              {row.contractNo || "—"}
            </td>
            <td className="maintenance-alert-bar__plate">{row.car?.licensePlate || "—"}</td>
            <td title={custName(row.user)}>{custName(row.user)}</td>
            <td>{utils.functions.getDate(row.returnedAt || row.dropOffTime)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// KABİS Bekleyen and Fatura Bekleyen (open MONTHLY leg) both mix open and
// closed contracts — filing/invoicing is due before the rental is over, not
// only once it's returned — so their rows carry their own status badge
// instead of a single "closed at" date. Shared table for both.
const MixedStatusTable = ({ rows }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  return (
    <table className="maintenance-alert-bar__table maintenance-alert-bar__table--kbs">
      <thead>
        <tr>
          <th>{t("alertBar.col.contractNo")}</th>
          <th>{t("alertBar.col.plate")}</th>
          <th>{t("alertBar.col.customer")}</th>
          <th>{t("alertBar.col.pickUpDate")}</th>
          <th>{t("alertBar.col.status")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="maintenance-alert-bar__rowlink row-link-host">
            <td>
              <RowLink to={`${constants.routes.adminContracts}/${row.id}`} label={row.contractNo || row.car?.licensePlate} />
              {row.contractNo || "—"}
            </td>
            <td className="maintenance-alert-bar__plate">{row.car?.licensePlate || "—"}</td>
            <td title={custName(row.user)}>{custName(row.user)}</td>
            <td>{utils.functions.getDate(row.pickUpTime)}</td>
            <td>
              <span className={`maintenance-alert-bar__status maintenance-alert-bar__status--${(row.status || "").toLowerCase()}`}>
                {tCommon(`options.contractStatus.${row.status}`)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MaintenanceAlertBar = ({
  alerts,
  hgsPending = [],
  invoicePending = [],
  kbsPending = [],
  kbsReleasePending = [],
  signPending = [],
}) => {
  const { t, i18n } = useTranslation("admin");
  const [open, setOpen] = useState(null);

  const categories = alerts?.categories || {};
  const isSpecialTab = (key) =>
    key === HGS_KEY || key === INVOICE_KEY || key === KBS_KEY || key === KBS_RELEASE_KEY || key === SIGN_KEY;

  const activeList = open && !isSpecialTab(open) ? categories[open] || [] : [];

  return (
    <div className="maintenance-alert-bar">
      <div className="maintenance-alert-bar__row">
        <div className="maintenance-alert-bar__tabs">
          {CATEGORIES.map(({ key, icon }) => {
            const list = categories[key] || [];
            return (
              <button
                key={key}
                type="button"
                className={
                  "maintenance-alert-bar__tab" +
                  (list.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
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

          <button
            type="button"
            className={
              "maintenance-alert-bar__tab" +
              (kbsPending.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
              (open === KBS_KEY ? " maintenance-alert-bar__tab--active" : "")
            }
            onClick={() => setOpen(open === KBS_KEY ? null : KBS_KEY)}
          >
            <BsPersonBadge /> {t("alertBar.kbsPending")} ({kbsPending.length})
          </button>

          <button
            type="button"
            className={
              "maintenance-alert-bar__tab" +
              (kbsReleasePending.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
              (open === KBS_RELEASE_KEY ? " maintenance-alert-bar__tab--active" : "")
            }
            onClick={() => setOpen(open === KBS_RELEASE_KEY ? null : KBS_RELEASE_KEY)}
          >
            <BsPersonBadgeFill /> {t("alertBar.kbsReleasePending")} ({kbsReleasePending.length})
          </button>

          <button
            type="button"
            className={
              "maintenance-alert-bar__tab" +
              (signPending.length ? " maintenance-alert-bar__tab--due maintenance-alert-bar__tab--overdue" : "") +
              (open === SIGN_KEY ? " maintenance-alert-bar__tab--active" : "")
            }
            onClick={() => setOpen(open === SIGN_KEY ? null : SIGN_KEY)}
          >
            <BsPen /> {t("alertBar.signPending")} ({signPending.length})
          </button>
        </div>
      </div>

      {open && !isSpecialTab(open) && (
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
                  <Link
                    key={item.vehicleId + (item.date || "missing")}
                    to={`${constants.routes.adminVehicles}/${item.vehicleId}?tab=${VEHICLE_TAB_BY_CATEGORY[open]}`}
                    className={"maintenance-alert-bar__chip" + (urgent ? " maintenance-alert-bar__chip--overdue" : "")}
                    title={`${item.name} — ${statusText}`}
                  >
                    {item.plate}
                  </Link>
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
            <ClosedContractsTable rows={hgsPending} />
          )}
        </div>
      )}

      {open === INVOICE_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.invoicePendingHead")}</div>
          {invoicePending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.invoicePendingNone")}</div>
          ) : (
            <MixedStatusTable rows={invoicePending} />
          )}
        </div>
      )}

      {open === KBS_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.kbsPendingHead")}</div>
          {kbsPending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.kbsPendingNone")}</div>
          ) : (
            <MixedStatusTable rows={kbsPending} />
          )}
        </div>
      )}

      {open === KBS_RELEASE_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.kbsReleasePendingHead")}</div>
          {kbsReleasePending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.kbsReleasePendingNone")}</div>
          ) : (
            <ClosedContractsTable rows={kbsReleasePending} />
          )}
        </div>
      )}

      {open === SIGN_KEY && (
        <div className="maintenance-alert-bar__panel">
          <div className="maintenance-alert-bar__panel-head">{t("alertBar.signPendingHead")}</div>
          {signPending.length === 0 ? (
            <div className="maintenance-alert-bar__empty">{t("alertBar.signPendingNone")}</div>
          ) : (
            <MixedStatusTable rows={signPending} />
          )}
        </div>
      )}
    </div>
  );
};

export default MaintenanceAlertBar;
