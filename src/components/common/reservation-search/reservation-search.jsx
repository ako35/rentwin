import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsCalendarEvent, BsClock, BsGeoAlt } from "react-icons/bs";
import { utils } from "../../../utils";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { setSearchCriteria } from "../../../store";
import "./reservation-search.scss";

const { routes } = constants;

const ReservationSearch = () => {
  const { t } = useTranslation("home");
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
      dispatch(
        setSearchCriteria({
          pickUpLocation: values.location.trim(),
          dropOffLocation: values.location.trim(),
          pickUpDate: values.pickUpDate,
          pickUpTime: values.pickUpTime,
          dropOffDate: values.dropOffDate,
          dropOffTime: values.dropOffTime,
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

  return (
    <form className="reservation-search" onSubmit={formik.handleSubmit} noValidate>
      <div className="reservation-search__field reservation-search__field--location">
        <label htmlFor="rs-location">{t("reservationSearch.locationLabel")}</label>
        <div className="reservation-search__control">
          <BsGeoAlt className="reservation-search__icon" />
          <select
            id="rs-location"
            name="location"
            value={formik.values.location}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={invalid("location")}
          >
            <option value="">{t("reservationSearch.locationPlaceholder")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
      {field("pickUpDate", "pickUpDate", <BsCalendarEvent className="reservation-search__icon" />, {
        type: "date",
        min: utils.functions.getCurrentDate(),
      })}
      {field("pickUpTime", "pickUpTime", <BsClock className="reservation-search__icon" />, {
        type: "time",
      })}
      {field("dropOffDate", "dropOffDate", <BsCalendarEvent className="reservation-search__icon" />, {
        type: "date",
        min: formik.values.pickUpDate || utils.functions.getCurrentDate(),
      })}
      {field("dropOffTime", "dropOffTime", <BsClock className="reservation-search__icon" />, {
        type: "time",
      })}

      <button type="submit" className="reservation-search__submit">
        {t("reservationSearch.submit")}
      </button>

      {firstError && <p className="reservation-search__error">{formik.errors[firstError]}</p>}
    </form>
  );
};

export default ReservationSearch;
