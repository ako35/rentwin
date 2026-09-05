import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { buildFuelEighthsOptions } from "../../../../../utils/fuel-eighths";
import { buildVehicleOptions } from "../contract-helpers";
import SaveFirstHint from "./SaveFirstHint";

const EMPTY_FORM = {
  date: "", time: "", newCarId: "",
  returnKm: "", returnFuelEighths: "",
  newCarKm: "", newCarFuelEighths: "",
  note: "",
};

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
  const fuelOptions = buildFuelEighthsOptions(t);

  const dropOff = utils.functions.combineDateAndTime(dropOffDate, dropOffTime || "00:00");

  // Refetch the free-car list whenever the chosen change date/time moves.
  useEffect(() => {
    setForm((f) => ({ ...f, newCarId: "", newCarKm: "", newCarFuelEighths: "" }));
    if (!form.date) { setAvailableCars([]); return undefined; }
    const changeDateTime = utils.functions.combineDateAndTime(form.date, form.time || "00:00");
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
  }, [form.date, form.time, dropOff, contractId, carId]);

  if (isCreate) return <SaveFirstHint />;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

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
    if (!form.date || !form.newCarId) return;
    setSaving(true);
    try {
      await services.contract.changeVehicle(contractId, {
        changeDate: utils.functions.combineDateAndTime(form.date, form.time || "00:00"),
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

  return (
    <>
      <div className="contract-records__form">
        <div className="contract-records__fields">
          <Form.Group>
            <Form.Label>{c("vehicleChange.date")}</Form.Label>
            <Form.Control
              type="date" size="sm" value={form.date}
              min={pickUpDate} max={dropOffDate}
              onChange={setField("date")}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.time")}</Form.Label>
            <Form.Control type="time" size="sm" value={form.time} onChange={setField("time")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.newVehicle")}</Form.Label>
            <Form.Select size="sm" value={form.newCarId} disabled={!form.date || loadingCars} onChange={setNewCar}>
              {carOptions.map((item) => (
                <option key={item.id} value={item.value}>{item.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.returnKm")}</Form.Label>
            <Form.Control type="number" size="sm" value={form.returnKm} onChange={setField("returnKm")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.returnFuelLevel")}</Form.Label>
            <Form.Select size="sm" value={form.returnFuelEighths} onChange={setField("returnFuelEighths")}>
              {fuelOptions.map((item) => (
                <option key={item.id} value={item.value}>{item.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.newCarKm")}</Form.Label>
            <Form.Control
              type="number" size="sm" value={form.newCarKm}
              disabled={!form.newCarId} onChange={setField("newCarKm")}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.newCarFuelLevel")}</Form.Label>
            <Form.Select
              size="sm" value={form.newCarFuelEighths}
              disabled={!form.newCarId} onChange={setField("newCarFuelEighths")}
            >
              {fuelOptions.map((item) => (
                <option key={item.id} value={item.value}>{item.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>{c("vehicleChange.note")}</Form.Label>
            <Form.Control size="sm" value={form.note} onChange={setField("note")} />
          </Form.Group>
        </div>
        {form.date && !loadingCars && availableCars.length === 0 && (
          <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{c("vehicleChange.noAvailable")}</p>
        )}
        <div className="contract-records__form-actions">
          <Button type="button" size="sm" disabled={saving || !form.date || !form.newCarId} onClick={changeVehicle}>
            {saving && <Spinner animation="border" size="sm" />} {c("vehicleChange.submit")}
          </Button>
        </div>
      </div>
      {vehicleChanges.map((vc) => (
        <div className="contract-page__ro" key={vc.id}>
          <span>
            {utils.functions.getDate(vc.changeDate)} {utils.functions.getTime(vc.changeDate)} ·{" "}
            {c("vehicleChange.range", { from: vc.previousCarLabel, to: vc.newCarLabel })}
          </span>
          {(vc.returnKm != null || vc.returnFuelEighths != null) && (
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              {c("vehicleChange.returnKm")}: {vc.returnKm ?? "—"} km
              {vc.returnFuelEighths != null ? ` · ${vc.returnFuelEighths}/8` : ""}
            </span>
          )}
          {(vc.newCarKm != null || vc.newCarFuelEighths != null) && (
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              {c("vehicleChange.newCarKm")}: {vc.newCarKm ?? "—"} km
              {vc.newCarFuelEighths != null ? ` · ${vc.newCarFuelEighths}/8` : ""}
            </span>
          )}
          {vc.note && <strong>{vc.note}</strong>}
        </div>
      ))}
    </>
  );
};

export default VehicleChangeTab;
