import { FaCar, FaKey, FaParking, FaTools } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import "./vehicle-stats-panel.scss";

const VehicleStatsPanel = ({ stats }) => {
  const { t } = useTranslation("admin");
  const items = [
    { label: t("vehicleStatsPanel.total"), value: stats?.total, icon: <FaCar /> },
    { label: t("vehicleStatsPanel.rented"), value: stats?.rented, icon: <FaKey /> },
    { label: t("vehicleStatsPanel.available"), value: stats?.available, icon: <FaParking /> },
    { label: t("vehicleStatsPanel.outOfService"), value: stats?.outOfService, icon: <FaTools /> },
  ];

  return (
    <div className="vehicle-stats-panel">
      <h3 className="vehicle-stats-panel__title">{t("vehicleStatsPanel.title")}</h3>
      <div className="vehicle-stats-panel__items">
        {items.map((item) => (
          <div className="vehicle-stats-panel__item" key={item.label}>
            <span className="vehicle-stats-panel__icon">{item.icon}</span>
            <span className="vehicle-stats-panel__value">{item.value ?? 0}</span>
            <span className="vehicle-stats-panel__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleStatsPanel;
