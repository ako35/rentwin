import { Link } from "react-router-dom";
import { FaCar, FaCheckCircle, FaMapMarkerAlt, FaCog } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import "./vehicle-stats-panel.scss";

const { routes } = constants;

const VehicleStatsPanel = ({ stats }) => {
  const { t } = useTranslation("admin");
  const items = [
    { label: t("vehicleStatsPanel.total"), value: stats?.total, icon: <FaCar />, color: "blue" },
    {
      label: t("vehicleStatsPanel.rented"),
      value: stats?.rented,
      icon: <FaCheckCircle />,
      color: "green",
      to: `${routes.adminVehicleStatusBoard}?tab=rented`,
    },
    {
      label: t("vehicleStatsPanel.available"),
      value: stats?.available,
      icon: <FaMapMarkerAlt />,
      color: "orange",
      to: `${routes.adminVehicleStatusBoard}?tab=available`,
    },
    { label: t("vehicleStatsPanel.outOfService"), value: stats?.outOfService, icon: <FaCog />, color: "blue" },
  ];

  return (
    <div className="vehicle-stats-panel">
      <h3 className="vehicle-stats-panel__title">{t("vehicleStatsPanel.title")}</h3>
      <div className="vehicle-stats-panel__items">
        {items.map((item) => {
          const Tag = item.to ? Link : "div";
          return (
            <Tag
              className={`vehicle-stats-panel__item${item.to ? " vehicle-stats-panel__item--link" : ""}`}
              key={item.label}
              {...(item.to ? { to: item.to } : {})}
            >
              <span className={`vehicle-stats-panel__icon vehicle-stats-panel__icon--${item.color}`}>{item.icon}</span>
              <span className="vehicle-stats-panel__value">{item.value ?? 0}</span>
              <span className="vehicle-stats-panel__label">{item.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleStatsPanel;
