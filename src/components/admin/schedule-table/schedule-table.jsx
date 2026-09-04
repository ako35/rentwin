import { useEffect, useState } from "react";
import { Nav, Spinner, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsPlusCircle } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { constants } from "../../../constants";
import "./schedule-table.scss";

const { routes } = constants;

const ScheduleTable = ({ title, type, dateField, branchId }) => {
  const { t } = useTranslation("admin");
  const WINDOWS = [
    { value: "today", label: t("scheduleTable.windows.today") },
    { value: "3", label: t("scheduleTable.windows.3") },
    { value: "7", label: t("scheduleTable.windows.7") },
    { value: "15", label: t("scheduleTable.windows.15") },
    { value: "30", label: t("scheduleTable.windows.30") },
  ];
  const [window, setWindow] = useState("7");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await services.contract.getAdminSchedule({
        type,
        window,
        excludeCompleted: true,
        branchId,
      });
      setRows(data);
    } catch (error) {
      utils.functions.swalToast(t("scheduleTable.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window, branchId]);

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
      <div className="schedule-table__table-container">
        <Table hover responsive>
          <thead>
            <tr>
              <th></th>
              <th>{t("scheduleTable.date")}</th>
              <th>{t("scheduleTable.time")}</th>
              <th>{t("scheduleTable.plate")}</th>
              <th>{t("scheduleTable.reservationNo")}</th>
              <th>{t("scheduleTable.vehicle")}</th>
              <th>{t("scheduleTable.customer")}</th>
              <th>{t("scheduleTable.days")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center">
                  <Spinner animation="border" size="sm" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center">
                  {t("scheduleTable.noRecords")}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const target = row[dateField];
                const daysRemaining = moment(target).startOf("day").diff(moment().startOf("day"), "days");
                const goToDetails = () => navigate(`${routes.adminContracts}/${row.id}`);
                return (
                  <tr
                    key={row.id}
                    onClick={goToDetails}
                    className={daysRemaining < 0 ? "schedule-table__row--overdue" : ""}
                  >
                    <td className="schedule-table__action">
                      <BsPlusCircle />
                    </td>
                    <td>{utils.functions.getDate(target)}</td>
                    <td>{utils.functions.getTime(target)}</td>
                    <td className="schedule-table__plate">{row.car?.licensePlate}</td>
                    <td className="schedule-table__contract">
                      {row.contractNo || row.id.slice(0, 10).toUpperCase()}
                    </td>
                    <td>{row.car?.brand} {row.car?.model}</td>
                    <td>{row.user?.companyTitle || `${row.user?.firstName || ""} ${row.user?.lastName || ""}`.trim()}</td>
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
