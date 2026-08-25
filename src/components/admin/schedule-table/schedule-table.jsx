import { useEffect, useState } from "react";
import { Form, Nav, Spinner, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import moment from "moment/moment";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import "./schedule-table.scss";

const { routes } = constants;

const WINDOWS = [
  { value: "today", label: "Today" },
  { value: "3", label: "3 Days" },
  { value: "7", label: "7 Days" },
  { value: "15", label: "15 Days" },
  { value: "30", label: "30 Days" },
];

const ScheduleTable = ({ title, type, dateField }) => {
  const [window, setWindow] = useState("7");
  const [excludeCompleted, setExcludeCompleted] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await services.reservation.getAdminSchedule({
        type,
        window,
        excludeCompleted,
      });
      setRows(data);
    } catch (error) {
      utils.functions.swalToast("There was an error loading the schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window, excludeCompleted]);

  return (
    <div className="schedule-table">
      <div className="schedule-table__header">
        <h3>{title}</h3>
        <Nav variant="pills" activeKey={window} onSelect={setWindow}>
          {WINDOWS.map((item) => (
            <Nav.Item key={item.value}>
              <Nav.Link eventKey={item.value}>{item.label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>
      <Form.Check
        type="checkbox"
        id={`${type}-exclude-completed`}
        label="Exclude Completed"
        checked={excludeCompleted}
        onChange={(e) => setExcludeCompleted(e.target.checked)}
        className="schedule-table__filter"
      />
      <div className="schedule-table__table-container">
        <Table hover responsive>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Vehicle</th>
              <th>Reservation No</th>
              <th>Customer</th>
              <th>Days</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center">
                  <Spinner animation="border" size="sm" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center">
                  No records found
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const target = row[dateField];
                const daysRemaining = moment(target).startOf("day").diff(moment().startOf("day"), "days");
                return (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`${routes.adminReservations}/${row.id}`)}
                    className={daysRemaining < 0 ? "schedule-table__row--overdue" : ""}
                  >
                    <td>{utils.functions.getDate(target)}</td>
                    <td>{utils.functions.getTime(target)}</td>
                    <td>{row.car?.brand} {row.car?.model}</td>
                    <td>{row.id.slice(0, 8)}</td>
                    <td>{row.user?.firstName} {row.user?.lastName}</td>
                    <td>{daysRemaining}</td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default ScheduleTable;
