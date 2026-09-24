import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import ReactInputMask from "react-input-mask-next";
import { BsShieldCheck, BsShieldExclamation, BsShieldFillCheck, BsBoxArrowRight } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { kbsStatus } from "../contract-helpers";
import "./kbs-section.scss";

const DATE_DISPLAY = "DD.MM.YYYY";
const DATE_STORE = "YYYY-MM-DD";

// Left card: KABİS (Kimlik Bildirme Sistemi) lifecycle for this rental —
// filing (giriş) then release (çıkış). Both are saved with the contract on
// "Kaydet"; the acting admin's name is stamped server-side on each transition.
// A filed-but-not-released contract cannot be closed (see page.jsx return flow).
// The operator manages an open-ended list of KABİS portals from Ayarlar
// (see admin/settings/page.jsx) and picks which one a given rental was
// actually filed under — stored as a name snapshot on the contract
// (kbsSystem), so renaming/deleting a portal later never touches past rows.
const KbsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.kbs.${key}`);

  const [systemNames, setSystemNames] = useState([]);

  useEffect(() => {
    services.kabisSystem
      .getKabisSystems()
      .then((rows) => setSystemNames((rows || []).map((r) => r.name)))
      .catch(() => {});
  }, []);

  // The contract may already carry a system name that's since been renamed
  // or deleted from Ayarlar — keep it selectable so a save never silently
  // swaps it for whatever the dropdown's first live option happens to be.
  const currentSystem = formik.values.kbsSystem;
  const systemOptions =
    currentSystem && !systemNames.includes(currentSystem)
      ? [...systemNames, currentSystem]
      : systemNames;

  const reportedAt = formik.values.kbsNotifiedAt || "";
  const releasedAt = formik.values.kbsReleasedAt || "";
  const status = kbsStatus(formik.values);
  const released = status === "released";

  // The date is typed by hand (GG.AA.YYYY) rather than picked from the native
  // <input type="date"> widget, whose click target for typing vs. opening the
  // calendar popup is unreliable across browsers. Local display state only
  // pushes into formik (as YYYY-MM-DD) once a full, valid date is typed.
  const [dateInput, setDateInput] = useState(
    reportedAt ? moment(reportedAt, DATE_STORE).format(DATE_DISPLAY) : ""
  );
  useEffect(() => {
    setDateInput(reportedAt ? moment(reportedAt, DATE_STORE).format(DATE_DISPLAY) : "");
  }, [reportedAt]);

  const handleDateInput = (e) => {
    const raw = e.target.value;
    setDateInput(raw);
    if (raw.replace(/[^0-9]/g, "").length !== 8) return;
    const parsed = moment(raw, DATE_DISPLAY, true);
    if (parsed.isValid()) formik.setFieldValue("kbsNotifiedAt", parsed.format(DATE_STORE));
  };

  const toggleReport = (checked) => {
    formik.setFieldValue("kbsNotifiedAt", checked ? moment().format("YYYY-MM-DD") : "");
    if (checked && !formik.values.kbsSystem) {
      formik.setFieldValue("kbsSystem", systemNames[0] || "");
    }
    if (!checked) {
      formik.setFieldValue("kbsNotifiedBy", "");
      formik.setFieldValue("kbsReleasedAt", "");
      formik.setFieldValue("kbsReleasedBy", "");
      formik.setFieldValue("kbsSystem", "");
    }
  };

  const release = async () => {
    const res = await utils.functions.swalQuestion(c("releaseConfirmTitle"), c("releaseConfirmText"));
    if (!res.isConfirmed) return;
    formik.setFieldValue("kbsReleasedAt", moment().toISOString());
  };

  const undoRelease = () => {
    formik.setFieldValue("kbsReleasedAt", "");
    formik.setFieldValue("kbsReleasedBy", "");
  };

  const badgeText = { pending: c("statusPending"), reported: c("statusDone"), released: c("statusReleased") }[status];
  const BadgeIcon = { pending: BsShieldExclamation, reported: BsShieldCheck, released: BsShieldFillCheck }[status];

  return (
    <section className={`contract-card contract-page__kbs is-${status}`}>
      <h3>{c("title")}</h3>

      <div className="contract-page__kbs-row">
        <Form.Check
          type="switch"
          id="kbs-entered"
          label={c("statusLabel")}
          checked={status !== "pending"}
          disabled={released}
          onChange={(e) => toggleReport(e.target.checked)}
        />
        <span className={`contract-page__kbs-badge is-${status}`}>
          <BadgeIcon />
          {badgeText}
        </span>
      </div>

      {status === "pending" ? (
        <p className="contract-page__kbs-hint">{c("hint")}</p>
      ) : (
        <div className="contract-page__kbs-track">
          <div className="contract-page__kbs-fields">
            <label className="contract-page__kbs-date">
              <span>{c("dateLabel")}</span>
              <Form.Control
                as={ReactInputMask}
                mask="99.99.9999"
                type="text"
                placeholder={c("datePlaceholder")}
                value={dateInput}
                disabled={released}
                onChange={handleDateInput}
              />
            </label>

            <label className="contract-page__kbs-date">
              <span>{c("systemLabel")}</span>
              <Form.Select
                value={formik.values.kbsSystem || ""}
                disabled={released}
                onChange={(e) => formik.setFieldValue("kbsSystem", e.target.value)}
              >
                {systemOptions.length === 0 && <option value="">{c("noSystemsOption")}</option>}
                {systemOptions.filter(Boolean).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Form.Select>
            </label>
          </div>

          {status === "reported" && (
            <button type="button" className="contract-page__kbs-release" onClick={release}>
              <BsBoxArrowRight /> {c("releaseAction")}
            </button>
          )}

          {released && (
            <div className="contract-page__kbs-released">
              <p className="contract-page__kbs-stamp">
                {c("releasedDate")}: {moment(releasedAt).format("DD.MM.YYYY HH:mm")}
              </p>
              <button type="button" className="contract-page__kbs-undo" onClick={undoRelease}>
                {c("releaseUndo")}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default KbsSection;
