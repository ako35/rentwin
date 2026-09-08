import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { BsClockHistory, BsPatchCheck, BsBoxArrowUpRight, BsPlusLg } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";

const STATUSES = ["PENDING", "CLEAN", "DEBT"];
const HGS_PORTAL = "https://hgs.ptt.gov.tr/";

// Left card: HGS / OGS operational check — pure audit. The result dropdown
// (Bekliyor / Tam Kontrol Edildi / Geçiş Var) is a contract field; below it a
// log of every date range queried on the HGS portal (each row records who ran
// it and when, stamped server-side). Toll amounts go on the Dönüş Ekstra tab.
const HgsSection = ({ formik, contractId, billableDays }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.hgs.${key}`, opts);
  const rc = (key) => t(`reservations.contract.records.${key}`);
  const v = formik.values;

  const status = v.hgsStatus || "PENDING";
  const done = status !== "PENDING";

  const rentalStart = v.pickUpDate;
  const rentalEnd = v.returnedAt ? moment(v.returnedAt).format("YYYY-MM-DD") : v.dropOffDate;
  const period =
    rentalStart && rentalEnd
      ? `${moment(rentalStart).format("DD.MM.YYYY")} — ${moment(rentalEnd).format("DD.MM.YYYY")}`
      : "—";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ rangeFrom: "", rangeTo: "", note: "" });

  const load = () => {
    if (!contractId) return;
    setLoading(true);
    services.contract
      .getRecords(contractId, "hgsChecks")
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const startAdd = () => {
    setForm({ rangeFrom: rentalStart || "", rangeTo: rentalEnd || "", note: "" });
    setOpen(true);
  };
  const cancel = () => {
    setOpen(false);
    setForm({ rangeFrom: "", rangeTo: "", note: "" });
  };

  const submit = async () => {
    if (saving || !form.rangeFrom || !form.rangeTo) return;
    setSaving(true);
    try {
      await services.contract.addRecord(contractId, "hgsChecks", {
        rangeFrom: form.rangeFrom,
        rangeTo: form.rangeTo,
        note: form.note.trim() || undefined,
      });
      cancel();
      load();
    } catch {
      utils.functions.swalToast(rc("error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = (row) => {
    utils.functions
      .swalQuestion(rc("deleteConfirm"), rc("deleteConfirmText"), { danger: true })
      .then(async (r) => {
        if (!r.isConfirmed) return;
        try {
          await services.contract.deleteRecord("hgsChecks", row.id);
          load();
        } catch {
          utils.functions.swalToast(rc("error"), "error");
        }
      });
  };

  return (
    <section className={`contract-card contract-page__hgs is-${done ? "done" : "pending"}`}>
      <h3>
        <span>{c("title")}</span>
        <span className={`contract-page__hgs-badge is-${done ? "done" : "pending"}`}>
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
        <Form.Select
          value={status}
          onChange={(e) =>
            formik.setFieldValue("hgsStatus", e.target.value === "PENDING" ? "" : e.target.value)
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{c(`status.${s}`)}</option>
          ))}
        </Form.Select>
      </label>

      <div className="contract-page__hgs-log">
        <div className="contract-page__hgs-log-head">
          <span>{c("logTitle")}</span>
          {!open && (
            <button type="button" className="contract-page__hgs-add" onClick={startAdd}>
              <BsPlusLg /> {c("addLog")}
            </button>
          )}
        </div>

        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : rows.length === 0 && !open ? (
          <p className="contract-page__hgs-empty">{c("logEmpty")}</p>
        ) : (
          <ul className="contract-page__hgs-rows">
            {rows.map((row) => (
              <li key={row.id}>
                <span className="contract-page__hgs-range">
                  {moment(row.rangeFrom).format("DD.MM.YYYY")}–{moment(row.rangeTo).format("DD.MM.YYYY")}
                </span>
                <span className="contract-page__hgs-meta">
                  {moment(row.createdAt).format("DD.MM HH:mm")}
                  {row.checkedBy ? ` · ${row.checkedBy}` : ""}
                  {row.note ? ` · ${row.note}` : ""}
                </span>
                <button type="button" onClick={() => remove(row)}>{rc("delete")}</button>
              </li>
            ))}
          </ul>
        )}

        {open && (
          <div
            className="contract-page__hgs-form"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                submit();
              }
            }}
          >
            <div className="contract-page__hgs-form-range">
              <label>
                <span>{c("from")}</span>
                <Form.Control
                  type="date"
                  value={form.rangeFrom}
                  onChange={(e) => setForm({ ...form, rangeFrom: e.target.value })}
                />
              </label>
              <label>
                <span>{c("to")}</span>
                <Form.Control
                  type="date"
                  value={form.rangeTo}
                  min={form.rangeFrom || undefined}
                  onChange={(e) => setForm({ ...form, rangeTo: e.target.value })}
                />
              </label>
            </div>
            <label className="contract-page__hgs-field">
              <span>{c("note")}</span>
              <Form.Control
                value={form.note}
                placeholder={c("notePlaceholder")}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
            <div className="contract-page__hgs-form-actions">
              <Button type="button" variant="outline-secondary" size="sm" onClick={cancel}>
                {rc("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || !form.rangeFrom || !form.rangeTo}
                onClick={submit}
              >
                {saving && <Spinner animation="border" size="sm" />} {rc("add")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="contract-page__hgs-actions">
        <a
          href={HGS_PORTAL}
          target="_blank"
          rel="noopener noreferrer"
          className="contract-page__hgs-portal"
        >
          <BsBoxArrowUpRight /> {c("openPortal")}
        </a>
      </div>
      <p className="contract-page__hgs-hint">{c("amountHint")}</p>
    </section>
  );
};

export default HgsSection;
