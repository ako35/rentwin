import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { BsCalendarEvent, BsClock, BsGeoAlt } from "react-icons/bs";
import { FaCar } from "react-icons/fa";
import moment from "moment/moment";
import { utils } from "../../../utils";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { setSearchCriteria } from "../../../store";
import { useLocalizedNavigate } from "../../../hooks/use-localized-navigate";
import "./reservation-search.scss";

const { routes } = constants;

const ReservationSearch = () => {
  const { t } = useTranslation("home");
  const dispatch = useDispatch();
  const navigate = useLocalizedNavigate();
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    services.location
      .getLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const formik = useFormik({
    initialValues: utils.initialValues.reservationSearchInitialValues(),
    validationSchema: utils.validations.reservationSearchValidationSchema,
    onSubmit: (values) => {
      const pickUpLocation = values.pickUpLocation.trim();
      const isMonthly = values.rentalType === "MONTHLY";
      // MONTHLY has no drop-off date/time field of its own — the window the
      // availability check (and the search-summary banner) needs is derived
      // from pick-up + the chosen month count instead.
      const dropOffDate = isMonthly
        ? moment(values.pickUpDate).add(Number(values.months) || 1, "months").format("YYYY-MM-DD")
        : values.dropOffDate;
      const dropOffTime = isMonthly ? values.pickUpTime : values.dropOffTime;
      dispatch(
        setSearchCriteria({
          rentalType: values.rentalType,
          pickUpLocation,
          dropOffLocation: values.differentDropOff ? values.dropOffLocation.trim() : pickUpLocation,
          pickUpDate: values.pickUpDate,
          pickUpTime: values.pickUpTime,
          dropOffDate,
          dropOffTime,
          ...(isMonthly ? { months: Number(values.months) || 1 } : {}),
        })
      );
      navigate(routes.vehicles);
    },
  });

  const invalid = (name) => (formik.touched[name] && formik.errors[name] ? "is-invalid" : "");
  const firstError = Object.keys(formik.errors).find((k) => formik.touched[k]);

  const field = (name, labelKey, icon, extraProps) => (
    <div className={`reservation-search__field reservation-search__field--${name}`}>
      <label htmlFor={`rs-${name}`}>{t(`reservationSearch.${labelKey}`)}</label>
      <div className="reservation-search__control">
        {icon}
        <input
          id={`rs-${name}`}
          name={name}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={invalid(name)}
          {...extraProps}
        />
      </div>
    </div>
  );

  const locationField = (name, labelKey, placeholderKey) => (
    <div className={`reservation-search__field reservation-search__field--${name}`}>
      <label htmlFor={`rs-${name}`}>{t(`reservationSearch.${labelKey}`)}</label>
      <div className="reservation-search__control">
        <BsGeoAlt className="reservation-search__icon" />
        <select
          id={`rs-${name}`}
          name={name}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={invalid(name)}
        >
          <option value="">{t(`reservationSearch.${placeholderKey}`)}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.name}>{l.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const isMonthly = formik.values.rentalType === "MONTHLY";
  const selectTab = (rentalType) => () => formik.setFieldValue("rentalType", rentalType);

  return (
    <div className="reservation-search-wrap">
      <div className="reservation-search__tabs">
        <button
          type="button"
          className={`reservation-search__tab${!isMonthly ? " is-active" : ""}`}
          onClick={selectTab("DAILY")}
        >
          <FaCar /> {t("reservationSearch.dailyTab")}
        </button>
        <button
          type="button"
          className={`reservation-search__tab${isMonthly ? " is-active" : ""}`}
          onClick={selectTab("MONTHLY")}
        >
          <FaCar /> {t("reservationSearch.monthlyTab")}
        </button>
      </div>

      <form className="reservation-search" onSubmit={formik.handleSubmit} noValidate>
        <label className="reservation-search__toggle">
          <input
            type="checkbox"
            checked={formik.values.differentDropOff}
            onChange={(e) => formik.setFieldValue("differentDropOff", e.target.checked)}
          />
          {t("reservationSearch.differentDropOff")}
        </label>

        <div className="reservation-search__row">
          {locationField("pickUpLocation", "pickUpLocationLabel", "pickUpLocationPlaceholder")}
          {formik.values.differentDropOff &&
            locationField("dropOffLocation", "dropOffLocationLabel", "dropOffLocationPlaceholder")}
          {field("pickUpDate", "pickUpDate", <BsCalendarEvent className="reservation-search__icon" />, {
            type: "date",
            min: utils.functions.getCurrentDate(),
          })}
          {field("pickUpTime", "pickUpTime", <BsClock className="reservation-search__icon" />, {
            type: "time",
          })}
          {isMonthly
            ? field("months", "monthsLabel", <BsCalendarEvent className="reservation-search__icon" />, {
                type: "number",
                min: 1,
                max: 36,
                step: 1,
              })
            : (
              <>
                {field("dropOffDate", "dropOffDate", <BsCalendarEvent className="reservation-search__icon" />, {
                  type: "date",
                  min: formik.values.pickUpDate || utils.functions.getCurrentDate(),
                })}
                {field("dropOffTime", "dropOffTime", <BsClock className="reservation-search__icon" />, {
                  type: "time",
                })}
              </>
            )}
          <button type="submit" className="reservation-search__submit">
            {t("reservationSearch.submit")}
          </button>
        </div>

        {firstError && <p className="reservation-search__error">{formik.errors[firstError]}</p>}
      </form>
    </div>
  );
};

export default ReservationSearch;
