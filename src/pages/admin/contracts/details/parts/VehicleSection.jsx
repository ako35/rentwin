import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { GiGasPump, GiGearStick } from "react-icons/gi";
import { BsBuilding } from "react-icons/bs";
import { CustomForm } from "../../../../../components";
import { buildFuelEighthsOptions } from "../../../../../utils/fuel-eighths";
import { computeBillableDays } from "../contract-helpers";

// Left card: pick-up / drop-off grouped side by side, an auto rental-day badge,
// the vehicle picker + a one-line summary card, then the hand-over km / fuel.
const VehicleSection = ({ formik, locationNames, vehicleOptions, selectedCar, isCreate, showNoAvailable }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const fuelOptions = buildFuelEighthsOptions(t);

  // A saved contract may carry a location that is no longer in the Location list
  // (renamed, removed, or a legacy free-text value). Keep it as an option so the
  // dropdown still shows it and a later save never silently drops it.
  const locationOptions = [
    { id: "__none", value: "", name: `— ${c("selectLocation")} —` },
    ...locationNames.map((name) => ({ id: name, value: name, name })),
  ];
  [formik.values.pickUpLocation, formik.values.dropOffLocation].forEach((val) => {
    if (val && !locationOptions.some((o) => o.value === val)) {
      locationOptions.push({ id: `keep-${val}`, value: val, name: val });
    }
  });

  const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
  const hasRange =
    pickUpDate &&
    dropOffDate &&
    moment(`${dropOffDate} ${dropOffTime || "00:00"}`).isAfter(`${pickUpDate} ${pickUpTime || "00:00"}`);
  const days = hasRange ? computeBillableDays(formik.values) : 0;

  return (
    <section className="contract-card contract-card--vehicle">
      <h3>
        <span>{c("leftTitle")}</span>
        {days > 0 && (
          <span className="contract-page__days-badge">{c("rentalDaysBadge", { count: days })}</span>
        )}
      </h3>

      <div className="contract-page__rentgroups">
        <div className="contract-page__rentgroup">
          <span className="contract-page__rentgroup-cap">{c("pickUpGroup")}</span>
          <CustomForm
            formik={formik} name="pickUpLocation" label={`* ${c("pickUpLocation")}`}
            type="select" itemsArr={locationOptions}
          />
          <div className="contract-page__pair contract-page__pair--even">
            <CustomForm formik={formik} name="pickUpDate" label={`* ${c("pickUpDate")}`} type="date" disabled={!isCreate} />
            <CustomForm formik={formik} name="pickUpTime" label={t("reservations.form.pickUpTime")} type="time" disabled={!isCreate} />
          </div>
        </div>

        <div className="contract-page__rentgroup">
          <span className="contract-page__rentgroup-cap">{c("dropOffGroup")}</span>
          <CustomForm
            formik={formik} name="dropOffLocation" label={`* ${c("dropOffLocation")}`}
            type="select" itemsArr={locationOptions}
          />
          <div className="contract-page__pair contract-page__pair--even">
            <CustomForm formik={formik} name="dropOffDate" label={`* ${c("dropOffDate")}`} type="date" disabled={!isCreate} />
            <CustomForm formik={formik} name="dropOffTime" label={t("reservations.form.dropOffTime")} type="time" disabled={!isCreate} />
          </div>
        </div>
      </div>

      <CustomForm
        formik={formik} name="carId" label={c("vehicle")}
        type="select" itemsArr={vehicleOptions} disabled={!isCreate}
      />
      {isCreate && showNoAvailable && (
        <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{c("noAvailableCars")}</p>
      )}
      {selectedCar && (
        <div className="contract-page__car-summary">
          {selectedCar.licensePlate && (
            <span className="contract-page__plate">{selectedCar.licensePlate}</span>
          )}
          <span className="contract-page__car-specs">
            {selectedCar.transmission && (
              <span>
                <GiGearStick /> {tCommon(`options.transmissionTypes.${selectedCar.transmission}`)}
              </span>
            )}
            {selectedCar.fuelType && (
              <span>
                <GiGasPump /> {tCommon(`options.fuelTypes.${selectedCar.fuelType}`)}
              </span>
            )}
            {selectedCar.branch?.name && (
              <span>
                <BsBuilding /> {selectedCar.branch.name}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="contract-page__pair">
        <CustomForm formik={formik} name="pickUpKm" label={c("pickUpKm")} type="number" />
        <CustomForm formik={formik} name="pickUpFuelEighths" label={c("pickUpFuelLevel")} type="select" itemsArr={fuelOptions} />
      </div>
    </section>
  );
};

export default VehicleSection;
