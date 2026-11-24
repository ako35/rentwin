import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, ButtonGroup, Form, Spinner, Table } from "react-bootstrap";
import { BsArrowClockwise, BsCheck2, BsCheck2All, BsEnvelope, BsSearch } from "react-icons/bs";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import {
  ALERT_TYPES,
  agoText,
  alertText,
  alertTitle,
  formatDateTime,
  severityClass,
} from "../../../../components/admin/telematics/telematics-format";
import "../../../../components/admin/telematics/telematics.scss";
import "./style.scss";

const { routes } = constants;
const REFRESH_MS = 60000;

// GPS uyarıları (Faz 3): what the tracker events and the 5-minute check
// opened. Alerts carry no coordinates; a rented car's location still needs
// the reason flow on the map / Konum tab.
const AdminGpsAlertsPage = () => {
  const { t, i18n } = useTranslation("admin");
  const a = (key, opts) => t(`telematics.alerts.${key}`, opts);
  const lang = i18n.language;

  const [status, setStatus] = useState("open");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        services.telematics.getTelematicsAlerts({ status, ...(type ? { type } : {}), limit: 300 }),
        services.telematics.getGpsStatus().catch(() => null),
      ]);
      setData(list);
      if (st) setGps(st);
      setError("");
    } catch {
      setError(a("loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return (data?.items || []).filter(
      (r) => !q || `${r.licensePlate || ""} ${r.vehicleName || ""}`.toLocaleLowerCase("tr").includes(q)
    );
  }, [data, search]);

  const acknowledge = async (ids) => {
    setBusyId(ids.length === 1 ? ids[0] : "all");
    try {
      await services.telematics.acknowledgeTelematicsAlerts({ ids });
      await load();
    } catch {
      utils.functions.swalToast(a("ackError"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const acknowledgeAll = () => {
    const count = data?.openCount || 0;
    if (!count) return;
    utils.functions.swalQuestion(a("ackAllConfirm", { count }), "").then(async (result) => {
      if (!result.isConfirmed) return;
      setBusyId("all");
      try {
        await services.telematics.acknowledgeTelematicsAlerts({ all: true });
        await load();
      } catch {
        utils.functions.swalToast(a("ackError"), "error");
      } finally {
        setBusyId(null);
      }
    });
  };

  if (loading && !data) return <Loading height={320} />;

  return (
    <div className="gps-alerts">
      <div className="gps-alerts__header">
        <div>
          <h2 className="gps-alerts__title">{a("title")}</h2>
          <p className="tlm-muted mb-1">{a("hint")}</p>
          <div className="tlm-muted">
            {gps?.lastTickAt ? a("lastTick", { time: agoText(gps.lastTickAt, t, lang) }) : a("noTick")}
          </div>
        </div>
        <div className="gps-alerts__actions">
          <Button variant="outline-secondary" size="sm" onClick={() => load()} disabled={loading}>
            <BsArrowClockwise /> {t("telematics.fleetMap.refresh")}
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={acknowledgeAll}
            disabled={!data?.openCount || busyId === "all"}
          >
            {busyId === "all" ? <Spinner animation="border" size="sm" /> : <BsCheck2All />} {a("ackAll")}
          </Button>
        </div>
      </div>

      <div className="gps-alerts__filters">
        <ButtonGroup size="sm">
          <Button variant={status === "open" ? "primary" : "outline-primary"} onClick={() => setStatus("open")}>
            {a("statusOpen")} {data ? `(${data.openCount})` : ""}
          </Button>
          <Button variant={status === "all" ? "primary" : "outline-primary"} onClick={() => setStatus("all")}>
            {a("statusAll")}
          </Button>
        </ButtonGroup>
        <Form.Select size="sm" value={type} onChange={(e) => setType(e.target.value)} className="gps-alerts__type">
          <option value="">{a("allTypes")}</option>
          {ALERT_TYPES.map((key) => (
            <option key={key} value={key}>
              {alertTitle({ type: key }, t)}
            </option>
          ))}
        </Form.Select>
        <div className="gps-alerts__search">
          <BsSearch />
          <Form.Control
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={a("search")}
          />
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {data && data.trackedCount === 0 && <Alert variant="info">{a("noTracked")}</Alert>}

      {rows.length === 0 ? (
        <div className="gps-alerts__empty">{status === "open" ? a("empty") : a("emptyAll")}</div>
      ) : (
        <div className="table-responsive">
          <Table hover className="gps-alerts__table align-middle">
            <thead>
              <tr>
                <th>{a("col.time")}</th>
                <th>{a("col.vehicle")}</th>
                <th>{a("col.alert")}</th>
                <th>{a("col.contract")}</th>
                <th>{a("col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.acknowledgedAt ? "tlm-alert--acked" : ""}>
                  <td className="gps-alerts__time">
                    <span className={severityClass(r.severity)}>{a(`severity.${r.severity}`)}</span>
                    <div>{formatDateTime(r.occurredAt, lang)}</div>
                  </td>
                  <td>
                    <Link to={`${routes.adminVehicles}/${r.vehicleId}?tab=location`} className="gps-alerts__plate">
                      {r.licensePlate || "—"}
                    </Link>
                    {r.vehicleName && <div className="tlm-muted">{r.vehicleName}</div>}
                  </td>
                  <td>
                    <div className="tlm-alert__title">{alertTitle(r, t)}</div>
                    <div className="tlm-alert__text">{alertText(r, t, lang)}</div>
                  </td>
                  <td className={r.contractId ? "" : "gps-alerts__no-contract"}>
                    {r.contractId ? (
                      <Link to={`${routes.adminContracts}/${r.contractId}`}>{r.data?.contractNo || "→"}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="gps-alerts__status">
                    {r.acknowledgedAt ? (
                      <span className="tlm-muted">
                        {a("acked", { name: r.acknowledgedByName || "—" })}
                        <br />
                        {formatDateTime(r.acknowledgedAt, lang)}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline-success"
                        disabled={busyId === r.id}
                        onClick={() => acknowledge([r.id])}
                      >
                        {busyId === r.id ? <Spinner animation="border" size="sm" /> : <BsCheck2 />} {a("ack")}
                      </Button>
                    )}
                    {r.emailedAt && (
                      <div className="tlm-muted gps-alerts__mailed" title={formatDateTime(r.emailedAt, lang)}>
                        <BsEnvelope /> {a("emailed")}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminGpsAlertsPage;
