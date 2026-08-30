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
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    services.branch
      .getPublicBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
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
      {field("location", "locationLabel", <BsGeoAlt className="reservation-search__icon" />, {
        list: "rs-branches",
        autoComplete: "off",
        placeholder: t("reservationSearch.locationPlaceholder"),
      })}
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

      <datalist id="rs-branches">
        {branches.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      {firstError && <p className="reservation-search__error">{formik.errors[firstError]}</p>}
    </form>
  );
};

export default ReservationSearch;
