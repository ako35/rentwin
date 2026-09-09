import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import SaveFirstHint from "./SaveFirstHint";

const EMPTY_EXT_FORM = { date: "", time: "", extraAmount: "", note: "" };
const day = (d) => (d ? moment.utc(d).format("DD.MM.YYYY") : "—");

// Sub tab: contract extensions. Each extension pushes the drop-off out and adds
// one flat, operator-entered amount (NET; system adds VAT for monthly) to the
// contract total — nothing is re-priced. Blank amount auto-fills monthlyPrice ×
// months. Extensions are deletable: removing one rolls the drop-off back.
const ExtensionTab = ({ isCreate, contractId, minDate, extensions = [], isMonthly, onExtended, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const [form, setForm] = useState(EMPTY_EXT_FORM);
  const [extending, setExtending] = useState(false);
  const [removingId, setRemovingId] = useState(null);

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

  const remove = (ext) => {
    utils.functions
      .swalQuestion(c("extension.deleteConfirm"), "", { danger: true })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setRemovingId(ext.id);
        try {
          await services.contract.deleteExtension(contractId, ext.id);
          utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
          onExtended();
        } catch {
          utils.functions.swalToast(t("reservations.contract.records.error"), "error");
        } finally {
          setRemovingId(null);
        }
      });
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

      {extensions.map((ext) => (
        <div className="contract-page__ro contract-page__ro--ext" key={ext.id}>
          <span>
            {day(ext.previousDropOff)} → {day(ext.newDropOff)}
            {ext.months ? ` · ${c("extension.months", { n: ext.months })}` : ""}
            {ext.note ? ` · ${ext.note}` : ""}
            {isMonthly && ext.extraAmountNet != null ? (
              <span className="contract-page__ro-sub">
                {c("extension.rowVat", {
                  net: money(ext.extraAmountNet),
                  gross: money(ext.extraAmount),
                })}
              </span>
            ) : null}
          </span>
          <span className="contract-page__ro-end">
            <strong>{money(ext.extraAmount)} TL</strong>
            <Button
              type="button"
              size="sm"
              variant="outline-danger"
              disabled={removingId === ext.id}
              onClick={() => remove(ext)}
            >
              {removingId === ext.id ? <Spinner animation="border" size="sm" /> : c("extension.delete")}
            </Button>
          </span>
        </div>
      ))}
    </>
  );
};

export default ExtensionTab;
