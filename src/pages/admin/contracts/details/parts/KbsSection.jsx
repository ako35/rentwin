import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import ReactInputMask from "react-input-mask-next";
import {
  BsShieldCheck,
  BsShieldExclamation,
  BsShieldFillCheck,
  BsBoxArrowRight,
  BsCalendarEvent,
  BsExclamationTriangleFill,
} from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { kbsStatus, kabisSystemFor } from "../contract-helpers";
import "./kbs-section.scss";

const DATE_DISPLAY = "DD.MM.YYYY";
const DATE_STORE = "YYYY-MM-DD";

// Left card: KABİS (Kimlik Bildirme Sistemi) lifecycle for this rental —
// filing (giriş) then release (çıkış). Filing/date/system edits are saved
// with the contract on "Kaydet"; the acting admin's name is stamped
// server-side on each transition. A filed-but-not-released contract no
// longer blocks closing the contract (see contract-helpers' kbsStatus) — so
// the release action (and only that action) stays live even once the
// contract is closed, `locked` is true, and "Kaydet" itself has disappeared;
// `onReleaseLocked` patches the release straight through instead.
// The operator manages an open-ended list of KABİS portals from Ayarlar
// (see admin/settings/page.jsx) and picks which one a given rental was
// actually filed under — stored as a name snapshot on the contract
// (kbsSystem), so renaming/deleting a portal later never touches past rows.
// The portal defaults to the one belonging to the contract's lessor company
// (kabisSystemFor) and follows that company if it changes, unless the
// operator has picked a different portal by hand.
//
// A mid-contract vehicle swap (VehicleChangeTab) needs two more KABİS steps:
// release the previous car's record and file the new car. Once the rental is
// filed, each swap gets its own pair of switches here, saved straight away
// (not with "Kaydet", so it also works on a closed contract) and stamped with
// the acting admin; open ones also list on the dashboard's KABİS tab.
const plateOf = (label) => String(label || "").split(" — ").pop();

