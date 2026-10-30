import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import moment from "moment/moment";
import { BsCalendar2Week, BsCheck2, BsPlusLg, BsXLg } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./inspection-appointments-panel.scss";

const EMPTY_FORM = () => ({
  type: "Periodic",
  date: moment().add(1, "day").format("YYYY-MM-DD"),
  time: "10:00",
  station: "",
  bookingCode: "",
  cost: "",
  notes: "",
});

const STATUS_KEYS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  OVERDUE: "overdue",
};

const InspectionAppointmentsPanel = ({ vehicleId, vehicle }) => {
  const { t, i18n } = useTranslation("admin");
  const tr = useCallback((key, options) => t(`inspectionAppointments.${key}`, options), [t]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await services.vehicle.getInspectionAppointments(null, vehicleId);
      setAppointments(Array.isArray(rows) ? rows : []);
    } catch {
      utils.functions.swalToast(tr("loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [tr, vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeAppointments = useMemo(
    () => appointments.filter((row) => row.status === "SCHEDULED"),
    [appointments]
  );
  const visibleAppointments = useMemo(() => {
    if (statusFilter === "ALL") return appointments;
    if (statusFilter === "OVERDUE") {
      return appointments.filter(
        (row) => row.status === "SCHEDULED" && moment(row.appointmentAt).isBefore(moment(), "day")
      );
    }
    return appointments.filter((row) => row.status === statusFilter);
  }, [appointments, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM());
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
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

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.date || !form.time || saving) return;

    setSaving(true);
    const payload = {
      ...form,
      vehicleId,
      appointmentAt: utils.functions.combineDateAndTime(form.date, form.time),
    };
    delete payload.date;
    delete payload.time;

    try {
      if (editing) {
        await services.vehicle.updateInspectionAppointment(editing.id, payload);
      } else {
        await services.vehicle.createInspectionAppointment(payload);
      }
      setShowModal(false);
      setEditing(null);
      utils.functions.swalToast(tr(editing ? "updated" : "created"), "success");
      await load();
    } catch {
      utils.functions.swalToast(tr("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (row, status) => {
    setChangingStatus(true);
    try {
      await services.vehicle.updateInspectionAppointment(row.id, { status });
      await load();
    } catch {
      utils.functions.swalToast(tr("saveError"), "error");
    } finally {
      setChangingStatus(false);
    }
  };

  const typeLabel = (type) =>
    tr(`types.${type === "Emission" ? "emission" : "periodic"}`);
  const statusLabel = (status) => tr(`statuses.${STATUS_KEYS[status] || "scheduled"}`);
  const isOverdue = (row) =>
    row.status === "SCHEDULED" && moment(row.appointmentAt).isBefore(moment(), "day");

  return (
    <section className="vehicle-appointments">
      <header className="vehicle-appointments__header">
        <div>
          <h3><BsCalendar2Week /> {tr("appointmentsTitle")}</h3>
          <p>{tr("vehicleDescription")}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <BsPlusLg /> {tr("newAppointment")}
        </Button>
      </header>

      <div className="vehicle-appointments__summary">
        <span>{tr("summary.scheduled")}</span>
        <strong>{activeAppointments.length}</strong>
      </div>

      <div className="vehicle-appointments__toolbar">
        <span>{vehicle?.licensePlate} · {[vehicle?.brand, vehicle?.model].filter(Boolean).join(" ")}</span>
        <Form.Select
          aria-label={tr("filterStatus")}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">{tr("allStatuses")}</option>
          {Object.keys(STATUS_KEYS).map((status) => (
            <option key={status} value={status}>{statusLabel(status)}</option>
          ))}
        </Form.Select>
      </div>

      {loading ? (
        <div className="vehicle-appointments__loading">
          <Spinner animation="border" size="sm" />
        </div>
      ) : (
        <Table responsive hover className="vehicle-appointments__table">
          <thead>
            <tr>
              <th>{tr("columns.type")}</th>
              <th>{tr("columns.date")}</th>
              <th>{tr("columns.station")}</th>
              <th>{tr("columns.bookingCode")}</th>
              <th>{tr("fields.cost")}</th>
              <th>{tr("columns.status")}</th>
              <th>{tr("columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleAppointments.map((row) => (
              <tr key={row.id}>
                <td>{typeLabel(row.type)}</td>
                <td>{moment(row.appointmentAt).format("DD.MM.YYYY HH:mm")}</td>
                <td>{row.station || "—"}</td>
                <td>{row.bookingCode || "—"}</td>
                <td>{row.cost == null ? "—" : `${Number(row.cost).toLocaleString(i18n.language)} TL`}</td>
                <td>
                  <span className={`vehicle-appointments__status vehicle-appointments__status--${isOverdue(row) ? "overdue" : row.status.toLowerCase()}`}>
                    {statusLabel(isOverdue(row) ? "OVERDUE" : row.status)}
                  </span>
                </td>
                <td className="vehicle-appointments__actions">
                  <Button size="sm" variant="outline-secondary" onClick={() => openEdit(row)}>
                    {tr("edit")}
                  </Button>
                  {row.status === "SCHEDULED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline-success"
                        title={tr("markCompleted")}
                        disabled={changingStatus}
                        onClick={() => changeStatus(row, "COMPLETED")}
                      >
                        <BsCheck2 />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        title={tr("cancelAppointment")}
                        disabled={changingStatus}
                        onClick={() => changeStatus(row, "CANCELLED")}
                      >
                        <BsXLg />
                      </Button>
                    </>
                  )}
                  {row.status === "CANCELLED" && (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={changingStatus}
                      onClick={() => changeStatus(row, "SCHEDULED")}
                    >
                      {tr("reopen")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {visibleAppointments.length === 0 && (
              <tr>
                <td colSpan={7} className="vehicle-appointments__empty">
                  {tr("appointmentsEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => !saving && setShowModal(false)} centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton>
            <Modal.Title>{tr(editing ? "editTitle" : "newAppointment")}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="vehicle-appointments__form">
            <div className="vehicle-appointments__vehicle">
              <span>{tr("fields.vehicle")}</span>
              <strong>{vehicle?.licensePlate} · {[vehicle?.brand, vehicle?.model].filter(Boolean).join(" ")}</strong>
            </div>
            <Form.Group>
              <Form.Label>{tr("fields.type")}</Form.Label>
              <Form.Select value={form.type} onChange={setField("type")}>
                <option value="Periodic">{typeLabel("Periodic")}</option>
                <option value="Emission">{typeLabel("Emission")}</option>
              </Form.Select>
            </Form.Group>
            <div className="vehicle-appointments__date-fields">
              <Form.Group>
                <Form.Label>{tr("fields.date")}</Form.Label>
                <Form.Control type="date" required value={form.date} onChange={setField("date")} />
              </Form.Group>
              <Form.Group>
                <Form.Label>{tr("fields.time")}</Form.Label>
                <Form.Control type="time" required value={form.time} onChange={setField("time")} />
              </Form.Group>
            </div>
            <Form.Group>
              <Form.Label>{tr("fields.station")}</Form.Label>
              <Form.Control value={form.station} onChange={setField("station")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{tr("fields.bookingCode")}</Form.Label>
              <Form.Control value={form.bookingCode} onChange={setField("bookingCode")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{tr("fields.cost")}</Form.Label>
              <Form.Control type="number" min="0" step="0.01" value={form.cost} onChange={setField("cost")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{tr("fields.notes")}</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes} onChange={setField("notes")} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" disabled={saving} onClick={() => setShowModal(false)}>
              {tr("close")}
            </Button>
            <Button type="submit" disabled={saving || !form.date || !form.time}>
              {saving && <Spinner size="sm" animation="border" />} {tr("save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </section>
  );
};

export default InspectionAppointmentsPanel;
