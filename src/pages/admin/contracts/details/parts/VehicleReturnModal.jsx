import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { BsClock, BsFuelPump, BsSpeedometer2 } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { buildFuelEighthsOptions } from "../../../../../utils/fuel-eighths";
import { computeReturnOverage, kbsStatus } from "../contract-helpers";
import "./vehicle-return-modal.scss";

// "Araç Teslim Al" opens this. Operator enters the hand-back odometer + fuel;
// km overage and missing fuel are auto-priced from the contract's km package /
// fees, stay editable, and are posted as return-charge extras when the contract
// is closed. If the rental is still filed in KABİS without a release, a
// checkbox offers releasing it in the same request — optional, not required:
// closing works either way, and a still-open one keeps surfacing on the
// dashboard's KABİS-release-pending panel until someone releases it.
const VehicleReturnModal = ({ show, onHide, contractId, values, billableDays, money, onReturned }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.returnModal.${key}`, opts);
  const fuelOptions = buildFuelEighthsOptions(t);

  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [returnKm, setReturnKm] = useState("");
  const [returnFuelEighths, setReturnFuelEighths] = useState("");
  const [kmAmount, setKmAmount] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [kmIncluded, setKmIncluded] = useState(true);
  const [fuelIncluded, setFuelIncluded] = useState(true);
  const [releaseKbs, setReleaseKbs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [attempted, setAttempted] = useState(false);

  const kmEdited = useRef(false);
  const fuelEdited = useRef(false);

  useEffect(() => {
    if (!show) return;
    // Defaults to the moment the modal is opened — the operator can still
    // back-date it when the car actually came back earlier (e.g. processed
    // the next morning). This is what the HGS period and every other "kaç
    // gün kirada kaldı" reading downstream of returnedAt is based on.
    setReturnDate(moment().format("YYYY-MM-DD"));
    setReturnTime(moment().format("HH:mm"));
    setReturnKm(values.returnKm ?? "");
    setReturnFuelEighths(values.returnFuelEighths ?? "");
    setKmIncluded(true);
    setFuelIncluded(true);
    setReleaseKbs(false);
    setSaving(false);
    setErrorCode(null);
    setAttempted(false);
    kmEdited.current = false;
    fuelEdited.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const overage = useMemo(
    () =>
      computeReturnOverage(values, {
        pickUpKm: values.pickUpKm,
        returnKm,
        pickUpFuelEighths: values.pickUpFuelEighths,
        returnFuelEighths,
        contractedDays: billableDays,
      }),
    [values, returnKm, returnFuelEighths, billableDays]
  );

  // Keep the charge amounts on the live suggestion until the operator types.
  useEffect(() => {
    if (!kmEdited.current) setKmAmount(overage.kmCharge ? String(overage.kmCharge) : "");
  }, [overage.kmCharge]);
  useEffect(() => {
    if (!fuelEdited.current) setFuelAmount(overage.fuelCharge ? String(overage.fuelCharge) : "");
  }, [overage.fuelCharge]);

  const kbsBlocked = kbsStatus(values) === "reported";
  const pickUpKmNum = Number(values.pickUpKm) || 0;
  const returnKmMissing = returnKm === "";
  const returnFuelMissing = returnFuelEighths === "";
  const returnKmInvalid = !returnKmMissing && Number(returnKm) < pickUpKmNum;
  const returnDateMissing = !returnDate || !returnTime;
  const returnBeforePickup =
    !returnDateMissing &&
    values.pickUpDate &&
    moment(`${returnDate} ${returnTime}`).isBefore(
      moment(`${values.pickUpDate} ${values.pickUpTime || "00:00"}`)
    );
  // Early return only: if the hand-back date is before the contracted
  // drop-off (Bırakış Tarihi), confirm before syncing dropOffTime to it.
  // Compared at day precision (both are plain YYYY-MM-DD strings) — a
  // return processed a few minutes off the scheduled time shouldn't warn,
  // only an actually earlier date should. The backend freezes billing at
  // the pre-sync window (a zero-amount extension row, same trick a real
  // paid extension uses) so this never reduces totalPrice. A LATE return
  // is left alone here — that's a priced extension the operator adds
  // themselves on the Uzatma tab, not an automatic side effect of closing.
  const isEarlyReturn = !returnDateMissing && values.dropOffDate && returnDate < values.dropOffDate;
  const kmLimited = Number.isFinite(overage.allowedKm);
  const hasKmFee = Number(values.kmOverageFee) > 0;

  const submit = async () => {
    if (returnKmMissing || returnFuelMissing || returnKmInvalid || returnDateMissing || returnBeforePickup) {
      setAttempted(true);
      return;
    }
    if (isEarlyReturn) {
      const result = await utils.functions.swalQuestion(
        c("earlyReturnTitle"),
        c("earlyReturnText", { date: moment(`${returnDate} ${returnTime}`).format("DD.MM.YYYY HH:mm") })
      );
      if (!result.isConfirmed) return;
    }
    setSaving(true);
    setErrorCode(null);

    const charges = [];
    if (kmIncluded && Number(kmAmount) > 0) {
      charges.push({
        category: "KM_EXCESS",
        description: c("kmExcessNote", { km: overage.excessKm, unit: Number(values.kmOverageFee) || 0 }),
        amount: Number(kmAmount),
        quantity: 1,
      });
    }
    if (fuelIncluded && Number(fuelAmount) > 0) {
      charges.push({
        category: "FUEL",
        description: c("fuelNote", { n: overage.missingEighths }),
        amount: Number(fuelAmount),
        quantity: 1,
      });
    }

    try {
      await services.contract.returnContract(contractId, {
        returnKm: returnKm === "" ? null : Number(returnKm),
        returnFuelEighths: returnFuelEighths === "" ? null : Number(returnFuelEighths),
        returnedAt: utils.functions.combineDateAndTime(returnDate, returnTime),
        releaseKbs: kbsBlocked && releaseKbs,
        charges,
      });
      onReturned();
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "RETURN_KM_BELOW_PICKUP") {
        setErrorCode(code);
      } else {
        utils.functions.swalToast(
          err?.response?.data?.message || t("reservations.toasts.updateError"),
          "error"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" contentClassName="contract-page__return-modal">
      <Modal.Header closeButton>
        <Modal.Title>{c("title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="return-modal">
        <p className="return-modal__intro">{c("intro")}</p>

        <section className="return-modal__block">
          <h6>
            <BsClock /> {c("returnedAt")}
          </h6>
          <div className="return-modal__grid">
            <Form.Group>
              <Form.Label>{c("returnDate")}</Form.Label>
              <Form.Control
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                isInvalid={attempted && (returnDateMissing || returnBeforePickup)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("returnTime")}</Form.Label>
              <Form.Control
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                isInvalid={attempted && (returnDateMissing || returnBeforePickup)}
              />
              <Form.Control.Feedback type="invalid">
                {returnDateMissing ? c("returnedAtRequired") : c("returnedAtBeforePickup")}
              </Form.Control.Feedback>
            </Form.Group>
          </div>
        </section>

        <section className="return-modal__block">
          <h6>
            <BsSpeedometer2 /> {c("odometer")}
          </h6>
          <div className="return-modal__grid">
            <Form.Group>
              <Form.Label>{c("pickUpKm")}</Form.Label>
              <Form.Control value={values.pickUpKm || "—"} disabled />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("returnKm")}</Form.Label>
              <Form.Control
                type="number"
                min={pickUpKmNum || 0}
                value={returnKm}
                onChange={(e) => setReturnKm(e.target.value)}
                isInvalid={returnKmInvalid || (attempted && returnKmMissing)}
                required
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {returnKmInvalid
                  ? c("returnKmBelowPickup", { km: values.pickUpKm })
                  : c("returnKmRequired")}
              </Form.Control.Feedback>
            </Form.Group>
          </div>

          {values.unlimitedKm ? (
            <Alert variant="light" className="return-modal__note">{c("unlimitedNote")}</Alert>
          ) : !kmLimited ? (
            <Alert variant="light" className="return-modal__note">{c("noLimitNote")}</Alert>
          ) : (
            <>
              <div className="return-modal__stats">
                <span>
                  {c("usedKm")}: <strong>{money(overage.usedKm)} km</strong>
                </span>
                <span>
                  {c("allowedKm")}: <strong>{Math.round(overage.allowedKm).toLocaleString("tr-TR")} km</strong>
                </span>
                <span className={overage.excessKm > 0 ? "is-over" : ""}>
                  {c("excessKm")}: <strong>{money(overage.excessKm)} km</strong>
                </span>
              </div>
              {!hasKmFee && overage.excessKm > 0 && (
                <div className="return-modal__hint">{c("noFeeNote")}</div>
              )}
              <div className="return-modal__charge">
                <Form.Check
                  type="checkbox"
                  id="rm-km"
                  label={c("kmChargeLabel")}
                  checked={kmIncluded}
                  onChange={(e) => setKmIncluded(e.target.checked)}
                />
                <span className="return-modal__field">
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={kmAmount}
                    disabled={!kmIncluded}
                    onChange={(e) => {
                      kmEdited.current = true;
                      setKmAmount(e.target.value);
                    }}
                  />
                  <span className="return-modal__unit">₺</span>
                </span>
              </div>
            </>
          )}
        </section>

        <section className="return-modal__block">
          <h6>
            <BsFuelPump /> {c("fuel")}
          </h6>
          <div className="return-modal__grid">
            <Form.Group>
              <Form.Label>{c("pickUpFuel")}</Form.Label>
              <Form.Control
                value={
                  values.pickUpFuelEighths === "" || values.pickUpFuelEighths == null
                    ? "—"
                    : `${values.pickUpFuelEighths}/8`
                }
                disabled
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>{c("returnFuel")}</Form.Label>
              <Form.Select
                value={returnFuelEighths}
                onChange={(e) => setReturnFuelEighths(e.target.value)}
                isInvalid={attempted && returnFuelMissing}
              >
                {fuelOptions.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{c("returnFuelRequired")}</Form.Control.Feedback>
            </Form.Group>
          </div>
          <div className="return-modal__stats">
            <span className={overage.missingEighths > 0 ? "is-over" : ""}>
              {c("missingFuel")}: <strong>{overage.missingEighths}/8</strong>
            </span>
          </div>
          <div className="return-modal__charge">
            <Form.Check
              type="checkbox"
              id="rm-fuel"
              label={c("fuelChargeLabel")}
              checked={fuelIncluded}
              onChange={(e) => setFuelIncluded(e.target.checked)}
            />
            <span className="return-modal__field">
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={fuelAmount}
                disabled={!fuelIncluded}
                onChange={(e) => {
                  fuelEdited.current = true;
                  setFuelAmount(e.target.value);
                }}
              />
              <span className="return-modal__unit">₺</span>
            </span>
          </div>
        </section>

        {kbsBlocked && (
          <Alert variant="warning" className="return-modal__kbs">
            {c("kbsWarning")}
            <Form.Check
              type="checkbox"
              id="rm-kbs"
              className="mt-2"
              label={c("releaseKbsAndClose")}
              checked={releaseKbs}
              onChange={(e) => setReleaseKbs(e.target.checked)}
            />
          </Alert>
        )}
        {errorCode === "RETURN_KM_BELOW_PICKUP" && (
          <Alert variant="danger">{c("returnKmBelowPickup", { km: values.pickUpKm })}</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
          {t("reservations.cancel")}
        </Button>
        <Button onClick={submit} disabled={saving || returnKmInvalid}>
          {saving && <Spinner animation="border" size="sm" />} {c("submit")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VehicleReturnModal;
