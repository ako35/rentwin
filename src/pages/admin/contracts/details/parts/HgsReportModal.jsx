import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { BsPrinter } from "react-icons/bs";
import { services } from "../../../../../services";
import LeafletMap from "../../../../../components/admin/telematics/leaflet-map";
import AccessReasonModal from "../../../../../components/admin/telematics/access-reason-modal";
import { ROUTE_COLORS, formatDateTime } from "../../../../../components/admin/telematics/telematics-format";
import "./hgs-report-modal.scss";

const WINDOWS = [15, 30, 60, 120];
const PRINT_CLASS = "hgs-report-printing";

// One route point per minute for the printed table.
const perMinute = (points) => {
  const out = [];
  let last = null;
  for (const p of points) {
    const minute = String(p[2]).slice(0, 16);
    if (minute !== last) {
      out.push(p);
      last = minute;
    }
  }
  return out;
};

// HGS/OGS dispute (GPS takip Faz 4): the operator enters the disputed toll
// pass time; the backend returns the route around it (reason required,
// logged) and this renders a printable report with the map, the record
// closest to the pass and a per-minute table.
const HgsReportModal = ({ show, onHide, contractId }) => {
  const { t, i18n } = useTranslation("admin");
  const h = (key, opts) => t(`telematics.hgsReport.${key}`, opts);
  const lang = i18n.language;

  const [at, setAt] = useState("");
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [tollName, setTollName] = useState("");
  const [formError, setFormError] = useState("");
  const [askReason, setAskReason] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (show) {
      setFormError("");
      setReport(null);
    }
  }, [show]);

  useEffect(() => {
    const clear = () => document.body.classList.remove(PRINT_CLASS);
    window.addEventListener("afterprint", clear);
    return () => {
      window.removeEventListener("afterprint", clear);
      clear();
    };
  }, []);

  const startCreate = (e) => {
    e.preventDefault();
    const date = new Date(at);
    if (!at || Number.isNaN(date.getTime())) {
      setFormError(h("badAt"));
      return;
    }
    setFormError("");
    setAskReason(true);
  };

  const create = async (reasonPayload) => {
    setLoading(true);
    try {
      const res = await services.telematics.getHgsReport(contractId, {
        at: new Date(at).toISOString(),
        windowMinutes,
        tollName: tollName.trim(),
        ...reasonPayload,
      });
      setReport(res);
      setAskReason(false);
    } catch (error) {
      setFormError(error?.response?.data?.message || t("telematics.errors.generic"));
      setAskReason(false);
    } finally {
      setLoading(false);
    }
  };

  const print = () => {
    document.body.classList.add(PRINT_CLASS);
    // Let the class apply before the dialog snapshots the page.
    setTimeout(() => window.print(), 50);
  };

  const routes = useMemo(
    () =>
      (report?.segments || []).map((s, i) => ({
        id: `${s.carId}-${i}`,
        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
        points: (s.points || []).map((p) => [p[0], p[1]]),
      })),
    [report]
  );
  const markers = useMemo(() => {
    const p = report?.atPosition;
    return p
      ? [{ id: "pass", lat: p.latitude, lng: p.longitude, color: "#b91c1c", label: h("passMarker"), moving: false }]
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);
  const rows = useMemo(() => perMinute((report?.segments || []).flatMap((s) => s.points || [])), [report]);
  const plates = [...new Set((report?.segments || []).map((s) => s.licensePlate).filter(Boolean))].join(", ");
  const distanceKm = (report?.segments || []).reduce((sum, s) => sum + (s.summary?.distanceKm || 0), 0);

  const offsetText = (seconds) =>
    seconds === 0
      ? h("offsetExact")
      : seconds < 0
        ? h("offsetBefore", { seconds: Math.abs(seconds) })
        : h("offsetAfter", { seconds });

  return (
    <>
      <Modal show={show && !report} onHide={onHide} centered>
        <Form onSubmit={startCreate}>
          <Modal.Header closeButton>
            <Modal.Title>{h("button")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="tlm-muted">{h("formIntro")}</p>
            <Form.Group className="mb-2">
              <Form.Label>{h("at")}</Form.Label>
              <Form.Control type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>{h("window")}</Form.Label>
              <Form.Select value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}>
                {WINDOWS.map((m) => (
                  <option key={m} value={m}>
                    {h("windowOption", { minutes: m })}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>{h("tollName")}</Form.Label>
              <Form.Control
                value={tollName}
                maxLength={120}
                placeholder={h("tollNamePlaceholder")}
                onChange={(e) => setTollName(e.target.value)}
              />
            </Form.Group>
            {formError && (
              <Alert variant="danger" className="mt-3 mb-0">
                {formError}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={onHide}>
              {h("close")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner animation="border" size="sm" />} {h("create")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <AccessReasonModal
        show={askReason}
        intro={h("reasonIntro")}
        submitLabel={h("create")}
        saving={loading}
        defaultReason="HGS_DISPUTE"
        onHide={() => setAskReason(false)}
        onConfirm={create}
      />

      <Modal show={show && !!report} onHide={onHide} size="xl" centered className="hgs-report-modal">
        <Modal.Header closeButton>
          <Modal.Title>{h("title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {report && (
            <div className="hgs-report">
              <h2 className="hgs-report__print-title">{h("title")}</h2>
              <Table size="sm" bordered className="hgs-report__facts">
                <tbody>
                  <tr>
                    <th>{h("contract")}</th>
                    <td>{report.contractNo || "—"}</td>
                    <th>{h("plate")}</th>
                    <td>{plates || "—"}</td>
                  </tr>
                  <tr>
                    <th>{h("passTime")}</th>
                    <td>{formatDateTime(report.at, lang)}</td>
                    <th>{h("tollName")}</th>
                    <td>{report.tollName || "—"}</td>
                  </tr>
                  <tr>
                    <th>{h("range")}</th>
                    <td>
                      {formatDateTime(report.from, lang)} – {formatDateTime(report.to, lang)}
                    </td>
                    <th>{h("distance")}</th>
                    <td>{distanceKm.toLocaleString(lang, { maximumFractionDigits: 1 })} km</td>
                  </tr>
                  <tr>
                    <th>{h("nearest")}</th>
                    <td colSpan={3}>
                      {report.atPosition ? (
                        <>
                          <strong>{formatDateTime(report.atPosition.fixTime, lang)}</strong> (
                          {offsetText(report.atPosition.offsetSeconds)}) ·{" "}
                          {t("telematics.speed", { speed: report.atPosition.speedKmh })} · {h("coords")}:{" "}
                          {report.atPosition.latitude.toFixed(5)}, {report.atPosition.longitude.toFixed(5)}
                        </>
                      ) : (
                        h("noNearest")
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>

              <LeafletMap routes={routes} markers={markers} fitKey={report.generatedAt} height={380} />

              <h4 className="hgs-report__subhead">{h("points")}</h4>
              {rows.length === 0 ? (
                <p className="tlm-muted">{h("noNearest")}</p>
              ) : (
                <Table size="sm" striped className="hgs-report__points">
                  <thead>
                    <tr>
                      <th>{h("time")}</th>
                      <th>{h("speed")}</th>
                      <th>{h("lat")}</th>
                      <th>{h("lng")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p[2]}>
                        <td>{formatDateTime(p[2], lang)}</td>
                        <td>{t("telematics.speed", { speed: p[3] })}</td>
                        <td>{Number(p[0]).toFixed(5)}</td>
                        <td>{Number(p[1]).toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <p className="hgs-report__footnote">
                {h("generated", { name: report.generatedBy, time: formatDateTime(report.generatedAt, lang) })}
                <br />
                {h("footnote")}
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>
            {h("close")}
          </Button>
          <Button onClick={print}>
            <BsPrinter /> {h("print")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HgsReportModal;
