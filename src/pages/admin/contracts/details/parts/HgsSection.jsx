import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import moment from "moment/moment";
import { BsClockHistory, BsPatchCheck, BsBoxArrowUpRight } from "react-icons/bs";
import { utils } from "../../../../../utils";

const STATUSES = ["PENDING", "CLEAN", "DEBT"];
const HGS_PORTAL = "https://hgs.ptt.gov.tr/";

// Left card: HGS / OGS operational check. Pure audit — "was the toll query run
// for the whole rental period, and what was the outcome?". No amount here; a
// toll that needs charging goes on the "Dönüş Ekstra" tab. "Kontrolü Onayla"
// stamps the confirmation time; the backend records who confirmed it.
const HgsSection = ({ formik, billableDays }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.hgs.${key}`, opts);
  const v = formik.values;

  const status = v.hgsStatus || "PENDING";
  const done = status !== "PENDING";
  const badgeState = done ? "done" : "pending";

  const rentalEnd = v.returnedAt ? moment(v.returnedAt).format("YYYY-MM-DD") : v.dropOffDate;
  const period =
    v.pickUpDate && rentalEnd
      ? `${moment(v.pickUpDate).format("DD.MM.YYYY")} — ${moment(rentalEnd).format("DD.MM.YYYY")}`
      : "—";

  const changeStatus = (next) => {
    formik.setFieldValue("hgsStatus", next === "PENDING" ? "" : next);
    if (next === "PENDING") {
      formik.setFieldValue("hgsCheckedAt", "");
      formik.setFieldValue("hgsCheckedBy", "");
      formik.setFieldValue("hgsNote", "");
    }
  };

  const confirm = async () => {
    const res = await utils.functions.swalQuestion(c("confirmTitle"), c("confirmText"));
    if (!res.isConfirmed) return;
    formik.setFieldValue("hgsCheckedAt", moment().toISOString());
  };

  return (
    <section className={`contract-card contract-page__hgs is-${badgeState}`}>
      <h3>
        <span>{c("title")}</span>
        <span className={`contract-page__hgs-badge is-${badgeState}`}>
          {done ? <BsPatchCheck /> : <BsClockHistory />}
          {done ? c("badgeDone") : c("badgePending")}
        </span>
      </h3>

      <div className="contract-page__hgs-period">
        <span>{c("period")}</span>
        <strong>
          {period}
          {billableDays ? ` · ${c("days", { count: billableDays })}` : ""}
        </strong>
      </div>

      <label className="contract-page__hgs-field">
        <span>{c("result")}</span>
        <Form.Select value={status} onChange={(e) => changeStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{c(`status.${s}`)}</option>
          ))}
        </Form.Select>
      </label>

      {done && (
        <label className="contract-page__hgs-field">
          <span>{c("note")}</span>
          <Form.Control
            value={v.hgsNote}
            onChange={(e) => formik.setFieldValue("hgsNote", e.target.value)}
            placeholder={c("notePlaceholder")}
          />
        </label>
      )}

      {v.hgsCheckedAt && (
        <p className="contract-page__hgs-stamp">
          {c("lastChecked")}: {moment(v.hgsCheckedAt).format("DD.MM.YYYY HH:mm")}
          {v.hgsCheckedBy ? ` · ${v.hgsCheckedBy}` : ""}
        </p>
      )}

      <div className="contract-page__hgs-actions">
        <a href={HGS_PORTAL} target="_blank" rel="noopener noreferrer" className="contract-page__hgs-portal">
          <BsBoxArrowUpRight /> {c("openPortal")}
        </a>
        {done && (
          <button type="button" className="contract-page__hgs-confirm" onClick={confirm}>
            {v.hgsCheckedAt ? c("reconfirm") : c("confirm")}
          </button>
        )}
      </div>

      <p className="contract-page__hgs-hint">{c("amountHint")}</p>
    </section>
  );
};

export default HgsSection;
