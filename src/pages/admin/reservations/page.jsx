import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import moment from "moment/moment";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Loading } from "../../../components";
import { constants } from "../../../constants";
import "./style.scss";

const { routes } = constants;
const PAGE_SIZES = [10, 25, 50, 100];

const NEW_FORM = {
  carId: "",
  userId: "",
  pickUpLocation: "",
  dropOffLocation: "",
  pickUpDate: moment().format("YYYY-MM-DD"),
  pickUpTime: "10:00",
  dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
  dropOffTime: "10:00",
};

const AdminReservationsPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [plate, setPlate] = useState("");
  const [customer, setCustomer] = useState("");
  const [applied, setApplied] = useState({ plate: "", customer: "" });

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(NEW_FORM);
  const [savingNew, setSavingNew] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);

  const openNew = () => {
    setNewForm(NEW_FORM);
    setShowNew(true);
    if (!vehicles.length) {
      Promise.all([
        services.vehicle.getVehicles(),
        services.user.getUsersByPage(0, 300),
        services.branch.getBranches().catch(() => []),
      ]).then(([v, u, b]) => {
        setVehicles(v || []);
        setCustomers((u?.content || []).filter((x) => x.roles?.includes("Customer")));
        setBranches(b || []);
      });
    }
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setNF = (key) => (e) => setNewForm((f) => ({ ...f, [key]: e.target.value }));
  const canCreate = useMemo(
    () =>
      newForm.carId &&
      newForm.userId &&
      moment(`${newForm.dropOffDate} ${newForm.dropOffTime}`).isAfter(
        moment(`${newForm.pickUpDate} ${newForm.pickUpTime}`)
      ),
    [newForm]
  );

  const createContract = async () => {
    setSavingNew(true);
    try {
      const { id } = await services.reservation.createReservationAdmin({
        carId: newForm.carId,
        userId: newForm.userId,
        pickUpLocation: newForm.pickUpLocation,
        dropOffLocation: newForm.dropOffLocation || newForm.pickUpLocation,
        pickUpTime: utils.functions.combineDateAndTime(newForm.pickUpDate, newForm.pickUpTime),
        dropOffTime: utils.functions.combineDateAndTime(newForm.dropOffDate, newForm.dropOffTime),
      });
      navigate(`${routes.adminReservations}/${id}`);
    } catch (error) {
      utils.functions.swalToast(t("newContract.error"), "error");
      setSavingNew(false);
    }
  };

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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await services.reservation.downloadReservationReports();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "reservations.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      utils.functions.swalToast(t("reservations.toasts.downloadSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(t("reservations.toasts.downloadError"), "error");
    } finally {
      setDownloading(false);
    }
  };

  const applyFilters = () => {
    setPage(0);
    setApplied({ plate: plate.trim(), customer: customer.trim() });
  };

  const money = (v) =>
    Number(v || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const c = (key) => t(`reservations.contractList.${key}`);

  return (
    <div className="contract-list">
      <div className="contract-list__toolbar">
        <h2>{c("title")}</h2>
        <div className="contract-list__toolbar-actions">
          <Button variant="outline-primary" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading && <Spinner animation="border" size="sm" />} {c("exportExcel")}
          </Button>
          <Button size="sm" onClick={openNew}>{c("new")}</Button>
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
        <span className="contract-list__count">
          {from}-{to} / {total}
        </span>
        <Form.Control
          size="sm"
          placeholder={c("plate")}
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <Form.Control
          size="sm"
          placeholder={c("customerDriver")}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <Button size="sm" variant="secondary" onClick={applyFilters}>{c("filter")}</Button>
      </div>

      <div className="contract-list__table-wrap">
        {loading ? (
          <Loading height={360} />
        ) : (
          <Table hover responsive className="contract-list__table">
            <thead>
              <tr>
                <th>{c("dropOffDate")}</th>
                <th>{c("dropOffTime")}</th>
                <th>{c("plate")}</th>
                <th>{c("contractNo")}</th>
                <th>{c("customer")}</th>
                <th>{c("branchCode")}</th>
                <th>{c("vehicle")}</th>
                <th className="text-end">{c("days")}</th>
                <th className="text-end">{c("amount")}</th>
                <th className="text-end">{c("balance")}</th>
                <th>{c("status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center text-muted">{c("empty")}</td>
                </tr>
              )}
              {rows.map((r) => {
                const balance = (r.collected || 0) - (r.totalPrice || 0);
                return (
                  <tr key={r.id} onClick={() => navigate(`${routes.adminReservations}/${r.id}`)}>
                    <td>{utils.functions.getDate(r.dropOffTime)}</td>
                    <td>{utils.functions.getTime(r.dropOffTime)}</td>
                    <td className="contract-list__plate">{r.plate || "—"}</td>
                    <td className="contract-list__no">{r.id.slice(0, 10).toUpperCase()}</td>
                    <td className="contract-list__customer">{r.customerName}</td>
                    <td>{r.branchCode || "—"}</td>
                    <td>{r.vehicle}</td>
                    <td className="text-end">
                      {r.dayCount}
                      {r.extensionDays ? ` (+${r.extensionDays})` : ""}
                    </td>
                    <td className="text-end">{money(r.totalPrice)}</td>
                    <td className={`text-end${balance < 0 ? " contract-list__neg" : ""}`}>
                      {money(balance)}
                    </td>
                    <td>{tCommon(`options.reservationStatus.${r.status}`)}</td>
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

      <Modal show={showNew} onHide={() => setShowNew(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t("newContract.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{t("newContract.vehicle")}</Form.Label>
            <Form.Select value={newForm.carId} onChange={setNF("carId")}>
              <option value="">{t("newContract.selectVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} — {v.brand} {v.model}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t("newContract.customer")}</Form.Label>
            <Form.Select value={newForm.userId} onChange={setNF("userId")}>
              <option value="">{t("newContract.selectCustomer")}</option>
              {customers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} — {u.email}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <div className="contract-list__new-grid">
            <Form.Group>
              <Form.Label>{t("reservations.contract.pickUpLocation")}</Form.Label>
              <Form.Control list="nc-branches" value={newForm.pickUpLocation} onChange={setNF("pickUpLocation")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("reservations.contract.dropOffLocation")}</Form.Label>
              <Form.Control list="nc-branches" value={newForm.dropOffLocation} onChange={setNF("dropOffLocation")} />
            </Form.Group>
            <datalist id="nc-branches">
              {branches.map((b) => <option key={b.id} value={b.name} />)}
            </datalist>
            <Form.Group>
              <Form.Label>{t("reservations.contract.pickUpDate")}</Form.Label>
              <Form.Control type="date" value={newForm.pickUpDate} onChange={setNF("pickUpDate")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("reservations.form.pickUpTime")}</Form.Label>
              <Form.Control type="time" value={newForm.pickUpTime} onChange={setNF("pickUpTime")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("reservations.contract.dropOffDate")}</Form.Label>
              <Form.Control type="date" value={newForm.dropOffDate} min={newForm.pickUpDate} onChange={setNF("dropOffDate")} />
            </Form.Group>
            <Form.Group>
              <Form.Label>{t("reservations.form.dropOffTime")}</Form.Label>
              <Form.Control type="time" value={newForm.dropOffTime} onChange={setNF("dropOffTime")} />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowNew(false)}>{t("reservations.cancel")}</Button>
          <Button onClick={createContract} disabled={!canCreate || savingNew}>
            {savingNew && <Spinner animation="border" size="sm" />} {t("newContract.create")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminReservationsPage;
