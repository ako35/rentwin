import { FaCar, FaKey, FaParking, FaTools } from "react-icons/fa";
import "./vehicle-stats-panel.scss";

const VehicleStatsPanel = ({ stats }) => {
  const items = [
    { label: "Total", value: stats?.total, icon: <FaCar /> },
    { label: "Rented", value: stats?.rented, icon: <FaKey /> },
    { label: "Available", value: stats?.available, icon: <FaParking /> },
    { label: "Out of Service", value: stats?.outOfService, icon: <FaTools /> },
  ];

  return (
    <div className="vehicle-stats-panel">
      <h3 className="vehicle-stats-panel__title">Vehicles</h3>
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
