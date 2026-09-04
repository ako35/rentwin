import { useTranslation } from "react-i18next";
import { CustomForm } from "../../../../../components";
import { buildFuelEighthsOptions } from "../../../../../utils/fuel-eighths";
import RoRow from "./RoRow";

// Left card: pick-up/drop-off locations + date range + vehicle picker, then the
// hand-over odometer + fuel (prefilled from the car, editable) and the read-only
// branch / fuel-transmission / plate of the chosen car.
const VehicleSection = ({ formik, branchNames, vehicleOptions, selectedCar, isCreate, showNoAvailable }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const c = (key) => t(`reservations.contract.${key}`);
  const fuelOptions = buildFuelEighthsOptions(t);

  const fuelTransmission = selectedCar
    ? `${tCommon(`options.fuelTypes.${selectedCar.fuelType}`)} / ${tCommon(
        `options.transmissionTypes.${selectedCar.transmission}`
      )}`
    : "";

  return (
    <section className="contract-card">
      <h3>{c("leftTitle")}</h3>
      <CustomForm formik={formik} name="pickUpLocation" label={`* ${c("pickUpLocation")}`} list={branchNames} />
      <CustomForm formik={formik} name="dropOffLocation" label={`* ${c("dropOffLocation")}`} list={branchNames} />
      <div className="contract-page__pair">
        <CustomForm formik={formik} name="pickUpDate" label={`* ${c("pickUpDate")}`} type="date" disabled={!isCreate} />
        <CustomForm
          formik={formik}
          name="pickUpTime"
          label={t("reservations.form.pickUpTime")}
          type="time"
          disabled={!isCreate}
        />
      </div>
      <div className="contract-page__pair">
        <CustomForm
          formik={formik}
          name="dropOffDate"
          label={`* ${c("dropOffDate")}`}
          type="date"
          disabled={!isCreate}
        />
        <CustomForm
          formik={formik}
          name="dropOffTime"
          label={t("reservations.form.dropOffTime")}
          type="time"
          disabled={!isCreate}
        />
      </div>
      <CustomForm
        formik={formik}
        name="carId"
        label={c("vehicle")}
        type="select"
        itemsArr={vehicleOptions}
        disabled={!isCreate}
      />
      {isCreate && showNoAvailable && (
        <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{c("noAvailableCars")}</p>
      )}
      <div className="contract-page__pair">
        <CustomForm formik={formik} name="pickUpKm" label={c("pickUpKm")} type="number" />
        <CustomForm formik={formik} name="pickUpFuelEighths" label={c("pickUpFuelLevel")} type="select" itemsArr={fuelOptions} />
      </div>
      <RoRow label={c("branch")} value={selectedCar?.branch?.name} />
      <RoRow label={c("fuelTransmission")} value={fuelTransmission} />
      <RoRow label={c("plate")} value={selectedCar?.licensePlate} />
    </section>
  );
};

export default VehicleSection;
