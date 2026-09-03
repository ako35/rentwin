// Read-only label/value line used throughout the contract screen.
const RoRow = ({ label, value }) => (
  <div className="contract-page__ro">
    <span>{label}</span>
    <strong>{value || "—"}</strong>
  </div>
);

export default RoRow;
