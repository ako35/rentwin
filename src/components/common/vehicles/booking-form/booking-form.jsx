import { useFormik } from "formik";
import { utils } from "../../../../utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { CustomForm, SectionHeader } from "../../../";
import {
  Alert,
  Button,
  ButtonGroup,
  Form,
  FormCheck,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import moment from "moment/moment";

const { routes } = constants;

const BookingForm = () => {
  const [loading, setLoading] = useState(false);
  const [vehicleAvailable, setVehicleAvailable] = useState(false);
  const [locations, setLocations] = useState([]);
  const { t } = useTranslation("vehicles");

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

  const navigate = useNavigate();

  const locationOptions = [
    { id: "__none", value: "", name: t("booking.selectLocation") },
    ...locations.map((l) => ({ id: l.id, value: l.name, name: l.name })),
  ];

  const formItems = [
    {
      label: t("booking.pickUpLocation"),
      name: "pickUpLocation",
      type: "select",
      itemsArr: locationOptions,
    },
    {
      label: t("booking.dropOffLocation"),
      name: "dropOffLocation",
      type: "select",
      itemsArr: locationOptions,
    },
    {
      label: t("booking.pickUpDate"),
      name: "pickUpDate",
      type: "date",
      floating: true,
      min: moment().format("YYYY-MM-DD"),
    },
    {
      label: t("booking.pickUpTime"),
      name: "pickUpTime",
      type: "time",
      floating: true,
    },
    {
      label: t("booking.dropOffDate"),
      name: "dropOffDate",
      type: "date",
      floating: true,
    },
    {
      label: t("booking.dropOffTime"),
      name: "dropOffTime",
      type: "time",
      floating: true,
    },
  ];

  const onSubmit = async (values) => {
    setLoading(true);

    const {
      pickUpDate,
      pickUpTime,
      dropOffDate,
      dropOffTime,
      pickUpLocation,
      dropOffLocation,
    } = values;

    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(
        pickUpDate,
        pickUpTime
      ),
      dropOffTime: utils.functions.combineDateAndTime(
        dropOffDate,
        dropOffTime
      ),
      pickUpLocation: pickUpLocation,
      dropOffLocation: dropOffLocation,
    };

    try {
      await services.reservation.createReservation(vehicle.id, dto);
      await utils.functions.swalToast(t("booking.successToast"), "success");
      navigate(routes.userReservations);
    } catch (error) {
      utils.functions.swalToast(
        t("booking.genericError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAvailability = async () => {
    if (!isLoggedIn || !formik.dirty) return;
    setLoading(true);
    const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
    const dto = {
      carId: vehicle.id,
      pickUpDateTime: utils.functions.combineDateAndTime(
        pickUpDate,
        pickUpTime
      ),
      dropOffDateTime: utils.functions.combineDateAndTime(
        dropOffDate,
        dropOffTime
      ),
    };
    try {
      if (!utils.functions.checkDates(formik.values))
      return utils.functions.swalToast(
          t("booking.dateOrderError"),
          "error"
        );

      const data = await services.reservation.isVehicleAvailable(dto);
      const { available } = data;
      setVehicleAvailable(available);
      if(!available) {
        utils.functions.swalToast(t("booking.notAvailableError"), "error");
      }
    } catch (error) {
      utils.functions.swalToast(
        t("booking.genericError"),
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
      {!isLoggedIn && (
        <Alert>{t("booking.loginAlert")}</Alert>
      )}
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
          <Button
            variant="secondary"
            className={`w-100 ${!isLoggedIn || "d-none"}`}
            disabled={loading}
            onClick={handleAvailability}
          >
            {loading && <Spinner animation="border" size="sm" />} {t("booking.checkAvailability")}
          </Button>
        </fieldset>
        <fieldset
          className={`mt-5 ${vehicleAvailable && isLoggedIn} || 'd-none'`}
        >
          <Alert variant="success">
            <FormCheck
              type="checkbox"
              id="terms"
              value={true}
              label={t("booking.termsLabel")}
              {...formik.getFieldProps("terms")}
            />
            <ButtonGroup className="mt-3 w-100">
              <Button
                variant="outline-primary"
                disabled={loading}
                onClick={() => setVehicleAvailable(false)}
                className="w-50"
              >
                {t("booking.edit")}
              </Button>
              <Button
                variant="outline-primary"
                type="submit"
                disabled={loading}
                className="w-50"
              >
                {t("booking.bookNow")}
              </Button>
            </ButtonGroup>
          </Alert>
        </fieldset>
      </Form>
    </div>
  );
};

export default BookingForm;
