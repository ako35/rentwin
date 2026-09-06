import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { buildVehicleOptions } from "../contract-helpers";
import SaveFirstHint from "./SaveFirstHint";
import "./vehicle-change-tab.scss";

const EMPTY_FORM = {
  dateTime: "", newCarId: "",
  returnKm: "", returnFuelEighths: "",
  newCarKm: "", newCarFuelEighths: "",
  note: "",
};

const FUEL_MARKS = { 0: true, 2: true, 4: true, 6: true, 8: true };

const splitDateTime = (value) => {
  const [d, tm] = (value || "").split("T");
  return { date: d || "", time: tm || "" };
};

const nowLocalValue = () => {
  const n = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
};

const FuelPicker = ({ value, onChange, disabled }) => (
  <div className={`vct-fuel${disabled ? " vct-fuel--disabled" : ""}`}>
    {Array.from({ length: 9 }, (_, n) => {
      const active = String(value) === String(n);
      return (
        <button
          key={n}
          type="button"
          disabled={disabled}
          title={`${n}/8`}
          className={`vct-fuel__pill${active ? " is-active" : ""}${FUEL_MARKS[n] ? " vct-fuel__pill--mark" : ""}`}
          onClick={() => onChange(active ? "" : String(n))}
        >
          {n}/8
        </button>
      );
    })}
  </div>
);

