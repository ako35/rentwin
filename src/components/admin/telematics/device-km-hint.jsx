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
// recalibrates the device. Renders nothing for a vehicle without a tracker or
// when the GPS server can't be reached.
const DeviceKmHint = ({ vehicleId, onUse }) => {
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
  if (info.estimatedKm == null) {
    return info.deviceRawKm != null ? (
      <div className="tlm-km-hint">
        <BsBroadcast /> {t("telematics.kmHint.uncalibrated")}
      </div>
    ) : null;
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
    </div>
  );
};

export default DeviceKmHint;
