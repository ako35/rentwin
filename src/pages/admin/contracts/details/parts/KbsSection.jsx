import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import { BsShieldCheck, BsShieldExclamation, BsShieldFillCheck, BsBoxArrowRight } from "react-icons/bs";
import moment from "moment/moment";
import { utils } from "../../../../../utils";
import { kbsStatus } from "../contract-helpers";

// Left card: KABİS (Kimlik Bildirme Sistemi) lifecycle for this rental —
// filing (giriş) then release (çıkış). Both are saved with the contract on
// "Kaydet"; the acting admin's name is stamped server-side on each transition.
// A filed-but-not-released contract cannot be closed (see page.jsx return flow).
const KbsSection = ({ formik }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.kbs.${key}`);

  const reportedAt = formik.values.kbsNotifiedAt || "";
  const reportedBy = formik.values.kbsNotifiedBy || "";
  const releasedAt = formik.values.kbsReleasedAt || "";
  const releasedBy = formik.values.kbsReleasedBy || "";
  const status = kbsStatus(formik.values);
  const released = status === "released";

  const toggleReport = (checked) => {
    formik.setFieldValue("kbsNotifiedAt", checked ? moment().format("YYYY-MM-DD") : "");
    if (!checked) {
      formik.setFieldValue("kbsNotifiedBy", "");
      formik.setFieldValue("kbsReleasedAt", "");
      formik.setFieldValue("kbsReleasedBy", "");
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
          <label className="contract-page__kbs-date">
            <span>{c("dateLabel")}</span>
            <Form.Control
              type="date"
              value={reportedAt}
              disabled={released}
              onChange={(e) => formik.setFieldValue("kbsNotifiedAt", e.target.value)}
            />
          </label>
          {reportedBy && (
            <p className="contract-page__kbs-stamp">
              {c("filedBy")}: {reportedBy}
            </p>
          )}

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
              {releasedBy && (
                <p className="contract-page__kbs-stamp">
                  {c("releasedBy")}: {releasedBy}
                </p>
              )}
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
