import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { GiCarWheel, GiMechanicGarage } from "react-icons/gi";
import { utils } from "../../../utils";
import "./maintenance-alert-bar.scss";

const MaintenanceAlertBar = ({ maintenanceDue = 0, inspectionDue = 0, autoRefresh, onAutoRefreshChange }) => {
  const { t } = useTranslation("admin");

  const showComingSoon = () => utils.functions.swalToast(t("alertBar.comingSoonToast"), "info");

  return (
    <div className="maintenance-alert-bar">
      <div className="maintenance-alert-bar__tabs">
        <button type="button" className="maintenance-alert-bar__tab" onClick={showComingSoon}>
          <GiMechanicGarage /> {t("alertBar.maintenance")} ({maintenanceDue})
        </button>
        <button type="button" className="maintenance-alert-bar__tab" onClick={showComingSoon}>
          <GiCarWheel /> {t("alertBar.inspection")} ({inspectionDue})
        </button>
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
  );
};

export default MaintenanceAlertBar;
