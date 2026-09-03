import { useTranslation } from "react-i18next";
import { CustomForm } from "../../../../../components";
import RoRow from "./RoRow";

// Sub tab: at-a-glance contract summary + flight no / notes / status fields.
const SummaryTab = ({ formik, selectedCar, billableDays, customerName, statusOptions, money }) => {
  const { t } = useTranslation("admin");
  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const v = formik.values;

  return (
    <>
      <RoRow label={c("currentClass")} value={selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : ""} />
      <div className="contract-page__ro">
        <span>{c("currentVehicle")}</span>
        <strong>{selectedCar?.licensePlate || "—"}</strong>
      </div>
      <RoRow
        label={c("pickUpDropOff")}
        value={`${v.pickUpDate} ${v.pickUpTime} - ${v.dropOffDate} ${v.dropOffTime} (${c("durationDays", {
          count: billableDays,
        })})`}
      />
      <RoRow label={c("route")} value={`${v.pickUpLocation || "—"} - ${v.dropOffLocation || "—"}`} />
      <RoRow label={c("selectedExtras")} value={v.extrasTotal ? `${money(v.extrasTotal)} TL` : ""} />
      <CustomForm formik={formik} name="flightNo" label={c("flightNo")} />
      <RoRow label={c("customerName")} value={customerName} />
      <CustomForm formik={formik} name="customerNote" label={c("customerNote")} type="textarea" rows={2} />
      <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
      <CustomForm formik={formik} name="status" label={c("status")} type="select" itemsArr={statusOptions} />
    </>
  );
};

export default SummaryTab;
