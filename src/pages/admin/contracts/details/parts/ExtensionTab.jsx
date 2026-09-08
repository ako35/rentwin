import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";

const EMPTY_EXT_FORM = { date: "", time: "", extraAmount: "", note: "" };
const day = (d) => (d ? moment.utc(d).format("DD.MM.YYYY") : "—");

// Sub tab: "A Yöntemi" billing periods. Extending closes the active period and
// opens the next one spanning [old drop-off, new drop-off], priced from the
// contract's current rate (8th->8th = one full month). A blank amount auto-fills
// the full period price.
const ExtensionTab = ({ isCreate, contractId, minDate, periods = [], isMonthly, onExtended, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const [form, setForm] = useState(EMPTY_EXT_FORM);
  const [extending, setExtending] = useState(false);

  const extend = async () => {
    if (!form.date) return;
    setExtending(true);
    try {
      await services.contract.extendContract(contractId, {
        newDropOff: utils.functions.combineDateAndTime(form.date, form.time || "10:00"),
        extraAmount: form.extraAmount,
        note: form.note,
      });
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
      setForm(EMPTY_EXT_FORM);
      onExtended();
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setExtending(false);
    }
  };

  if (isCreate) return <SaveFirstHint />;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <div className="contract-records__form">
        <div className="contract-records__fields">
          <Form.Group>
            <Form.Label>{c("extension.newDropOffDate")}</Form.Label>
            <Form.Control type="date" size="sm" value={form.date} min={minDate} onChange={setField("date")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("extension.newDropOffTime")}</Form.Label>
            <Form.Control type="time" size="sm" value={form.time} onChange={setField("time")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{isMonthly ? c("extension.extraAmountMonthly") : c("extension.extraAmount")}</Form.Label>
            <Form.Control type="number" size="sm" value={form.extraAmount} onChange={setField("extraAmount")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("extension.note")}</Form.Label>
            <Form.Control size="sm" value={form.note} onChange={setField("note")} />
          </Form.Group>
        </div>
        <div className="contract-records__form-actions">
          <Button type="button" size="sm" disabled={extending || !form.date} onClick={extend}>
            {extending && <Spinner animation="border" size="sm" />} {c("extension.extend")}
          </Button>
        </div>
      </div>
      {periods.map((p) => (
        <div className="contract-page__ro" key={p.id}>
          <span>
            {c("periodLabel", { n: p.sequence })} · {day(p.startAt)} → {day(p.endAt)}
            {" · "}
            {c(`periodStatus.${p.status === "ACTIVE" ? "active" : "closed"}`)}
          </span>
          <strong>{money(p.grossAmount)} TL</strong>
        </div>
      ))}
    </>
  );
};

export default ExtensionTab;
