import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import moment from "moment/moment";
import { BsCalendar2Week, BsCheck2, BsPlusLg, BsXLg } from "react-icons/bs";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { Loading } from "../../../../components";
import "./style.scss";

const EMPTY_FORM = () => ({
  vehicleId: "",
  type: "Periodic",
  date: moment().add(1, "day").format("YYYY-MM-DD"),
  time: "10:00",
  station: "",
  bookingCode: "",
  cost: "",
  notes: "",
});

const TYPE_KEYS = { Periodic: "periodic", Emission: "emission" };
const STATUS_KEYS = { SCHEDULED: "scheduled", COMPLETED: "completed", CANCELLED: "cancelled", OVERDUE: "overdue" };

const InspectionAppointmentsPage = () => {
  const { t } = useTranslation("admin");
  const { branchId } = useOutletContext() || {};
  const tr = useCallback((key, options) => t(`inspectionAppointments.${key}`, options), [t]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dueItems, setDueItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointmentRows, vehiclePage, alerts] = await Promise.all([
        services.vehicle.getInspectionAppointments(branchId),
        services.vehicle.getVehiclesByPageAdmin(0, 1000, "id", "DESC", false, "", branchId),
        services.vehicle.getExpiryAlerts(branchId),
      ]);
      setAppointments(Array.isArray(appointmentRows) ? appointmentRows : []);
      setVehicles(Array.isArray(vehiclePage?.content) ? vehiclePage.content : []);
      setDueItems(Array.isArray(alerts?.categories?.inspection) ? alerts.categories.inspection : []);
    } catch {
      utils.functions.swalToast(tr("loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [branchId, tr]);

  useEffect(() => { load(); }, [load]);

  const activeVehicleIds = useMemo(
    () => new Set(appointments.filter((row) => row.status === "SCHEDULED").map((row) => row.vehicleId)),
    [appointments]
  );
  const needingBooking = useMemo(
    () => dueItems.filter((item) => !activeVehicleIds.has(item.vehicleId)),
    [dueItems, activeVehicleIds]
  );
  const visibleAppointments = useMemo(
    () => statusFilter === "ALL"
      ? appointments
      : statusFilter === "OVERDUE"
        ? appointments.filter((row) => row.status === "SCHEDULED" && moment(row.appointmentAt).isBefore(moment(), "day"))
        : appointments.filter((row) => row.status === statusFilter),
    [appointments, statusFilter]
  );

  const openCreate = (vehicleId = "") => {
    setEditing(null);
    setForm({ ...EMPTY_FORM(), vehicleId });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      vehicleId: row.vehicleId,
      type: row.type,
      date: moment(row.appointmentAt).format("YYYY-MM-DD"),
      time: moment(row.appointmentAt).format("HH:mm"),
      station: row.station || "",
      bookingCode: row.bookingCode || "",
      cost: row.cost ?? "",
      notes: row.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
  };

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.vehicleId || !form.date || !form.time || saving) return;
    setSaving(true);
    const payload = {
      ...form,
      appointmentAt: utils.functions.combineDateAndTime(form.date, form.time),
      cost: form.cost,
    };
    delete payload.date;
    delete payload.time;
    try {
      if (editing) await services.vehicle.updateInspectionAppointment(editing.id, payload);
      else await services.vehicle.createInspectionAppointment(payload);
      setShowModal(false);
      setEditing(null);
      await load();
      utils.functions.swalToast(tr(editing ? "updated" : "created"), "success");
    } catch {
      utils.functions.swalToast(tr("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (row, status) => {
    try {
      await services.vehicle.updateInspectionAppointment(row.id, { status });
      await load();
    } catch {
      utils.functions.swalToast(tr("saveError"), "error");
    }
  };

  const typeLabel = (type) => tr(`types.${TYPE_KEYS[type] || "periodic"}`);
  const statusLabel = (status) => tr(`statuses.${STATUS_KEYS[status] || "scheduled"}`);
  const vehicleLabel = (vehicle) => [vehicle?.licensePlate, vehicle?.brand, vehicle?.model].filter(Boolean).join(" · ");
  const today = moment().startOf("day");
  const overdueCount = appointments.filter(
    (row) => row.status === "SCHEDULED" && moment(row.appointmentAt).isBefore(today)
  ).length;

  if (loading) return <Loading height={500} />;

  return (
    <div className="inspection-appointments">
      <header className="inspection-appointments__header">
        <div>
          <div className="inspection-appointments__eyebrow">{tr("eyebrow")}</div>
          <h2>{tr("title")}</h2>
          <p>{tr("description")}</p>
        </div>
        <Button onClick={() => openCreate()}><BsPlusLg /> {tr("newAppointment")}</Button>
      </header>

      <div className="inspection-appointments__summary">
        <div><span>{tr("summary.scheduled")}</span><strong>{appointments.filter((row) => row.status === "SCHEDULED").length}</strong></div>
        <div><span>{tr("summary.today")}</span><strong>{appointments.filter((row) => row.status === "SCHEDULED" && moment(row.appointmentAt).isSame(today, "day")).length}</strong></div>
        <div><span>{tr("summary.needsBooking")}</span><strong>{needingBooking.length}</strong></div>
        <div><span>{tr("summary.overdue")}</span><strong>{overdueCount}</strong></div>
      </div>

      <section className="inspection-appointments__panel">
        <div className="inspection-appointments__panel-head">
          <div>
            <h3>{tr("needsBookingTitle")}</h3>
            <p>{tr("needsBookingDescription")}</p>
          </div>
          <span className="inspection-appointments__count">{needingBooking.length}</span>
        </div>
        {needingBooking.length === 0 ? (
          <div className="inspection-appointments__empty">{tr("needsBookingEmpty")}</div>
        ) : (
          <div className="inspection-appointments__due-list">
            {needingBooking.map((item) => (
              <div className="inspection-appointments__due-row" key={item.vehicleId}>
                <div>
                  <strong>{item.plate}</strong>
                  <span>{item.name || tr("vehicle")}</span>
                </div>
                <div className="inspection-appointments__due-date">
                  {item.missing ? tr("missingDate") : `${tr("expiryDate")}: ${moment(item.date).format("DD.MM.YYYY")}`}
                </div>
                <Button size="sm" variant="outline-primary" onClick={() => openCreate(item.vehicleId)}>
                  <BsCalendar2Week /> {tr("book")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="inspection-appointments__panel">
        <div className="inspection-appointments__panel-head">
          <div>
            <h3>{tr("appointmentsTitle")}</h3>
            <p>{tr("appointmentsDescription")}</p>
          </div>
          <Form.Select aria-label={tr("filterStatus")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">{tr("allStatuses")}</option>
            {Object.keys(STATUS_KEYS).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </Form.Select>
        </div>
        <Table responsive hover className="inspection-appointments__table">
          <thead><tr>
            <th>{tr("columns.vehicle")}</th><th>{tr("columns.type")}</th><th>{tr("columns.date")}</th>
            <th>{tr("columns.station")}</th><th>{tr("columns.bookingCode")}</th><th>{tr("columns.status")}</th><th>{tr("columns.actions")}</th>
          </tr></thead>
          <tbody>
            {visibleAppointments.map((row) => (
              <tr key={row.id}>
                <td><Link to={`${constants.routes.adminVehicles}/${row.vehicleId}?tab=inspection`}>{vehicleLabel(row.vehicle)}</Link></td>
                <td>{typeLabel(row.type)}</td>
                <td>{moment(row.appointmentAt).format("DD.MM.YYYY HH:mm")}</td>
                <td>{row.station || "—"}</td>
                <td>{row.bookingCode || "—"}</td>
                <td>
                  {row.status === "SCHEDULED" && moment(row.appointmentAt).isBefore(today) ? (
                    <span className="inspection-appointments__status inspection-appointments__status--overdue">{statusLabel("OVERDUE")}</span>
                  ) : (
                    <span className={`inspection-appointments__status inspection-appointments__status--${row.status.toLowerCase()}`}>{statusLabel(row.status)}</span>
                  )}
                </td>
                <td className="inspection-appointments__actions">
                  <Button size="sm" variant="outline-secondary" onClick={() => openEdit(row)}>{tr("edit")}</Button>
                  {row.status === "SCHEDULED" && <>
                    <Button size="sm" variant="outline-success" onClick={() => changeStatus(row, "COMPLETED")} title={tr("markCompleted")}><BsCheck2 /></Button>
                    <Button size="sm" variant="outline-danger" onClick={() => changeStatus(row, "CANCELLED")} title={tr("cancelAppointment")}><BsXLg /></Button>
                  </>}
                  {row.status === "CANCELLED" && <Button size="sm" variant="outline-primary" onClick={() => changeStatus(row, "SCHEDULED")}>{tr("reopen")}</Button>}
                </td>
              </tr>
            ))}
            {visibleAppointments.length === 0 && <tr><td colSpan={7} className="inspection-appointments__empty">{tr("appointmentsEmpty")}</td></tr>}
          </tbody>
        </Table>
      </section>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton><Modal.Title>{tr(editing ? "editTitle" : "newAppointment")}</Modal.Title></Modal.Header>
          <Modal.Body className="inspection-appointments__form">
            <Form.Group>
              <Form.Label>{tr("fields.vehicle")}</Form.Label>
              <Form.Select required value={form.vehicleId} onChange={setField("vehicleId")} disabled={!!editing}>
                <option value="">{tr("selectVehicle")}</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>{tr("fields.type")}</Form.Label>
              <Form.Select value={form.type} onChange={setField("type")}>
                <option value="Periodic">{typeLabel("Periodic")}</option>
                <option value="Emission">{typeLabel("Emission")}</option>
              </Form.Select>
            </Form.Group>
            <div className="inspection-appointments__date-fields">
              <Form.Group><Form.Label>{tr("fields.date")}</Form.Label><Form.Control type="date" required value={form.date} onChange={setField("date")} /></Form.Group>
              <Form.Group><Form.Label>{tr("fields.time")}</Form.Label><Form.Control type="time" required value={form.time} onChange={setField("time")} /></Form.Group>
            </div>
            <Form.Group><Form.Label>{tr("fields.station")}</Form.Label><Form.Control value={form.station} onChange={setField("station")} /></Form.Group>
            <Form.Group><Form.Label>{tr("fields.bookingCode")}</Form.Label><Form.Control value={form.bookingCode} onChange={setField("bookingCode")} /></Form.Group>
            <Form.Group><Form.Label>{tr("fields.cost")}</Form.Label><Form.Control type="number" min="0" step="0.01" value={form.cost} onChange={setField("cost")} /></Form.Group>
            <Form.Group><Form.Label>{tr("fields.notes")}</Form.Label><Form.Control as="textarea" rows={2} value={form.notes} onChange={setField("notes")} /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={closeModal}>{tr("close")}</Button>
            <Button type="submit" disabled={saving || !form.vehicleId || !form.date || !form.time}>
              {saving && <Spinner size="sm" animation="border" />} {tr("save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default InspectionAppointmentsPage;
