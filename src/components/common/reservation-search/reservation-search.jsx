import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsGeoAlt } from "react-icons/bs";
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
      dispatch(setSearchCriteria(values));
      navigate(routes.vehicles);
    },
  });

  const invalid = (name) => (formik.touched[name] && formik.errors[name] ? "is-invalid" : "");

  const firstError = Object.keys(formik.errors).find((k) => formik.touched[k]);

  const row = (locationName, dateName, timeName, placeholder) => (
    <div className="reservation-search__row">
      <div className="reservation-search__field reservation-search__field--location">
        <BsGeoAlt className="reservation-search__icon" />
        <input
          name={locationName}
          list="rs-branches"
          autoComplete="off"
          placeholder={placeholder}
          value={formik.values[locationName]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={invalid(locationName)}
        />
      </div>
      <div className="reservation-search__field reservation-search__field--date">
        <input
          type="date"
          name={dateName}
          min={
            dateName === "dropOffDate"
              ? formik.values.pickUpDate || utils.functions.getCurrentDate()
              : utils.functions.getCurrentDate()
          }
          value={formik.values[dateName]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={invalid(dateName)}
        />
      </div>
      <div className="reservation-search__field reservation-search__field--time">
        <input
          type="time"
          name={timeName}
          value={formik.values[timeName]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={invalid(timeName)}
        />
      </div>
    </div>
  );

  return (
    <form className="reservation-search" onSubmit={formik.handleSubmit} noValidate>
      <h3 className="reservation-search__title">{t("reservationSearch.title")}</h3>

      {row("pickUpLocation", "pickUpDate", "pickUpTime", t("reservationSearch.pickUpLocationPlaceholder"))}
      {row("dropOffLocation", "dropOffDate", "dropOffTime", t("reservationSearch.dropOffLocationPlaceholder"))}

      <datalist id="rs-branches">
        {branches.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>

      {firstError && <p className="reservation-search__error">{formik.errors[firstError]}</p>}

      <button type="submit" className="reservation-search__submit">
        {t("reservationSearch.submit")}
      </button>
    </form>
  );
};

export default ReservationSearch;
