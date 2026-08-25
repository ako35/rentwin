import { useEffect, useState } from "react";
import { constants } from "../../../../constants";
import { Form, Link, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import "./style.scss";
import { CustomForm, Loading } from "../../../../components";
import { SectionHeader } from "../../../../components";
import { Button, ButtonGroup, Col, Row, Spinner } from "react-bootstrap";

const { routes } = constants;

const AdminReservationDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const vehiclesOptions = vehicles.map((vehicle) => ({
    id: vehicle?.id,
    value: vehicle?.id,
    name: vehicle?.model,
  }));

  const formItems = [
    {
      name: "pickUpLocation",
      label: "Pick Up Location",
    },
    {
      name: "dropOffLocation",
      label: "Drop Off Location",
    },
    {
      name: "pickUpDate",
      label: "Pick Up Date",
      type: "date",
    },
    {
      name: "pickUpTime",
      label: "Pick Up Time",
      type: "time",
    },
    {
      name: "dropOffDate",
      label: "Drop Off Date",
      type: "date",
    },
    {
      name: "dropOffTime",
      label: "Drop Off Time",
      type: "time",
    },
    {
      name: "carId",
      label: "Vehicle",
      type: "select",
      itemsArr: vehiclesOptions,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      itemsArr: constants.reservationStatus,
    },
  ];

  const [initialValues, setInitialValues] = useState({
    pickUpLocation: "",
    dropOffLocation: "",
    pickUpDate: "",
    pickUpTime: "",
    dropOffDate: "",
    dropOffTime: "",
    carId: "",
    status: "",
    userId: "",
  });

  const onSubmit = async (values) => {
    setUpdating(true);

    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(
        values.pickUpDate,
        values.pickUpTime
      ),
      dropOffTime: utils.functions.combineDateAndTime(
        values.dropOffDate,
        values.dropOffTime
      ),
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation,
      status: values.status,
    }

    try {
      await services.reservation.updateReservation(values.carId, reservationId, dto);
      utils.functions.swalToast(
        "Reservation updated successfully.",
        "success"
      )
    } catch (error) {
      utils.functions.swalToast(
        "There was an error updated the data.",
        "error"
      )
    } finally {
      setUpdating(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema:
      utils.validations.adminReservationDetailsFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const removeReservation = async () => {
    setDeleting(true);
    try {
      await services.reservation.deleteReservation(reservationId);
      await utils.functions.swalToast("Reservation deleted successfully.", "success");
      navigate(`${routes.adminReservations}`);
    } catch (error) {
      utils.functions.swalToast(
        "There was an error deleting the reservation.",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    utils.functions
      .swalQuestion(
        "Are you sure you want to delete this reservation?",
        "You won't be able to revert this action!"
      )
      .then((result) => {
        if (result.isConfirmed) {
          removeReservation();
        }
      });
  };

  const loadData = async () => {
    try {
      const reservationData =
        await services.reservation.getReservationByIdAdmin(reservationId);
      const vehiclesData = await services.vehicle.getVehicles();
      const dto = {
        ...reservationData,
        pickUpDate: utils.functions.getDate(reservationData.pickUpDate),
        pickUpTime: utils.functions.getTime(reservationData.pickUpTime),
        dropOffDate: utils.functions.getDate(reservationData.dropOffDate),
        dropOffTime: utils.functions.getTime(reservationData.dropOffTime),
      };
      setVehicles(vehiclesData);
      setInitialValues(dto);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return loading ? (
    <Loading />
  ) : (
    <>
      <SectionHeader title1="reservation" title2="details" />
      <Form
        novalidate
        onSubmit={formik.handleSubmit}
        className="admin-reservation-details-page"
      >
        <div className="forms-container">
          <Row>
            <h2>Reservation id: {reservationId}</h2>
          </Row>
          <Row>
            {formItems.map((item) => (
              <Col key={item.name} className="mb-3">
                <CustomForm formik={formik} item={item} />
              </Col>
            ))}
          </Row>
        </div>
        <div className="buttons-container">
          <div className="go-to-customer">
            <Button
              as={Link}
              to={`${routes.adminUsers}/${formik.values.userId}`}
            >
              Go To Customer
            </Button>
          </div>
          <ButtonGroup>
            <Button disabled={deleting || updating} onClick={handleDelete}>
              {deleting && <Spinner animation="border" size="sm" />} Delete
            </Button>
            <Button
              type="submit"
              disabled={!(formik.isValid && formik.dirty) || updating}
            >
              {updating && <Spinner animation="border" size="sm" />} Save
            </Button>
            <Button onClick={() => navigate(`${routes.adminReservations}`)}>
              Cancel
            </Button>
          </ButtonGroup>
        </div>
      </Form>
    </>
  );
};

export default AdminReservationDetailsPage;
