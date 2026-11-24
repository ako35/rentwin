import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "react-bootstrap";
import { BsBroadcast } from "react-icons/bs";
import { services } from "../../../services";
import { agoText } from "./telematics-format";
import "./telematics.scss";

// Under a km input in the return / vehicle-swap forms (GPS takip Faz 3): the
// km the vehicle's tracker reports, with a button to copy it in. Only a
// suggestion — the dashboard reading staff type in stays authoritative and
// recalibrates the device. With a CAN reader in the car (Faz 4) it also offers
// the fuel / charge level in eighths (onUseFuel). Renders nothing for a
// vehicle without a tracker or when the GPS server can't be reached.
const DeviceKmHint = ({ vehicleId, onUse, onUseFuel }) => {
  const { t, i18n } = useTranslation("admin");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    setInfo(null);
    if (!vehicleId) return undefined;
    services.telematics
      .getVehicleDeviceKm(vehicleId)
      .then((data) => alive && setInfo(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [vehicleId]);

  if (!info?.tracked) return null;
  const fuel = onUseFuel && info.fuel ? info.fuel : null;
  const fuelPart = fuel && (
    <>
      <span>
        {t(fuel.source === "battery" ? "telematics.fuel.hintBattery" : "telematics.fuel.hint", { eighths: fuel.eighths })}
      </span>
      <Button size="sm" variant="outline-secondary" onClick={() => onUseFuel(String(fuel.eighths))}>
        {t("telematics.fuel.use")}
      </Button>
    </>
  );
  if (info.estimatedKm == null) {
    if (info.deviceRawKm == null && !fuelPart) return null;
    return (
      <div className="tlm-km-hint">
        <BsBroadcast /> {info.deviceRawKm != null && <span>{t("telematics.kmHint.uncalibrated")}</span>}
        {fuelPart}
      </div>
    );
  }
  return (
    <div className="tlm-km-hint">
      <BsBroadcast />
      <span>
        {t("telematics.kmHint.device", { km: info.estimatedKm.toLocaleString(i18n.language) })}
        {info.deviceReadingAt ? ` · ${agoText(info.deviceReadingAt, t, i18n.language)}` : ""}
      </span>
      {onUse && (
        <Button size="sm" variant="outline-secondary" onClick={() => onUse(String(info.estimatedKm))}>
          {t("telematics.kmHint.use")}
        </Button>
      )}
      {fuelPart}
    </div>
  );
};

export default DeviceKmHint;
