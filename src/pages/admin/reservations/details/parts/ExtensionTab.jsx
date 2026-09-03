import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";

const EMPTY_EXT_FORM = { date: "", time: "", extraAmount: "", note: "" };

// Sub tab: push the drop-off out and log an extra amount; lists past extensions.
const ExtensionTab = ({ isCreate, reservationId, minDate, extensions, onExtended, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const [form, setForm] = useState(EMPTY_EXT_FORM);
  const [extending, setExtending] = useState(false);

  const extend = async () => {
    if (!form.date) return;
    setExtending(true);
    try {
      await services.reservation.extendReservation(reservationId, {
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
            <Form.Label>{c("extension.extraAmount")}</Form.Label>
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
      {extensions.map((ext) => (
        <div className="contract-page__ro" key={ext.id}>
          <span>
            {c("extension.range", {
              from: utils.functions.getDate(ext.previousDropOff),
              to: utils.functions.getDate(ext.newDropOff),
            })}{" "}
            · {c("extension.days", { count: ext.extraDays })}
          </span>
          <strong>{money(ext.extraAmount)} TL</strong>
        </div>
      ))}
    </>
  );
};

export default ExtensionTab;
