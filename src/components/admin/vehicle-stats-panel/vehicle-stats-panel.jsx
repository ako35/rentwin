import { FaCar, FaCheckCircle, FaMapMarkerAlt, FaCog } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import "./vehicle-stats-panel.scss";

const VehicleStatsPanel = ({ stats }) => {
  const { t } = useTranslation("admin");
  const items = [
    { label: t("vehicleStatsPanel.total"), value: stats?.total, icon: <FaCar />, color: "blue" },
    { label: t("vehicleStatsPanel.rented"), value: stats?.rented, icon: <FaCheckCircle />, color: "green" },
    { label: t("vehicleStatsPanel.available"), value: stats?.available, icon: <FaMapMarkerAlt />, color: "orange" },
    { label: t("vehicleStatsPanel.outOfService"), value: stats?.outOfService, icon: <FaCog />, color: "blue" },
  ];

  return (
    <div className="vehicle-stats-panel">
      <h3 className="vehicle-stats-panel__title">{t("vehicleStatsPanel.title")}</h3>
      <div className="vehicle-stats-panel__items">
        {items.map((item) => (
          <div className="vehicle-stats-panel__item" key={item.label}>
            <span className={`vehicle-stats-panel__icon vehicle-stats-panel__icon--${item.color}`}>{item.icon}</span>
            <span className="vehicle-stats-panel__value">{item.value ?? 0}</span>
            <span className="vehicle-stats-panel__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleStatsPanel;
