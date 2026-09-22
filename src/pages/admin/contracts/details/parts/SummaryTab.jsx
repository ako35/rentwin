import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { CustomForm } from "../../../../../components";
import RoRow from "./RoRow";

// Sub tab: at-a-glance contract summary + admin note. The contract status is
// driven by the action bar (Araç Teslim Al / Kontratı İptal Et), not edited here.
const SummaryTab = ({ formik, selectedCar, billableDays }) => {
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
      <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
      {v.adminNoteAt && (
        <span className="contract-page__ro-sub contract-page__admin-note-stamp">
          {c("adminNoteStamp", {
            name: v.adminNoteBy || "—",
            date: moment(v.adminNoteAt).format("DD.MM.YYYY HH:mm"),
          })}
        </span>
      )}
    </>
  );
};

export default SummaryTab;
