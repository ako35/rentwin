import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "react-bootstrap";
import { BsArrowClockwise, BsEyeSlash, BsJournalText, BsSearch } from "react-icons/bs";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import LeafletMap from "../../../../components/admin/telematics/leaflet-map";
import AccessReasonModal from "../../../../components/admin/telematics/access-reason-modal";
import AccessLogModal from "../../../../components/admin/telematics/access-log-modal";
import {
  STATUS_COLORS,
  agoText,
  formatTime,
  isStale,
  traccarErrorKey,
} from "../../../../components/admin/telematics/telematics-format";
import "./style.scss";

const { routes } = constants;
const REFRESH_MS = 15000;

const matches = (query, fields) => {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return true;
  return fields.some((f) => (f || "").toLocaleLowerCase("tr").includes(q));
};

// Filo haritası: every vehicle with a tracker, live. Rented vehicles stay
// hidden until an admin gives a reason (KVKK; the backend enforces it and
// logs the access). Positions are polled from Traccar through the backend
// every REFRESH_MS while the tab is visible.
const AdminFleetMapPage = () => {
  const { t, i18n } = useTranslation("admin");
  const f = (key, opts) => t(`telematics.fleetMap.${key}`, opts);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reasonFor, setReasonFor] = useState(null);
  const [granting, setGranting] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const firstFit = useRef(false);

  const load = useCallback(async ({ quiet } = {}) => {
    if (!quiet) setRefreshing(true);
    try {
      const res = await services.telematics.getFleetPositions();
      setData(res);
      setLoadError(false);
      setUpdatedAt(new Date());
      if (!firstFit.current && res?.vehicles?.some((v) => v.position)) {
        firstFit.current = true;
        setFitKey((k) => k + 1);
      }
    } catch (error) {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load({ quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const vehicles = useMemo(() => data?.vehicles || [], [data]);
  const rows = useMemo(
    () => vehicles.filter((v) => matches(search, [v.licensePlate, `${v.brand} ${v.model}`, v.branchCode])),
    [vehicles, search]
  );

  const markers = useMemo(
    () =>
      vehicles
        .filter((v) => v.position)
        .map((v) => ({
          id: v.id,
          lat: v.position.latitude,
          lng: v.position.longitude,
          color: STATUS_COLORS[v.status] || "#64748b",
          label: v.licensePlate,
          title: `${v.licensePlate} · ${v.brand} ${v.model}`,
          course: v.position.course,
          moving: (v.position.speedKmh || 0) > 2,
        })),
    [vehicles]
  );

  const counts = useMemo(() => {
    const c = { AVAILABLE: 0, RENTED: 0, OTHER: 0 };
    for (const v of vehicles) {
      if (v.status === "AVAILABLE") c.AVAILABLE += 1;
      else if (v.status === "RENTED") c.RENTED += 1;
      else c.OTHER += 1;
    }
    return c;
  }, [vehicles]);

  const selectRow = (v) => {
    setSelectedId(v.id);
    if (v.position) setFocus({ lat: v.position.latitude, lng: v.position.longitude, key: `${v.id}-${Date.now()}` });
  };

  const confirmReason = async ({ reason, note }) => {
    if (!reasonFor) return;
    setGranting(true);
    try {
      await services.telematics.grantLocationAccess(reasonFor.id, { reason, note });
      const id = reasonFor.id;
      setReasonFor(null);
      const res = await services.telematics.getFleetPositions();
      setData(res);
      setUpdatedAt(new Date());
      const v = res?.vehicles?.find((x) => x.id === id);
      if (v) selectRow(v);
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || f("grantError"), "error");
    } finally {
      setGranting(false);
    }
  };

  if (loading) return <Loading height={500} />;

  const traccarError = data?.traccarError;

  return (
    <div className="fleet-map">
      <div className="fleet-map__header">
        <div>
          <h2 className="fleet-map__title">{f("title")}</h2>
          <div className="fleet-map__legend">
            <span className="tlm-pill" style={{ "--tlm-c": STATUS_COLORS.AVAILABLE }}>
              {t("vehicleStatus.AVAILABLE")} {counts.AVAILABLE}
            </span>
            <span className="tlm-pill" style={{ "--tlm-c": STATUS_COLORS.RENTED }}>
              {t("vehicleStatus.RENTED")} {counts.RENTED}
            </span>
            {counts.OTHER > 0 && (
              <span className="tlm-pill" style={{ "--tlm-c": STATUS_COLORS.OUT_OF_SERVICE }}>
                {f("other")} {counts.OTHER}
              </span>
            )}
          </div>
        </div>
        <div className="fleet-map__actions">
          {updatedAt && <span className="tlm-muted">{f("updatedAt", { time: formatTime(updatedAt, i18n.language) })}</span>}
          <Button variant="outline-secondary" size="sm" onClick={() => setShowLog(true)}>
            <BsJournalText /> {f("accessLog")}
          </Button>
          <Button variant="outline-primary" size="sm" disabled={refreshing} onClick={() => load()}>
            {refreshing ? <Spinner animation="border" size="sm" /> : <BsArrowClockwise />} {f("refresh")}
          </Button>
        </div>
      </div>

      {loadError && <Alert variant="danger">{t("telematics.errors.generic")}</Alert>}
      {traccarError && <Alert variant={traccarError === "TRACCAR_NOT_CONFIGURED" ? "info" : "warning"}>{t(traccarErrorKey(traccarError))}</Alert>}
      <p className="tlm-muted fleet-map__privacy">{f("privacy", { minutes: data?.grantMinutes || 30 })}</p>

      <div className="fleet-map__grid">
        <LeafletMap
          markers={markers}
          fitKey={fitKey}
          focus={focus}
          onMarkerClick={(id) => setSelectedId(id)}
          height="100%"
          className="fleet-map__map"
        />

        <aside className="fleet-map__list">
          <div className="fleet-map__search">
            <BsSearch />
            <input
              type="text"
              placeholder={f("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {vehicles.length === 0 && <div className="fleet-map__empty">{f("noTracked")}</div>}

          <ul>
            {rows.map((v) => {
              const stale = isStale(v.lastSeenAt);
              return (
                <li
                  key={v.id}
                  className={`fleet-map__row${selectedId === v.id ? " fleet-map__row--selected" : ""}`}
                >
                  <button type="button" className="fleet-map__row-main" onClick={() => selectRow(v)}>
                    <span className="fleet-map__row-top">
                      <span className="fleet-map__plate">{v.licensePlate}</span>
                      <span className="tlm-pill" style={{ "--tlm-c": STATUS_COLORS[v.status] || "#64748b" }}>
                        {t(`vehicleStatus.${v.status}`)}
                      </span>
                    </span>
                    <span className="fleet-map__model">
                      {v.brand} {v.model}
                      {v.branchCode ? ` · ${v.branchCode}` : ""}
                    </span>
                    <span className="fleet-map__row-meta">
                      {!v.deviceRegistered && !traccarError ? (
                        <span className="tlm-signal tlm-signal--stale">{t("telematics.device.notRegistered")}</span>
                      ) : (
                        <span className={`tlm-signal${stale ? " tlm-signal--stale" : ""}`}>
                          {agoText(v.lastSeenAt, t, i18n.language)}
                        </span>
                      )}
                      {v.position && (
                        <span>
                          {v.position.ignition === true
                            ? t("telematics.ignitionOn")
                            : v.position.ignition === false
                              ? t("telematics.ignitionOff")
                              : ""}
                          {(v.position.speedKmh || 0) > 0 ? ` · ${t("telematics.speed", { speed: v.position.speedKmh })}` : ""}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="fleet-map__row-actions">
                    {v.locationHidden && (
                      <>
                        <span className="tlm-hidden">
                          <BsEyeSlash /> {t("telematics.hidden.badge")}
                        </span>
                        <Button size="sm" variant="outline-warning" onClick={() => setReasonFor(v)}>
                          {t("telematics.hidden.show")}
                        </Button>
                      </>
                    )}
                    {v.grantUntil && (
                      <span className="tlm-muted">
                        {t("telematics.hidden.grantUntil", { time: formatTime(v.grantUntil, i18n.language) })}
                      </span>
                    )}
                    <Link to={`${routes.adminVehicles}/${v.id}?tab=location`} className="fleet-map__detail-link">
                      {f("details")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {data?.untrackedCount > 0 && (
            <div className="fleet-map__untracked tlm-muted">{f("untracked", { count: data.untrackedCount })}</div>
          )}
        </aside>
      </div>

      <AccessReasonModal
        show={!!reasonFor}
        intro={reasonFor ? t("telematics.reasonModal.introLive", { plate: reasonFor.licensePlate, minutes: data?.grantMinutes || 30 }) : ""}
        saving={granting}
        onHide={() => setReasonFor(null)}
        onConfirm={confirmReason}
      />

      <AccessLogModal show={showLog} onHide={() => setShowLog(false)} />
    </div>
  );
};

export default AdminFleetMapPage;
