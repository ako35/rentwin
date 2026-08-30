import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Form, Nav, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { CustomForm, Loading } from "../../../../components";
import "./style.scss";

const { routes } = constants;

const EMPTY = {
  pickUpLocation: "",
  dropOffLocation: "",
  pickUpDate: "",
  pickUpTime: "",
  dropOffDate: "",
  dropOffTime: "",
  carId: "",
  status: "",
  userId: "",
  customerNote: "",
  adminNote: "",
  referenceNo: "",
  flightNo: "",
};

const AdminReservationDetailsPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [meta, setMeta] = useState({});
  const [initialValues, setInitialValues] = useState(EMPTY);
  const [tab, setTab] = useState("customer");

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
      dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation,
      status: values.status,
      customerNote: values.customerNote,
      adminNote: values.adminNote,
      referenceNo: values.referenceNo,
      flightNo: values.flightNo,
    };
    try {
      await services.reservation.updateReservation(values.carId, reservationId, dto);
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(t("reservations.toasts.updateError"), "error");
    } finally {
      setUpdating(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminReservationDetailsFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const loadData = async () => {
    try {
      const [reservation, vehiclesData, branchesData] = await Promise.all([
        services.reservation.getReservationByIdAdmin(reservationId),
        services.vehicle.getVehicles(),
        services.branch.getBranches().catch(() => []),
      ]);
      setVehicles(vehiclesData || []);
      setBranches(branchesData || []);
      setCustomer(reservation.customer || null);
      setMeta({ createdAt: reservation.createdAt, updatedAt: reservation.updatedAt });
      setInitialValues({
        ...EMPTY,
        ...reservation,
        pickUpDate: utils.functions.getDate(reservation.pickUpTime),
        pickUpTime: utils.functions.getTime(reservation.pickUpTime),
        dropOffDate: utils.functions.getDate(reservation.dropOffTime),
        dropOffTime: utils.functions.getTime(reservation.dropOffTime),
        customerNote: reservation.customerNote || "",
        adminNote: reservation.adminNote || "",
        referenceNo: reservation.referenceNo || "",
        flightNo: reservation.flightNo || "",
      });
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

  const handleDelete = () => {
    utils.functions
      .swalQuestion(
        t("reservations.toasts.deleteConfirmTitle"),
        t("reservations.toasts.deleteConfirmText")
      )
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setDeleting(true);
        try {
          await services.reservation.deleteReservation(reservationId);
          await utils.functions.swalToast(t("reservations.toasts.deleteSuccess"), "success");
          navigate(routes.adminReservations);
        } catch (error) {
          utils.functions.swalToast(t("reservations.toasts.deleteError"), "error");
        } finally {
          setDeleting(false);
        }
      });
  };

  const selectedCar = useMemo(
    () => vehicles.find((v) => v.id === formik.values.carId),
    [vehicles, formik.values.carId]
  );

  const dayCount = useMemo(() => {
    const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
    if (!pickUpDate || !dropOffDate) return 0;
    const start = moment(`${pickUpDate} ${pickUpTime || "00:00"}`);
    const end = moment(`${dropOffDate} ${dropOffTime || "00:00"}`);
    return Math.max(0, Math.ceil(end.diff(start, "hours") / 24));
  }, [formik.values]);

  const branchNames = branches.map((b) => b.name);
  const vehicleOptions = vehicles.map((v) => ({
    id: v.id,
    value: v.id,
    name: `${v.brand} ${v.model} — ${v.licensePlate}`,
  }));
  const statusOptions = constants.reservationStatus.map((s) => ({
    ...s,
    name: tCommon(`options.reservationStatus.${s.value}`),
  }));

  if (loading) return <Loading />;

  const c = (key) => t(`reservations.contract.${key}`);
  const readonlyRow = (label, value) => (
    <div className="contract-page__ro">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );

  return (
    <div className="contract-page">
      <div className="contract-page__ribbon">
        <div>
          <span className="contract-page__ribbon-id">
            {c("title")} #{reservationId.slice(0, 10).toUpperCase()}
          </span>
          <span className="contract-page__ribbon-status">
            {tCommon(`options.reservationStatus.${formik.values.status}`)}
          </span>
        </div>
        <div className="contract-page__ribbon-meta">
          {meta.updatedAt && `${c("lastUpdated")}: ${utils.functions.formatDateTime(meta.updatedAt)}`}
        </div>
      </div>

      <Form noValidate onSubmit={formik.handleSubmit} className="contract-page__grid">
        {/* LEFT — pickup/dropoff + vehicle */}
        <section className="contract-card">
          <h3>{c("leftTitle")}</h3>

          <CustomForm
            formik={formik}
            name="pickUpLocation"
            label={c("pickUpLocation")}
            list={branchNames}
          />
          <CustomForm
            formik={formik}
            name="dropOffLocation"
            label={c("dropOffLocation")}
            list={branchNames}
          />

          <div className="contract-page__pair">
            <CustomForm formik={formik} name="pickUpDate" label={c("pickUpDate")} type="date" />
            <CustomForm formik={formik} name="pickUpTime" label={t("reservations.form.pickUpTime")} type="time" />
          </div>
          <div className="contract-page__pair">
            <CustomForm formik={formik} name="dropOffDate" label={c("dropOffDate")} type="date" />
            <CustomForm formik={formik} name="dropOffTime" label={t("reservations.form.dropOffTime")} type="time" />
          </div>

          {readonlyRow(c("duration"), c("durationDays").replace("{{count}}", dayCount))}

          <CustomForm
            formik={formik}
            name="carId"
            label={c("vehicle")}
            type="select"
            itemsArr={vehicleOptions}
          />

          {readonlyRow(
            c("class"),
            selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : ""
          )}
          {readonlyRow(
            c("fuelTransmission"),
            selectedCar
              ? `${tCommon(`options.fuelTypes.${selectedCar.fuelType}`)} / ${tCommon(
                  `options.transmissionTypes.${selectedCar.transmission}`
                )}`
              : ""
          )}
          {readonlyRow(c("plate"), selectedCar?.licensePlate)}
        </section>

        {/* RIGHT — customer / summary tabs */}
        <section className="contract-card">
          <Nav variant="tabs" activeKey={tab} onSelect={(k) => k && setTab(k)} className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="customer">{c("tabs.customer")}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="summary">{c("tabs.summary")}</Nav.Link>
            </Nav.Item>
          </Nav>

          {tab === "customer" && (
            <>
              {readonlyRow(
                c("customerName"),
                customer ? `${customer.firstName} ${customer.lastName}` : ""
              )}
              {readonlyRow(c("customerEmail"), customer?.email)}
              {readonlyRow(c("customerPhone"), customer?.phoneNumber)}
              {formik.values.userId && (
                <Link className="contract-page__link" to={`${routes.adminUsers}/${formik.values.userId}`}>
                  {c("openCustomer")}
                </Link>
              )}
              <hr />
              <CustomForm formik={formik} name="flightNo" label={c("flightNo")} />
              <CustomForm formik={formik} name="referenceNo" label={c("referenceNo")} />
            </>
          )}

          {tab === "summary" && (
            <>
              {readonlyRow(
                c("currentVehicle"),
                selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.licensePlate})` : ""
              )}
              {readonlyRow(
                "Alış - Bırakış",
                `${formik.values.pickUpDate} ${formik.values.pickUpTime} → ${formik.values.dropOffDate} ${formik.values.dropOffTime} (${c(
                  "durationDays"
                ).replace("{{count}}", dayCount)})`
              )}
              {readonlyRow(
                c("route"),
                `${formik.values.pickUpLocation || "—"} → ${formik.values.dropOffLocation || "—"}`
              )}
              {meta.createdAt && readonlyRow(c("createdAt"), utils.functions.formatDateTime(meta.createdAt))}
              <CustomForm
                formik={formik}
                name="status"
                label={c("status")}
                type="select"
                itemsArr={statusOptions}
              />
              <hr />
              <CustomForm formik={formik} name="customerNote" label={c("customerNote")} type="textarea" rows={2} />
              <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
            </>
          )}
        </section>

        <div className="contract-page__actions">
          <Button
            variant="outline-danger"
            type="button"
            disabled={deleting || updating}
            onClick={handleDelete}
          >
            {deleting && <Spinner animation="border" size="sm" />} {t("reservations.delete")}
          </Button>
          <Button
            variant="outline-secondary"
            type="button"
            onClick={() => navigate(routes.adminReservations)}
          >
            {t("reservations.cancel")}
          </Button>
          <Button type="submit" disabled={!(formik.isValid && formik.dirty) || updating}>
            {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AdminReservationDetailsPage;
