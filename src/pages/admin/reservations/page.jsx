import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Loading } from "../../../components";
import { constants } from "../../../constants";
import "../contracts/style.scss";

const { routes } = constants;
const PAGE_SIZES = [10, 25, 50, 100];

const AdminReservationsPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [plate, setPlate] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ plate: "", customer: "", status: "" });

  const c = (key) => t(`reservations.booking.${key}`);

  const load = async () => {
    setLoading(true);
    try {
      const data = await services.reservation.getReservationsByPageAdmin(page, size, applied);
      setRows(data.content || []);
      setTotal(data.totalElements || 0);
    } catch (error) {
      console.log(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, applied]);

  const applyFilters = () => {
    setPage(0);
    setApplied({ plate: plate.trim(), customer: customer.trim(), status });
  };

  const runAction = async (id, fn, confirmKey) => {
    if (confirmKey) {
      const res = await utils.functions.swalQuestion(c(`${confirmKey}Title`), c(`${confirmKey}Text`));
      if (!res.isConfirmed) return;
    }
    setBusyId(id);
    try {
      const result = await fn(id);
      if (result?.contractId) {
        navigate(`${routes.adminContracts}/${result.contractId}`);
        return;
      }
      utils.functions.swalToast(c("actionSuccess"), "success");
      load();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || c("actionError"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  return (
    <div className="contract-list">
      <div className="contract-list__toolbar">
        <h2>{c("title")}</h2>
        <div className="contract-list__toolbar-actions">
          <Button size="sm" onClick={() => navigate(`${routes.adminReservations}/new`)}>{c("new")}</Button>
        </div>
      </div>

      <div className="contract-list__filters">
        <Form.Select
          size="sm"
          value={size}
          onChange={(e) => {
            setPage(0);
            setSize(Number(e.target.value));
          }}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Form.Select>
        <span className="contract-list__count">{from}-{to} / {total}</span>
        <Form.Control
          size="sm"
          placeholder={c("plate")}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <Form.Control
          size="sm"
          placeholder={c("customer")}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <Form.Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{c("allStatuses")}</option>
          {constants.reservationStatus.map((s) => (
            <option key={s.value} value={s.value}>{tCommon(`options.reservationStatus.${s.value}`)}</option>
          ))}
        </Form.Select>
        <Button size="sm" variant="secondary" onClick={applyFilters}>{c("filter")}</Button>
      </div>

      <div className="contract-list__table-wrap">
        {loading ? (
          <Loading height={360} />
        ) : (
          <Table hover responsive className="contract-list__table">
            <thead>
              <tr>
                <th>{c("pickUpDate")}</th>
                <th>{c("dropOffDate")}</th>
                <th>{c("plate")}</th>
                <th>{c("customer")}</th>
                <th>{c("branchCode")}</th>
                <th>{c("vehicle")}</th>
                <th className="text-end">{c("days")}</th>
                <th>{c("status")}</th>
                <th className="text-end">{c("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted">{c("empty")}</td>
                </tr>
              )}
              {rows.map((r) => {
                const locked = r.status === "CANCELLED" || r.status === "CONVERTED";
                return (
                  <tr key={r.id}>
                    <td>{utils.functions.getDate(r.pickUpTime)}</td>
                    <td>{utils.functions.getDate(r.dropOffTime)}</td>
                    <td className="contract-list__plate">{r.plate || "—"}</td>
                    <td className="contract-list__customer">{r.customerName}</td>
                    <td>{r.branchCode || "—"}</td>
                    <td>{r.vehicle}</td>
                    <td className="text-end">{r.dayCount}</td>
                    <td>{tCommon(`options.reservationStatus.${r.status}`)}</td>
                    <td className="text-end contract-list__row-actions">
                      {busyId === r.id ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>
                          {r.contractId && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => navigate(`${routes.adminContracts}/${r.contractId}`)}
                            >
                              {c("openContract")}
                            </Button>
                          )}
                          {!locked && (
                            <>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => navigate(`${routes.adminReservations}/${r.id}`)}
                              >
                                {c("edit")}
                              </Button>
                              {r.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => runAction(r.id, services.reservation.confirmReservation)}
                                >
                                  {c("confirm")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => runAction(r.id, services.reservation.convertReservationToContract)}
                              >
                                {c("convert")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => runAction(r.id, services.reservation.cancelReservation, "cancel")}
                              >
                                {c("cancel")}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      <div className="contract-list__pager">
        <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>«</Button>
        <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
        <span>{page + 1} / {totalPages}</span>
        <Button size="sm" variant="outline-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>›</Button>
        <Button size="sm" variant="outline-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>»</Button>
      </div>
    </div>
  );
};

export default AdminReservationsPage;