const KbsSection = ({ formik, locked = false, onReleaseLocked, contractId, vehicleChanges = [] }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.kbs.${key}`, opts);

  const [systemNames, setSystemNames] = useState([]);
  const [releasing, setReleasing] = useState(false);
  const [swaps, setSwaps] = useState(vehicleChanges);
  const [savingSwap, setSavingSwap] = useState(null);

  useEffect(() => {
    setSwaps(vehicleChanges);
  }, [vehicleChanges]);

  const toggleSwapStep = async (swap, key, checked) => {
    setSavingSwap(`${swap.id}:${key}`);
    try {
      const updated = await services.contract.updateVehicleChangeKbs(contractId, swap.id, { [key]: checked });
      setSwaps((list) => list.map((s) => (s.id === swap.id ? { ...s, ...updated } : s)));
      utils.functions.swalToast(c("swapSaved"), "success", 2500);
    } catch {
      utils.functions.swalToast(c("swapError"), "error");
    } finally {
      setSavingSwap(null);
    }
  };

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
  // Filing/date/system stay read-only once the contract is closed — only the
  // release button below is exempt from `locked`.
  const fieldsDisabled = released || locked;

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

  // A hidden native <input type="date"> backs the calendar-icon button —
  // its own picker UI does the actual day-grid picking, and its onChange
  // (already YYYY-MM-DD) writes straight to formik; the masked text above
  // re-syncs from `reportedAt` via the effect above.
  const nativeDateRef = useRef(null);
  const openPicker = () => {
    const el = nativeDateRef.current;
    if (!el || fieldsDisabled) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const lessorCompany = formik.values.lessorCompany;

  // The lessor company changed on the form while the rental is filed: move
  // the portal along with it, but only if it still shows the previous
  // company's portal (or none). A portal picked by hand stays as it is.
  const prevLessorRef = useRef(lessorCompany);
  useEffect(() => {
    const prevLessor = prevLessorRef.current;
    prevLessorRef.current = lessorCompany;
    if (prevLessor === lessorCompany || fieldsDisabled || status === "pending") return;
    const next = kabisSystemFor(lessorCompany, systemNames);
    const current = formik.values.kbsSystem;
    if (next && (!current || current === kabisSystemFor(prevLessor, systemNames))) {
      formik.setFieldValue("kbsSystem", next);
    }
    // Reacts to the company changing only; formik itself is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessorCompany]);

  const toggleReport = (checked) => {
    formik.setFieldValue("kbsNotifiedAt", checked ? moment().format("YYYY-MM-DD") : "");
    if (checked && !formik.values.kbsSystem) {
      formik.setFieldValue("kbsSystem", kabisSystemFor(lessorCompany, systemNames) || systemNames[0] || "");
    }
    if (!checked) {
      formik.setFieldValue("kbsNotifiedBy", "");
      formik.setFieldValue("kbsReleasedAt", "");
      formik.setFieldValue("kbsReleasedBy", "");
      formik.setFieldValue("kbsSystem", "");
    }
  };

  const release = async () => {
    const res = await utils.functions.swalQuestion(
      c("releaseConfirmTitle"),
      locked ? c("releaseConfirmTextClosed") : c("releaseConfirmText")
    );
    if (!res.isConfirmed) return;
    if (locked) {
      setReleasing(true);
      try {
        await onReleaseLocked();
      } finally {
        setReleasing(false);
      }
      return;
    }
    formik.setFieldValue("kbsReleasedAt", moment().toISOString());
  };

  const undoRelease = () => {
    formik.setFieldValue("kbsReleasedAt", "");
    formik.setFieldValue("kbsReleasedBy", "");
  };

  const badgeText = { pending: c("statusPending"), reported: c("statusDone"), released: c("statusReleased") }[status];
  const showSwaps = status !== "pending" && swaps.length > 0;
  const swapPending = showSwaps && swaps.some((s) => !s.kbsOldReleasedAt || !s.kbsNewNotifiedAt);
  const stamp = (by, at) => c("swapStamp", { name: by || "—", date: moment(at).format("DD.MM.YYYY HH:mm") });
  const BadgeIcon = { pending: BsShieldExclamation, reported: BsShieldCheck, released: BsShieldFillCheck }[status];

  return (
    <section className={`contract-card contract-page__kbs is-${status}${swapPending ? " has-swap-pending" : ""}`}>
      <h3>{c("title")}</h3>

      <div className="contract-page__kbs-row">
        <Form.Check
          type="switch"
          id="kbs-entered"
          label={c("statusLabel")}
          checked={status !== "pending"}
          disabled={fieldsDisabled}
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
          {locked && status === "reported" && (
            <p className="contract-page__kbs-warn">
              <BsExclamationTriangleFill /> {c("closedWarning")}
            </p>
          )}

          <div className="contract-page__kbs-fields">
            <label className="contract-page__kbs-date">
              <span>{c("dateLabel")}</span>
              <div className="contract-page__kbs-date-input">
                <Form.Control
                  as={ReactInputMask}
                  mask="99.99.9999"
                  type="text"
                  placeholder={c("datePlaceholder")}
                  value={dateInput}
                  disabled={fieldsDisabled}
                  onChange={handleDateInput}
                />
                <button
                  type="button"
                  className="contract-page__kbs-date-pick"
                  aria-label={c("datePickAria")}
                  disabled={fieldsDisabled}
                  onClick={openPicker}
                >
                  <BsCalendarEvent />
                </button>
                <input
                  ref={nativeDateRef}
                  type="date"
                  className="contract-page__kbs-date-native"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={reportedAt}
                  disabled={fieldsDisabled}
                  onChange={(e) => formik.setFieldValue("kbsNotifiedAt", e.target.value)}
                />
              </div>
            </label>

            <label className="contract-page__kbs-date">
              <span>{c("systemLabel")}</span>
              <Form.Select
                value={formik.values.kbsSystem || ""}
                disabled={fieldsDisabled}
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
            <button
              type="button"
              className="contract-page__kbs-release"
              disabled={releasing}
              onClick={release}
            >
              <BsBoxArrowRight /> {c("releaseAction")}
            </button>
          )}

          {released && (
            <div className="contract-page__kbs-released">
              <p className="contract-page__kbs-stamp">
                {c("releasedDate")}: {moment(releasedAt).format("DD.MM.YYYY HH:mm")}
              </p>
              <button
                type="button"
                className="contract-page__kbs-undo"
                disabled={locked}
                onClick={undoRelease}
              >
                {c("releaseUndo")}
              </button>
            </div>
          )}
        </div>
      )}

      {showSwaps && (
        <div className="contract-page__kbs-swaps">
          {swaps.map((swap) => {
            const steps = [
              { key: "oldReleased", at: swap.kbsOldReleasedAt, by: swap.kbsOldReleasedBy, label: c("swapOld", { plate: plateOf(swap.previousCarLabel) }) },
              { key: "newNotified", at: swap.kbsNewNotifiedAt, by: swap.kbsNewNotifiedBy, label: c("swapNew", { plate: plateOf(swap.newCarLabel) }) },
            ];
            return (
              <div key={swap.id} className="contract-page__kbs-swap">
                <p className="contract-page__kbs-swap-head">
                  {c("swapTitle")} · {moment.utc(swap.changeDate).format("DD.MM.YYYY HH:mm")}
                </p>
                {steps.map((step) => (
                  <div key={step.key} className={`contract-page__kbs-swap-step${step.at ? " is-done" : ""}`}>
                    <Form.Check
                      type="switch"
                      id={`kbs-swap-${swap.id}-${step.key}`}
                      label={step.label}
                      checked={!!step.at}
                      disabled={savingSwap === `${swap.id}:${step.key}`}
                      onChange={(e) => toggleSwapStep(swap, step.key, e.target.checked)}
                    />
                    {step.at && <span className="contract-page__kbs-swap-stamp">{stamp(step.by, step.at)}</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default KbsSection;
