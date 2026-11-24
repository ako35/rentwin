import { useEffect, useState } from "react";
import { Alert, Button, Modal, Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { services } from "../../../services";
import Loading from "../../common/loading/loading";
import { formatDateTime } from "./telematics-format";

// Who opened which vehicle's location, when and why (TelematicsAccessLog).
// Filter with `vehicleId` or `contractId`; neither = the whole fleet.
const AccessLogModal = ({ show, onHide, vehicleId, contractId }) => {
  const { t, i18n } = useTranslation("admin");
  const a = (key, opts) => t(`telematics.accessLog.${key}`, opts);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    setError(false);
    services.telematics
      .getTelematicsAccessLogs({ vehicleId, contractId })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [show, vehicleId, contractId]);

  const range = (row) =>
    row.rangeFrom ? `${formatDateTime(row.rangeFrom, i18n.language)} – ${formatDateTime(row.rangeTo, i18n.language)}` : "—";

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{a("title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="tlm-muted">{a("intro")}</p>
        {loading && <Loading height={120} />}
        {error && <Alert variant="danger">{a("loadError")}</Alert>}
        {!loading && !error && rows.length === 0 && <Alert variant="secondary">{a("empty")}</Alert>}
        {!loading && !error && rows.length > 0 && (
          <div className="table-responsive">
            <Table size="sm" hover className="tlm-table">
              <thead>
                <tr>
                  <th>{a("when")}</th>
                  <th>{a("who")}</th>
                  <th>{a("vehicle")}</th>
                  <th>{a("scope")}</th>
                  <th>{a("reason")}</th>
                  <th>{a("range")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt, i18n.language)}</td>
                    <td>{row.actorName}</td>
                    <td>{row.licensePlate || "—"}</td>
                    <td>{a(`scopes.${row.scope}`, { defaultValue: row.scope })}</td>
                    <td>
                      {row.reason ? t(`telematics.reasonModal.reasons.${row.reason}`, { defaultValue: row.reason }) : a("noReason")}
                      {row.note && <div className="tlm-muted">{row.note}</div>}
                    </td>
                    <td>{range(row)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          {a("close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AccessLogModal;