// Sub tab: swap the vehicle mid-contract. The car picker only lists vehicles
// actually free from the change date through the contract's existing drop-off;
// each swap is logged (previous/new car snapshot) and repoints Contract.carId —
// the left card's vehicle picker (disabled once opened) picks up the change.
const VehicleChangeTab = ({
  isCreate, contractId, carId, pickUpDate, dropOffDate, dropOffTime, vehicleChanges, onChanged,
}) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [availableCars, setAvailableCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const dropOff = utils.functions.combineDateAndTime(dropOffDate, dropOffTime || "00:00");

  // Refetch the free-car list whenever the chosen change date/time moves.
  useEffect(() => {
    setForm((f) => ({ ...f, newCarId: "", newCarKm: "", newCarFuelEighths: "" }));
    if (!form.dateTime) { setAvailableCars([]); return undefined; }
    const { date, time } = splitDateTime(form.dateTime);
    const changeDateTime = utils.functions.combineDateAndTime(date, time || "00:00");
    if (!(new Date(changeDateTime) < new Date(dropOff))) { setAvailableCars([]); return undefined; }

    let cancelled = false;
    setLoadingCars(true);
    services.contract
      .getAvailableCars({ pickUpTime: changeDateTime, dropOffTime: dropOff, excludeContractId: contractId })
      .then((list) => {
        if (cancelled) return;
        const free = Array.isArray(list) ? list.filter((car) => car.id !== carId) : [];
        setAvailableCars(free);
      })
      .catch(() => { if (!cancelled) setAvailableCars([]); })
      .finally(() => { if (!cancelled) setLoadingCars(false); });
    return () => { cancelled = true; };
  }, [form.dateTime, dropOff, contractId, carId]);

  if (isCreate) return <SaveFirstHint />;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setFuel = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // Picking the new vehicle also pulls its current odometer + fuel gauge in as
  // a starting point (same prefill-then-editable pattern as the contract's own
  // hand-over fields) — the admin can still correct them before saving.
  const setNewCar = (e) => {
    const newCarId = e.target.value;
    const car = availableCars.find((v) => v.id === newCarId);
    setForm((f) => ({
      ...f,
      newCarId,
      newCarKm: car?.currentKm ?? "",
      newCarFuelEighths: car?.currentFuelEighths != null ? String(car.currentFuelEighths) : "",
    }));
  };

  const changeVehicle = async () => {
    if (!form.dateTime || !form.newCarId) return;
    setSaving(true);
    try {
      const { date, time } = splitDateTime(form.dateTime);
      await services.contract.changeVehicle(contractId, {
        changeDate: utils.functions.combineDateAndTime(date, time || "00:00"),
        newCarId: form.newCarId,
        returnKm: form.returnKm,
        returnFuelEighths: form.returnFuelEighths,
        newCarKm: form.newCarKm,
        newCarFuelEighths: form.newCarFuelEighths,
        note: form.note,
      });
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
      setForm(EMPTY_FORM);
      onChanged();
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.data?.message || t("reservations.contract.records.error"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const carOptions = buildVehicleOptions(availableCars, {
    isCreate: true,
    placeholder: c("vehicleChange.selectVehicle"),
  });

  const fuelCap = (eighths) => (eighths != null ? `${eighths}/8` : "—");

  return (
    <>
      <div className="vct">
        <Form.Group className="vct__datetime">
          <Form.Label>{c("vehicleChange.dateTime")}</Form.Label>
          <div className="vct__datetime-row">
            <Form.Control
              type="datetime-local"
              size="sm"
              value={form.dateTime}
              min={pickUpDate ? `${pickUpDate}T00:00` : undefined}
              max={dropOffDate ? `${dropOffDate}T23:59` : undefined}
              onChange={setField("dateTime")}
            />
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, dateTime: nowLocalValue() }))}
            >
              {c("vehicleChange.now")}
            </Button>
          </div>
        </Form.Group>

        <div className="vct__cards">
          <section className="vct__card">
            <h4>{c("vehicleChange.returnGroup")}</h4>
            <Form.Group className="vct__field">
              <Form.Label>{c("vehicleChange.returnKm")}</Form.Label>
              <Form.Control type="number" size="sm" value={form.returnKm} onChange={setField("returnKm")} />
            </Form.Group>
            <Form.Group className="vct__field">
              <Form.Label>{c("vehicleChange.returnFuelLevel")}</Form.Label>
              <FuelPicker value={form.returnFuelEighths} onChange={setFuel("returnFuelEighths")} />
            </Form.Group>
          </section>

          <section className="vct__card">
            <h4>{c("vehicleChange.newCarGroup")}</h4>
            <Form.Group className="vct__field">
              <Form.Label>{c("vehicleChange.newVehicle")}</Form.Label>
              <Form.Select size="sm" value={form.newCarId} disabled={!form.dateTime || loadingCars} onChange={setNewCar}>
                {carOptions.map((item) => (
                  <option key={item.id} value={item.value}>{item.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="vct__field">
              <Form.Label>{c("vehicleChange.newCarKm")}</Form.Label>
              <Form.Control
                type="number" size="sm" value={form.newCarKm}
                disabled={!form.newCarId} onChange={setField("newCarKm")}
              />
            </Form.Group>
            <Form.Group className="vct__field">
              <Form.Label>{c("vehicleChange.newCarFuelLevel")}</Form.Label>
              <FuelPicker
                value={form.newCarFuelEighths}
                disabled={!form.newCarId}
                onChange={setFuel("newCarFuelEighths")}
              />
            </Form.Group>
          </section>
        </div>

        <Form.Group className="vct__note">
          <Form.Label>{c("vehicleChange.note")}</Form.Label>
          <Form.Control as="textarea" rows={2} size="sm" value={form.note} onChange={setField("note")} />
        </Form.Group>

        {form.dateTime && !loadingCars && availableCars.length === 0 && (
          <p className="vct__hint">{c("vehicleChange.noAvailable")}</p>
        )}

        <div className="vct__actions">
          <Button
            type="button"
            disabled={saving || !form.dateTime || !form.newCarId}
            onClick={changeVehicle}
          >
            {saving && <Spinner animation="border" size="sm" />} {c("vehicleChange.submit")}
          </Button>
        </div>
      </div>

      {vehicleChanges.length > 0 && (
        <Button
          type="button" variant="outline-secondary" size="sm"
          className="mt-3" onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory
            ? c("vehicleChange.hideHistory")
            : c("vehicleChange.showHistory", { count: vehicleChanges.length })}
        </Button>
      )}

      {showHistory && (
        <ol className="vct-timeline">
          {vehicleChanges.map((vc) => (
            <li className="vct-timeline__item" key={vc.id}>
              <span className="vct-timeline__dot" />
              <div className="vct-timeline__card">
                <div className="vct-timeline__time">
                  {utils.functions.getDate(vc.changeDate)} · {utils.functions.getTime(vc.changeDate)}
                </div>
                <div className="vct-timeline__swap">
                  <span className="vct-chip vct-chip--old">{vc.previousCarLabel}</span>
                  <span className="vct-timeline__arrow">→</span>
                  <span className="vct-chip vct-chip--new">{vc.newCarLabel}</span>
                </div>
                <div className="vct-timeline__caps">
                  <span className="vct-cap">
                    <em>{c("vehicleChange.returnGroup")}</em>
                    {vc.returnKm ?? "—"} km
                  </span>
                  <span className="vct-cap">{fuelCap(vc.returnFuelEighths)}</span>
                  <span className="vct-cap vct-cap--alt">
                    <em>{c("vehicleChange.newCarGroup")}</em>
                    {vc.newCarKm ?? "—"} km
                  </span>
                  <span className="vct-cap vct-cap--alt">{fuelCap(vc.newCarFuelEighths)}</span>
                </div>
                {vc.note && <div className="vct-timeline__note">{vc.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
};

export default VehicleChangeTab;
