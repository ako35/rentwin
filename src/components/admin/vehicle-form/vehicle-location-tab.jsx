import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
import { BsCheck2All, BsEyeSlash, BsJournalText } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import Loading from "../../common/loading/loading";
import LeafletMap from "../telematics/leaflet-map";
import AccessReasonModal from "../telematics/access-reason-modal";
import AccessLogModal from "../telematics/access-log-modal";
import {
  STATUS_COLORS,
  agoText,
  alertText,
  alertTitle,
  eventText,
  formatDateTime,
  formatTime,
  isStale,
  severityClass,
  toLocalInput,
  traccarErrorKey,
} from "../telematics/telematics-format";

const DAY_MS = 24 * 60 * 60 * 1000;

// Araç detayı → Konum: the vehicle's tracker id, its live state, a route for
// a chosen period and the recent device events. Location of a rented vehicle
// (live or a route overlapping a rental) needs a reason; the backend enforces
// that and logs every access.
const VehicleLocationTab = ({ vehicleId, plate }) => {
  const { t, i18n } = useTranslation("admin");
  const l = (key, opts) => t(`telematics.vehicleTab.${key}`, opts);
  const lang = i18n.language;

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imei, setImei] = useState("");
  const [savingImei, setSavingImei] = useState(false);

  const [range, setRange] = useState(() => ({
    from: toLocalInput(Date.now() - DAY_MS),
    to: toLocalInput(Date.now()),
  }));
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [fitKey, setFitKey] = useState(0);

  // What the reason modal is for: { kind: "live" } or { kind: "route", rentals }.
  const [reasonFor, setReasonFor] = useState(null);
  const [granting, setGranting] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Km tracking (Faz 3): "the dashboard shows this km now".
  const [calKm, setCalKm] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [acking, setAcking] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await services.telematics.getVehicleTelematics(vehicleId);
      setInfo(data);
      setImei(data.trackerImei || "");
      return data;
    } catch (error) {
      setInfo(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) load().then(() => setFitKey((k) => k + 1));
  }, [vehicleId, load]);

  const saveImei = async (value) => {
    setSavingImei(true);
    try {
      const res = await services.telematics.setVehicleTracker(vehicleId, value);
      const key = !res.trackerImei
        ? "removed"
        : res.deviceRegistered
          ? "saved"
          : res.traccarError === "TRACCAR_NOT_CONFIGURED"
            ? "savedNoServer"
            : "savedNotRegistered";
      utils.functions.swalToast(l(key), res.trackerImei && !res.deviceRegistered ? "warning" : "success");
      setRoute(null);
      await load();
      setFitKey((k) => k + 1);
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || l("saveError"), "error");
    } finally {
      setSavingImei(false);
    }
  };

  const fetchRoute = async (reasonPayload) => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      setRouteError(l("badRange"));
      return;
    }
    setRouteLoading(true);
    setRouteError("");
    try {
      const res = await services.telematics.getVehicleRoute(vehicleId, {
        from: from.toISOString(),
        to: to.toISOString(),
        ...(reasonPayload || {}),
      });
      setRoute(res);
      setReasonFor(null);
      setFitKey((k) => k + 1);
    } catch (error) {
      const body = error?.response?.data;
      if (body?.code === "REASON_REQUIRED") {
        setReasonFor({ kind: "route", rentals: body.rentals || [] });
      } else {
        setRouteError(body?.message || t("telematics.errors.generic"));
        setReasonFor(null);
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const confirmReason = async (payload) => {
    if (reasonFor?.kind === "route") {
      setGranting(true);
      await fetchRoute(payload);
      setGranting(false);
      return;
    }
    setGranting(true);
    try {
      await services.telematics.grantLocationAccess(vehicleId, payload);
      setReasonFor(null);
      await load();
      setFitKey((k) => k + 1);
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || t("telematics.fleetMap.grantError"), "error");
    } finally {
      setGranting(false);
    }
  };

  const calibrate = async (e) => {
    e.preventDefault();
    const km = Number(calKm);
    if (!Number.isInteger(km) || km < 0) return;
    setCalibrating(true);
    try {
      await services.telematics.calibrateVehicleKm(vehicleId, km);
      utils.functions.swalToast(t("telematics.km.calibrated"), "success");
      setCalKm("");
      await load();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || t("telematics.km.calibrateError"), "error");
    } finally {
      setCalibrating(false);
    }
  };

  const acknowledgeAll = async () => {
    setAcking(true);
    try {
      await services.telematics.acknowledgeTelematicsAlerts({ all: true, vehicleId });
      await load();
    } catch {
      utils.functions.swalToast(t("telematics.alerts.ackError"), "error");
    } finally {
      setAcking(false);
    }
  };

  const markers = useMemo(() => {
    const p = info?.position;
    if (!p) return [];
    return [
      {
        id: vehicleId,
        lat: p.latitude,
        lng: p.longitude,
        color: STATUS_COLORS[info.status] || "#64748b",
        label: l("now"),
        course: p.course,
        moving: (p.speedKmh || 0) > 2,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, vehicleId]);

  const routes = useMemo(
    () => (route?.points?.length ? [{ id: "route", color: "#2563eb", points: route.points.map((p) => [p[0], p[1]]) }] : []),
    [route]
  );

  if (!vehicleId) {
    return (
      <Alert variant="secondary" className="mb-0">
        {t("vehicles.records.saveVehicleFirst")}
      </Alert>
    );
  }
  if (loading) return <Loading height={200} />;
  if (!info) return <Alert variant="danger">{t("telematics.errors.generic")}</Alert>;

  const p = info.position;
  const hasTracker = !!info.trackerImei;
  const rentalIntro =
    reasonFor?.kind === "route"
      ? t("telematics.reasonModal.introRoute", {
          contracts: reasonFor.rentals
            .map((r) => r.contractNo || "—")
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", "),
        })
      : t("telematics.reasonModal.introLive", { plate: plate || "", minutes: info.grantMinutes || 30 });

  return (
    <div className="vehicle-location">
      {info.traccarError && (
        <Alert variant={info.traccarError === "TRACCAR_NOT_CONFIGURED" ? "info" : "warning"}>
          {t(traccarErrorKey(info.traccarError))}
        </Alert>
      )}

      <div className="tlm-card">
        <h4>{l("tracker")}</h4>
        <Form
          className="tlm-range"
          onSubmit={(e) => {
            e.preventDefault();
            saveImei(imei.trim());
          }}
        >
          <Form.Group>
            <Form.Label>{l("imei")}</Form.Label>
            <Form.Control
              value={imei}
              maxLength={32}
              inputMode="numeric"
              placeholder="356307042441013"
              onChange={(e) => setImei(e.target.value)}
            />
          </Form.Group>
          <div>
            <Button type="submit" disabled={savingImei || imei.trim() === (info.trackerImei || "") || !imei.trim()}>
              {savingImei && <Spinner animation="border" size="sm" />} {l("save")}
            </Button>{" "}
            {hasTracker && (
              <Button variant="outline-danger" disabled={savingImei} onClick={() => saveImei("")}>
                {l("remove")}
              </Button>
            )}
          </div>
        </Form>
        <div className="tlm-muted">{l("imeiHelp")}</div>
        {hasTracker && !info.traccarError && (
          <div className="mt-2">
            {info.deviceRegistered ? (
              <span className={`tlm-signal${isStale(info.lastSeenAt) ? " tlm-signal--stale" : ""}`}>
                {l("registered")} · {agoText(info.lastSeenAt, t, lang)}
              </span>
            ) : (
              <span className="tlm-signal tlm-signal--stale">{t("telematics.device.notRegistered")}</span>
            )}
          </div>
        )}
      </div>

      {hasTracker && (
        <div className="tlm-card">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h4 className="mb-0">{l("live")}</h4>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              {info.grantUntil && (
                <span className="tlm-muted">{t("telematics.hidden.grantUntil", { time: formatTime(info.grantUntil, lang) })}</span>
              )}
              <Button size="sm" variant="outline-secondary" onClick={() => setShowLog(true)}>
                <BsJournalText /> {t("telematics.fleetMap.accessLog")}
              </Button>
            </div>
          </div>

          {info.locationHidden ? (
            <Alert variant="warning" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span>
                <BsEyeSlash /> {t("telematics.hidden.hint")}
                {info.activeContractId && (
                  <>
                    {" "}
                    <Link to={`${constants.routes.adminContracts}/${info.activeContractId}`}>{l("goToContract")}</Link>
                  </>
                )}
              </span>
              <Button size="sm" variant="warning" onClick={() => setReasonFor({ kind: "live" })}>
                {t("telematics.hidden.show")}
              </Button>
            </Alert>
          ) : (
            <div className="tlm-stats">
              <div>
                <span>{l("lastFix")}</span>
                <strong>{p ? formatDateTime(p.fixTime, lang) : "—"}</strong>
              </div>
              <div>
                <span>{l("ignition")}</span>
                <strong>
                  {p?.ignition === true ? t("telematics.ignitionOn") : p?.ignition === false ? t("telematics.ignitionOff") : "—"}
                </strong>
              </div>
              <div>
                <span>{l("speedLabel")}</span>
                <strong>{p ? t("telematics.speed", { speed: p.speedKmh ?? 0 }) : "—"}</strong>
              </div>
              {info.atOffice != null && (
                <div>
                  <span>{t("telematics.km.office")}</span>
                  <strong>{info.atOffice ? t("telematics.km.atOffice") : t("telematics.km.awayFromOffice")}</strong>
                </div>
              )}
            </div>
          )}

          <LeafletMap markers={markers} routes={routes} fitKey={fitKey} height={380} />

          <h4 className="mt-3">{l("route")}</h4>
          <Form
            className="tlm-range"
            onSubmit={(e) => {
              e.preventDefault();
              fetchRoute();
            }}
          >
            <Form.Group>
              <Form.Label>{l("from")}</Form.Label>
              <Form.Control
                type="datetime-local"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{l("to")}</Form.Label>
              <Form.Control
                type="datetime-local"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </Form.Group>
            <div>
              <Button type="submit" disabled={routeLoading}>
                {routeLoading && <Spinner animation="border" size="sm" />} {l("showRoute")}
              </Button>
            </div>
          </Form>
          <div className="tlm-muted mb-2">{l("rangeHelp", { days: info.maxRouteDays || 7 })}</div>
          {routeError && <Alert variant="danger">{routeError}</Alert>}
          {route && (
            <>
              {route.rentals?.length > 0 && <Alert variant="secondary">{l("rentalNotice", { count: route.rentals.length })}</Alert>}
              {route.summary.pointCount === 0 ? (
                <Alert variant="secondary">{l("noPoints")}</Alert>
              ) : (
                <div className="tlm-stats">
                  <div>
                    <span>{l("distance")}</span>
                    <strong>{route.summary.distanceKm.toLocaleString(lang)} km</strong>
                  </div>
                  <div>
                    <span>{l("maxSpeed")}</span>
                    <strong>{t("telematics.speed", { speed: route.summary.maxSpeedKmh })}</strong>
                  </div>
                  <div>
                    <span>{l("points")}</span>
                    <strong>{route.summary.pointCount.toLocaleString(lang)}</strong>
                  </div>
                  <div>
                    <span>{l("firstLast")}</span>
                    <strong>
                      {formatTime(route.summary.firstFix, lang)} – {formatTime(route.summary.lastFix, lang)}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {hasTracker && info.km && (
        <div className="tlm-card">
          <h4>{t("telematics.km.title")}</h4>
          <div className="tlm-stats">
            <div>
              <span>{t("telematics.km.estimated")}</span>
              <strong>{info.km.estimatedKm != null ? `${info.km.estimatedKm.toLocaleString(lang)} km` : "—"}</strong>
            </div>
            <div>
              <span>{t("telematics.km.rentwin")}</span>
              <strong>{info.km.currentKm != null ? `${info.km.currentKm.toLocaleString(lang)} km` : "—"}</strong>
            </div>
            <div>
              <span>{t("telematics.km.raw")}</span>
              <strong>{info.km.deviceRawKm != null ? `${info.km.deviceRawKm.toLocaleString(lang)} km` : "—"}</strong>
            </div>
            <div>
              <span>{t("telematics.km.reading")}</span>
              <strong>{info.km.deviceReadingAt ? agoText(info.km.deviceReadingAt, t, lang) : "—"}</strong>
            </div>
          </div>
          <div className="tlm-muted mb-2">
            {info.km.calibrationPending
              ? t("telematics.km.pending")
              : info.km.calibrated
                ? t("telematics.km.calibratedAt", { time: formatDateTime(info.km.calibratedAt, lang) })
                : t("telematics.km.notCalibrated")}
          </div>
          <Form className="tlm-range" onSubmit={calibrate}>
            <Form.Group>
              <Form.Label>{t("telematics.km.calibrateLabel")}</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={calKm}
                placeholder={info.km.estimatedKm != null ? String(info.km.estimatedKm) : ""}
                onChange={(e) => setCalKm(e.target.value)}
              />
            </Form.Group>
            <div>
              <Button type="submit" variant="outline-primary" disabled={calibrating || calKm === ""}>
                {calibrating && <Spinner animation="border" size="sm" />} {t("telematics.km.calibrate")}
              </Button>
            </div>
          </Form>
          <div className="tlm-muted">{t("telematics.km.help")}</div>
        </div>
      )}

      {hasTracker && (
        <div className="tlm-card">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h4 className="mb-0">{t("telematics.km.alerts")}</h4>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              {(info.alerts || []).some((a) => !a.acknowledgedAt) && (
                <Button size="sm" variant="outline-success" disabled={acking} onClick={acknowledgeAll}>
                  {acking ? <Spinner animation="border" size="sm" /> : <BsCheck2All />} {t("telematics.alerts.ackAll")}
                </Button>
              )}
              <Link to={constants.routes.adminGpsAlerts} className="tlm-muted">
                {t("telematics.alerts.viewAll")}
              </Link>
            </div>
          </div>
          {!info.alerts?.length ? (
            <div className="tlm-muted">{t("telematics.km.noAlerts")}</div>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="tlm-table">
                <tbody>
                  {info.alerts.map((a) => (
                    <tr key={a.id} className={a.acknowledgedAt ? "tlm-alert--acked" : ""}>
                      <td className="text-nowrap">
                        <span className={severityClass(a.severity)}>{t(`telematics.alerts.severity.${a.severity}`)}</span>{" "}
                        {formatDateTime(a.occurredAt, lang)}
                      </td>
                      <td>
                        <span className="tlm-alert__title">{alertTitle(a, t)}</span>{" "}
                        <span className="tlm-alert__text">{alertText(a, t, lang)}</span>
                      </td>
                      <td className="text-nowrap">
                        {a.contractId && (
                          <Link to={`${constants.routes.adminContracts}/${a.contractId}`}>{a.data?.contractNo || "→"}</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {hasTracker && (
        <div className="tlm-card">
          <h4>{l("events")}</h4>
          {info.events.length === 0 ? (
            <div className="tlm-muted">{l("noEvents")}</div>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="tlm-table">
                <tbody>
                  {info.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="text-nowrap">{formatDateTime(ev.occurredAt, lang)}</td>
                      <td>{eventText(ev, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      <AccessReasonModal
        show={!!reasonFor}
        intro={rentalIntro}
        submitLabel={reasonFor?.kind === "route" ? l("showRoute") : undefined}
        saving={granting}
        onHide={() => setReasonFor(null)}
        onConfirm={confirmReason}
      />
      <AccessLogModal show={showLog} onHide={() => setShowLog(false)} vehicleId={vehicleId} />
    </div>
  );
};

export default VehicleLocationTab;
