import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Nav } from "react-bootstrap";
import { utils } from "../../../utils";
import RecordsPanel from "./records-panel";
import { RECORD_CONFIGS } from "./record-configs";
import { buildVehicleSections } from "./vehicle-form-sections";
import { useFleetPicklist } from "./use-fleet-picklist";
import VehicleIdentityTab from "./vehicle-identity-tab";
import VehicleContractsTab from "./vehicle-contracts-tab";
import "./vehicle-form.scss";

const RECORD_TABS = ["insurance", "tax", "maintenance", "inspection"];

const VehicleForm = ({
  mode,
  formik,
  vehicleId,
  vehicle,
  disabled = false,
  builtInWarning = false,
  children,
}) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  // Deep-link support: the dashboard's expiry-alert bar links straight into a
  // vehicle's Sigorta/Kasko, MTV, Bakım or Muayene tab via ?tab=<key>.
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState(RECORD_TABS.includes(requestedTab) ? requestedTab : "vehicle");

  const { branches, brandOptions, modelOptions, plateTaken, handleModelPicked } =
    useFleetPicklist(formik);

  const sections = useMemo(
    () => buildVehicleSections({ branches, brandOptions, modelOptions, t, tCommon }),
    [branches, brandOptions, modelOptions, t, tCommon]
  );

  const title =
    [formik.values.brand, formik.values.model].filter(Boolean).join(" ") || t("vehicles.newTitle");

  return (
    <div className="vehicle-form">
      <header className="vehicle-form__header">
        <div className="vehicle-form__title">
          <span className="vehicle-form__plate">
            {formik.values.licensePlate || t("vehicles.form.licensePlate")}
          </span>
          <span className="vehicle-form__name">{title}</span>
          {mode === "edit" && vehicle?.status && (
            <span
              className={`vehicle-form__status vehicle-form__status--${vehicle.status.toLowerCase().replace(/_/g, "-")}`}
            >
              {t(`vehicleStatus.${vehicle.status}`)}
            </span>
          )}
          {mode === "edit" && vehicle?.kbsSystem && (
            <span className="vehicle-form__kbs-badge">
              {t("vehicles.form.kbsSystemBadge", { system: vehicle.kbsSystem })}
            </span>
          )}
        </div>
        {mode === "edit" && vehicle && (
          <div className="vehicle-form__meta">
            {vehicle.createdAt && (
              <span>{t("vehicles.createdAt")}: {utils.functions.getDate(vehicle.createdAt)}</span>
            )}
            {vehicle.updatedAt && (
              <span>{t("vehicles.updatedAt")}: {utils.functions.formatDateTime(vehicle.updatedAt)}</span>
            )}
          </div>
        )}
      </header>

      <Nav
        variant="tabs"
        className="vehicle-form__tabs"
        activeKey={tab}
        onSelect={(key) => key && setTab(key)}
      >
        <Nav.Item>
          <Nav.Link eventKey="vehicle">{t("vehicles.tabs.vehicle")}</Nav.Link>
        </Nav.Item>
        {RECORD_TABS.map((key) => (
          <Nav.Item key={key}>
            <Nav.Link eventKey={key}>{t(`vehicles.tabs.${key}`)}</Nav.Link>
          </Nav.Item>
        ))}
        {mode === "edit" && (
          <Nav.Item>
            <Nav.Link eventKey="contracts">{t("vehicles.tabs.contracts")}</Nav.Link>
          </Nav.Item>
        )}
      </Nav>

      <div className="vehicle-form__body">
        {tab === "vehicle" && (
          <VehicleIdentityTab
            formik={formik}
            disabled={disabled}
            sections={sections}
            handleModelPicked={handleModelPicked}
            plateTaken={plateTaken}
          />
        )}

        {RECORD_TABS.map(
          (key) =>
            tab === key && (
              <RecordsPanel key={key} vehicleId={vehicleId} config={RECORD_CONFIGS[key]} />
            )
        )}

        {tab === "contracts" && <VehicleContractsTab vehicleId={vehicleId} />}
      </div>

      {builtInWarning && (
        <Alert variant="warning" className="mt-4">
          {t("vehicles.builtInWarning")}
        </Alert>
      )}

      <div className="vehicle-form__footer">{children}</div>
    </div>
  );
};

export default VehicleForm;
