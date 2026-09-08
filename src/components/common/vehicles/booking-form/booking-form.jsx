import { useFormik } from "formik";
import { utils } from "../../../../utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { CustomForm, KvkkConsent, SectionHeader } from "../../../";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import moment from "moment/moment";

const { routes } = constants;

// Public vehicle-detail booking. The visitor came here from an availability-
// filtered search, so there is no separate "check availability" step: filling
// the form and consenting creates a PENDING reservation straight away (the
// backend still guards the dates and returns 409 if the car was taken since).
const BookingForm = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const { t } = useTranslation("vehicles");
  const navigate = useNavigate();

  const {
    auth: { isLoggedIn },
    reservation: { vehicle, searchCriteria },
  } = useSelector((state) => state);

  useEffect(() => {
    services.location.getLocations().then(setLocations).catch(() => setLocations([]));
  }, []);

  // Pre-fill from the homepage reservation search, if the user came through it.
  const initialValues = searchCriteria
    ? { ...utils.initialValues.bookingFormInitialValues, ...searchCriteria }
    : utils.initialValues.bookingFormInitialValues;

  const locationOptions = [
    { id: "__none", value: "", name: t("booking.selectLocation") },
    ...locations.map((l) => ({ id: l.id, value: l.name, name: l.name })),
  ];

  const formItems = [
    { label: t("booking.pickUpLocation"), name: "pickUpLocation", type: "select", itemsArr: locationOptions },
    { label: t("booking.dropOffLocation"), name: "dropOffLocation", type: "select", itemsArr: locationOptions },
    { label: t("booking.pickUpDate"), name: "pickUpDate", type: "date", floating: true, min: moment().format("YYYY-MM-DD") },
    { label: t("booking.pickUpTime"), name: "pickUpTime", type: "time", floating: true },
    { label: t("booking.dropOffDate"), name: "dropOffDate", type: "date", floating: true },
    { label: t("booking.dropOffTime"), name: "dropOffTime", type: "time", floating: true },
  ];

  const onSubmit = async (values) => {
    if (!utils.functions.checkDates(values)) {
      return utils.functions.swalToast(t("booking.dateOrderError"), "error");
    }
    setLoading(true);
    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
      dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation,
    };
    try {
      await services.reservation.createReservation(vehicle.id, dto);
      await utils.functions.swalToast(t("booking.successToast"), "success");
      navigate(routes.userReservations);
    } catch (error) {
      const conflict = error?.response?.status === 409;
      utils.functions.swalToast(
        t(conflict ? "booking.notAvailableError" : "booking.genericError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: utils.validations.bookingFormValidationSchema,
    onSubmit,
  });

  return (
    <div className="booking-form">
      <SectionHeader title1={t("booking.sectionTitle1")} title2={t("booking.sectionTitle2")} />
      {!isLoggedIn && <Alert>{t("booking.loginAlert")}</Alert>}
      <Form noValidate onSubmit={formik.handleSubmit}>
        <fieldset disabled={!isLoggedIn}>
          {formItems.slice(0, 2).map((item) => (
            <CustomForm key={item.name} formik={formik} {...item} />
          ))}
          <InputGroup className="mb-3">
            {formItems.slice(2, 4).map((item) => (
              <CustomForm key={item.name} formik={formik} {...item} />
            ))}
          </InputGroup>
          <InputGroup className="mb-3">
            {formItems.slice(4, 6).map((item) => (
              <CustomForm key={item.name} formik={formik} {...item} />
            ))}
          </InputGroup>

          <div className="mb-3">
            <KvkkConsent formik={formik} name="terms" ns="vehicles" i18nKey="booking.termsLabel" />
          </div>

          <Button variant="primary" type="submit" className="w-100" disabled={loading}>
            {loading && <Spinner animation="border" size="sm" />} {t("booking.submitReservation")}
          </Button>
        </fieldset>
      </Form>
    </div>
  );
};

export default BookingForm;
