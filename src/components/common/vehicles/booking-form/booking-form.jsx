import { useFormik } from "formik";
import { utils } from "../../../../utils";
import { useState } from "react";
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
  const [totalPrice, setTotalPrice] = useState(0);
  const { t } = useTranslation("vehicles");

  const {
    auth: { isLoggedIn },
    reservation: { vehicle },
  } = useSelector((state) => state);

  const navigate = useNavigate();

  const formItems = [
    {
      label: t("booking.pickUpLocation"),
      name: "pickUpLocation",
      floating: true,
    },
    {
      label: t("booking.dropOffLocation"),
      name: "dropOffLocation",
      floating: true,
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
    {
      label: t("booking.cardNumber"),
      name: "cardNo",
      floating: true,
      asInput: "ReactInputMask",
      mask: "9999-9999-9999-9999",
    },
    {
      label: t("booking.cardHolderName"),
      name: "cardHolderName",
      floating: true,
    },
    {
      label: t("booking.expiryDate"),
      name: "expiryDate",
      type: "month",
      floating: true,
    },
    {
      label: t("booking.cvv"),
      name: "cvv",
      floating: true,
      asInput: "ReactInputMask",
      mask: "999",
    },
    {
      label: t("booking.termsLabel"),
      name: "terms",
      id: "terms",
      type: "checkbox",
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
      const { available, totalPrice } = data;
      setTotalPrice(totalPrice);
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
    initialValues: utils.initialValues.bookingFormInitialValues,
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
            <h2>{t("booking.totalPrice")}: {totalPrice}</h2>
            {formItems.slice(6, 10).map((item) => (
              <CustomForm key={item.name} formik={formik} {...item} />
            ))}
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
