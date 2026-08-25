import "./gauge-chart.scss";

const RADIUS = 90;
const SEMI_CIRCUMFERENCE = Math.PI * RADIUS;

const GaugeChart = ({ value = 0, label, color = "#1b7a43" }) => {
  const clamped = Math.min(100, Math.max(0, value));
  const offset = SEMI_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="gauge-chart">
      <svg viewBox="0 0 200 110">
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          className="gauge-chart__track"
        />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          stroke={color}
          strokeDasharray={SEMI_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="gauge-chart__fill"
        />
        <text x="100" y="90" textAnchor="middle" className="gauge-chart__value">
          {clamped}%
        </text>
      </svg>
      {label && <div className="gauge-chart__label">{label}</div>}
      <div className="gauge-chart__scale">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};

export default GaugeChart;
