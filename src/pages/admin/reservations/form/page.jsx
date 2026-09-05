import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { CustomForm, Loading } from "../../../../components";
import { constants } from "../../../../constants";
import {
  custLabel,
  fetchCustomers,
  matchCustomers,
  buildVehicleOptions,
} from "../../contracts/details/contract-helpers";
import CustomerTypeahead from "../../contracts/details/parts/CustomerTypeahead";
import NewCustomerModal from "../../contracts/details/parts/NewCustomerModal";
import "../../contracts/details/style.scss";

const { routes } = constants;

const EMPTY = {
  carId: "", userId: "",
  pickUpLocation: "", dropOffLocation: "",
  pickUpDate: "", pickUpTime: "10:00", dropOffDate: "", dropOffTime: "10:00",
  note: "",
};

const AdminReservationFormPage = () => {
  const { reservationId } = useParams();
  const isCreate = !reservationId;
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.booking.${key}`);

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableCars, setAvailableCars] = useState([]);
  const [initialValues, setInitialValues] = useState(
    isCreate
      ? {
          ...EMPTY,
          pickUpDate: moment().format("YYYY-MM-DD"),
          dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
        }
      : EMPTY
  );
  const [custQuery, setCustQuery] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [newCustModal, setNewCustModal] = useState(false);

  const onSubmit = async (values) => {
    setSaving(true);
    const payload = {
      carId: values.carId,
      userId: values.userId,
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation || values.pickUpLocation,
      pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
      dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
      note: values.note,
    };
    try {
      const saved = isCreate
        ? await services.reservation.createReservationAdmin(payload)
        : await services.reservation.updateReservationAdmin(reservationId, payload);
      utils.functions.swalToast(c(isCreate ? "createdSuccess" : "updatedSuccess"), "success");
      navigate(routes.adminReservations, { state: { savedId: saved?.id } });
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || c("saveError"), "error");
      setSaving(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminReservationBookingValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  useEffect(() => {
    (async () => {
      const [loc, cs] = await Promise.all([
        services.location.getLocations().catch(() => []),
        fetchCustomers().catch(() => []),
      ]);
      setLocations(loc || []);
      setCustomers(cs || []);
      if (!isCreate) {
        try {
          const r = await services.reservation.getReservationByIdAdmin(reservationId);
          setInitialValues({
            carId: r.carId,
            userId: r.userId,
            pickUpLocation: r.pickUpLocation,
            dropOffLocation: r.dropOffLocation,
            pickUpDate: utils.functions.getDate(r.pickUpTime),
            pickUpTime: utils.functions.getTime(r.pickUpTime),
            dropOffDate: utils.functions.getDate(r.dropOffTime),
            dropOffTime: utils.functions.getTime(r.dropOffTime),
            note: r.note || "",
          });
          setCustQuery(custLabel(r.customer));
        } catch {
          utils.functions.swalToast(c("loadError"), "error");
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the vehicle picker limited to cars free for the chosen range.
  const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
  useEffect(() => {
    if (!pickUpDate || !dropOffDate) return;
    if (!moment(`${dropOffDate} ${dropOffTime || "00:00"}`).isAfter(`${pickUpDate} ${pickUpTime || "00:00"}`)) return;
    let cancelled = false;
    services.contract
      .getAvailableCars({
        pickUpTime: utils.functions.combineDateAndTime(pickUpDate, pickUpTime || "00:00"),
        dropOffTime: utils.functions.combineDateAndTime(dropOffDate, dropOffTime || "00:00"),
        excludeReservationId: reservationId,
      })
      .then((list) => {
        if (cancelled) return;
        const cars = Array.isArray(list) ? list : [];
        setAvailableCars(cars);
        if (formik.values.carId && !cars.some((car) => car.id === formik.values.carId)) {
          formik.setFieldValue("carId", "");
        }
      })
      .catch(() => !cancelled && setAvailableCars([]));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickUpDate, pickUpTime, dropOffDate, dropOffTime]);

  const locationOptions = [
    { id: "__none", value: "", name: `— ${c("selectLocation")} —` },
    ...locations.map((l) => ({ id: l.id, value: l.name, name: l.name })),
  ];
  const vehicleOptions = useMemo(
    () => buildVehicleOptions(availableCars, { isCreate: true, placeholder: c("selectVehicle") }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableCars]
  );
  const matches = matchCustomers(customers, custQuery, { keepId: formik.values.userId });

  const onCustomerCreated = async (created) => {
    setCustomers(await fetchCustomers().catch(() => []));
    formik.setFieldValue("userId", created.id);
    setCustQuery(custLabel(created));
    setNewCustModal(false);
  };

  if (loading) return <Loading />;

  return (
    <div className="contract-page">
      <div className="contract-page__ribbon contract-page__ribbon--create">
        <div className="contract-page__ribbon-main">
          <span className="contract-page__ribbon-id">{c(isCreate ? "newTitle" : "editTitle")}</span>
        </div>
      </div>

      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="contract-page__col" style={{ maxWidth: 560 }}>
          <section className="contract-card">
            <h3>{c("detailsTitle")}</h3>

            <div className="contract-page__corp-head">
              <Form.Label className="mb-0">* {c("customer")}</Form.Label>
              <button type="button" className="contract-page__link" onClick={() => setNewCustModal(true)}>
                + {c("newCustomer")}
              </button>
            </div>
            <div className="mb-2">
              <CustomerTypeahead
                query={custQuery}
                onQueryChange={(v) => { setCustQuery(v); setCustOpen(true); }}
                open={custOpen}
                options={matches}
                onPick={(u) => {
                  formik.setFieldValue("userId", u.id);
                  setCustQuery(custLabel(u));
                  setCustOpen(false);
                }}
                placeholder={c("customerSearch")}
                onFocus={() => setCustOpen(true)}
                onBlur={() =>
                  setTimeout(() => {
                    setCustOpen(false);
                    const sc = customers.find((cx) => cx.id === formik.values.userId);
                    if (sc) setCustQuery(custLabel(sc));
                  }, 150)
                }
                emptyContent={
                  <li className="contract-page__typeahead-add" onMouseDown={() => setNewCustModal(true)}>
                    + {c("customerNotFound")}
                  </li>
                }
              />
            </div>

            <CustomForm
              formik={formik} name="pickUpLocation" label={`* ${c("pickUpLocation")}`}
              type="select" itemsArr={locationOptions}
            />
            <CustomForm
              formik={formik} name="dropOffLocation" label={c("dropOffLocation")}
              type="select" itemsArr={locationOptions}
            />
            <div className="contract-page__pair">
              <CustomForm formik={formik} name="pickUpDate" label={`* ${c("pickUpDate")}`} type="date" />
              <CustomForm formik={formik} name="pickUpTime" label={c("pickUpTime")} type="time" />
            </div>
            <div className="contract-page__pair">
              <CustomForm formik={formik} name="dropOffDate" label={`* ${c("dropOffDate")}`} type="date" />
              <CustomForm formik={formik} name="dropOffTime" label={c("dropOffTime")} type="time" />
            </div>
            <CustomForm formik={formik} name="carId" label={`* ${c("vehicle")}`} type="select" itemsArr={vehicleOptions} />
            {!availableCars.length && (
              <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{c("noAvailableCars")}</p>
            )}
            <CustomForm formik={formik} name="note" label={c("note")} type="textarea" rows={2} />
          </section>
        </div>

        <div className="contract-page__actions">
          <Button variant="outline-secondary" type="button" disabled={saving} onClick={() => navigate(routes.adminReservations)}>
            {c("discard")}
          </Button>
          <span className="contract-page__actions-spacer" />
          <Button type="submit" disabled={!formik.isValid || !formik.values.userId || saving}>
            {saving && <Spinner animation="border" size="sm" />} {c(isCreate ? "create" : "save")}
          </Button>
        </div>
      </Form>

      <NewCustomerModal show={newCustModal} onHide={() => setNewCustModal(false)} onCreated={onCustomerCreated} />
    </div>
  );
};

export default AdminReservationFormPage;
