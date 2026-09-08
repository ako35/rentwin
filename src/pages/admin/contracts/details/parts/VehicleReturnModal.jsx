import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { BsFuelPump, BsSpeedometer2 } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import { buildFuelEighthsOptions } from "../../../../../utils/fuel-eighths";
import { computeReturnOverage, kbsStatus } from "../contract-helpers";
import "./vehicle-return-modal.scss";

// "Araç Teslim Al" opens this. Operator enters the hand-back odometer + fuel;
// km overage and missing fuel are auto-priced from the contract's km package /
// fees, stay editable, and are posted as return-charge extras when the contract
// is closed. If KABİS still blocks the close, the release checkbox appears here.
const VehicleReturnModal = ({ show, onHide, contractId, values, billableDays, money, onReturned }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.returnModal.${key}`, opts);
  const fuelOptions = buildFuelEighthsOptions(t);

  const [returnKm, setReturnKm] = useState("");
  const [returnFuelEighths, setReturnFuelEighths] = useState("");
  const [kmAmount, setKmAmount] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [kmIncluded, setKmIncluded] = useState(true);
  const [fuelIncluded, setFuelIncluded] = useState(true);
  const [releaseKbs, setReleaseKbs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState(null);

  const kmEdited = useRef(false);
  const fuelEdited = useRef(false);

  useEffect(() => {
    if (!show) return;
    setReturnKm(values.returnKm ?? "");
    setReturnFuelEighths(values.returnFuelEighths ?? "");
    setKmIncluded(true);
    setFuelIncluded(true);
    setReleaseKbs(false);
    setSaving(false);
    setErrorCode(null);
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
  const returnKmInvalid = returnKm !== "" && Number(returnKm) < pickUpKmNum;
  const kmLimited = Number.isFinite(overage.allowedKm);
  const hasKmFee = Number(values.kmOverageFee) > 0;

  const submit = async () => {
    if (returnKmInvalid) return;
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
        releaseKbs: kbsBlocked && releaseKbs,
        charges,
      });
      onReturned();
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "KBS_NOT_RELEASED" || code === "RETURN_KM_BELOW_PICKUP") {
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
                isInvalid={returnKmInvalid}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {c("returnKmBelowPickup", { km: values.pickUpKm })}
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
              >
                {fuelOptions.map((o) => (
                  <option key={o.id} value={o.value}>
                    {o.name}
                  </option>
                ))}
              </Form.Select>
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

        {(kbsBlocked || errorCode === "KBS_NOT_RELEASED") && (
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
        <Button
          onClick={submit}
          disabled={saving || returnKmInvalid || (kbsBlocked && !releaseKbs)}
        >
          {saving && <Spinner animation="border" size="sm" />} {c("submit")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default VehicleReturnModal;
