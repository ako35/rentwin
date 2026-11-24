import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { BsGeoAlt, BsJournalText } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import LeafletMap from "../../../../../components/admin/telematics/leaflet-map";
import AccessReasonModal from "../../../../../components/admin/telematics/access-reason-modal";
import AccessLogModal from "../../../../../components/admin/telematics/access-log-modal";
import {
  ROUTE_COLORS,
  formatDateTime,
  toLocalInput,
} from "../../../../../components/admin/telematics/telematics-format";
import "./route-section.scss";

// Left card: the vehicle's route during this rental (GPS takip, Faz 2). It
// only opens with a stated reason and every opening is logged (KVKK); the
// backend clips the data to the rental period and splits it per car when the
// vehicle was swapped mid-rental.
const RouteSection = ({ contractId }) => {
  const { t, i18n } = useTranslation("admin");
  const c = (key, opts) => t(`telematics.contractRoute.${key}`, opts);
  const lang = i18n.language;

  const [askReason, setAskReason] = useState(false);
  const [reasonPayload, setReasonPayload] = useState(null);
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitKey, setFitKey] = useState(0);
  const [showLog, setShowLog] = useState(false);

  const fetchRoute = async (payload, sub) => {
    setLoading(true);
    setError("");
    try {
      const res = await services.telematics.getContractRoute(contractId, { ...payload, ...(sub || {}) });
      setData(res);
      setReasonPayload(payload);
      setRange({ from: toLocalInput(res.from), to: toLocalInput(res.to) });
      setAskReason(false);
      setFitKey((k) => k + 1);
    } catch (err) {
      const message = err?.response?.data?.message || t("telematics.errors.generic");
      if (data) setError(message);
      else utils.functions.swalToast(message, "error");
      setAskReason(false);
    } finally {
      setLoading(false);
    }
  };

  const refresh = (e) => {
    e.preventDefault();
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      setError(t("telematics.vehicleTab.badRange"));
      return;
    }
    fetchRoute(reasonPayload, { from: from.toISOString(), to: to.toISOString() });
  };

  const routes = useMemo(
    () =>
      (data?.segments || []).map((s, i) => ({
        id: `${s.carId}-${i}`,
        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
        points: (s.points || []).map((p) => [p[0], p[1]]),
      })),
    [data]
  );

  return (
    <section className="contract-card contract-page__route">
      <h3>
        <span>{c("title")}</span>
      </h3>
      <p className="tlm-muted mb-2">{c("hint")}</p>
      <div className="d-flex flex-wrap gap-2">
        <Button size="sm" variant="outline-primary" disabled={loading} onClick={() => setAskReason(true)}>
          {loading && !data ? <Spinner animation="border" size="sm" /> : <BsGeoAlt />} {c("open")}
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setShowLog(true)}>
          <BsJournalText /> {t("telematics.fleetMap.accessLog")}
        </Button>
      </div>

      <AccessReasonModal
        show={askReason}
        intro={c("reasonIntro")}
        submitLabel={c("open")}
        saving={loading}
        onHide={() => setAskReason(false)}
        onConfirm={(payload) => fetchRoute(payload)}
      />

      <Modal show={!!data} onHide={() => setData(null)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{c("title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {data && (
            <>
              <div className="tlm-muted mb-2">
                {c("window")}: {formatDateTime(data.window.from, lang)} – {formatDateTime(data.window.to, lang)}
              </div>
              <Form className="tlm-range" onSubmit={refresh}>
                <Form.Group>
                  <Form.Label>{t("telematics.vehicleTab.from")}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={range.from}
                    min={toLocalInput(data.window.from)}
                    max={toLocalInput(data.window.to)}
                    onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>{t("telematics.vehicleTab.to")}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={range.to}
                    min={toLocalInput(data.window.from)}
                    max={toLocalInput(data.window.to)}
                    onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  />
                </Form.Group>
                <div>
                  <Button type="submit" disabled={loading}>
                    {loading && <Spinner animation="border" size="sm" />} {c("refresh")}
                  </Button>
                </div>
              </Form>
              <div className="tlm-muted mb-2">{t("telematics.vehicleTab.rangeHelp", { days: data.maxRouteDays || 7 })}</div>
              {error && <Alert variant="danger">{error}</Alert>}

              {data.segments.map((s, i) => (
                <div key={`${s.carId}-${i}`} className="contract-page__route-seg">
                  <span className="contract-page__route-swatch" style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }} />
                  <strong>{s.licensePlate || "—"}</strong>
                  <span className="tlm-muted">
                    {formatDateTime(s.from, lang)} – {formatDateTime(s.to, lang)}
                  </span>
                  {s.noTracker && <span className="tlm-muted">{c("noTracker")}</span>}
                  {s.deviceMissing && <span className="tlm-muted">{t("telematics.device.notRegistered")}</span>}
                  {s.summary &&
                    (s.summary.pointCount === 0 ? (
                      <span className="tlm-muted">{t("telematics.vehicleTab.noPoints")}</span>
                    ) : (
                      <span>
                        {s.summary.distanceKm.toLocaleString(lang)} km ·{" "}
                        {t("telematics.vehicleTab.maxSpeed")}: {t("telematics.speed", { speed: s.summary.maxSpeedKmh })}
                      </span>
                    ))}
                </div>
              ))}

              <LeafletMap routes={routes} fitKey={fitKey} height={460} />
            </>
          )}
        </Modal.Body>
      </Modal>

      <AccessLogModal show={showLog} onHide={() => setShowLog(false)} contractId={contractId} />
    </section>
  );
};

export default RouteSection;
