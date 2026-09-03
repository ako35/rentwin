import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Loading } from "../../../components";
import { constants } from "../../../constants";
import "./style.scss";

const { routes } = constants;
const PAGE_SIZES = [10, 25, 50, 100];

const AdminUsersPage = () => {
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await services.user.getUsersByPage(page, size, "createdAt", "DESC", {
        role: "Customer",
        q: applied,
      });
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
      const download = await services.user.downloadUserReports();
      const url = window.URL.createObjectURL(download);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      utils.functions.swalToast(t("users.toasts.downloadSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(t("users.toasts.downloadError"), "error");
    } finally {
      setDownloading(false);
    }
  };

  const applyFilters = () => {
    setPage(0);
    setApplied(search.trim());
  };

  const money = (v) =>
    Number(v || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  const c = (key) => t(`users.list.${key}`);

  return (
    <div className="customer-list">
      <div className="customer-list__toolbar">
        <h2>{t("users.listTitle")}</h2>
        <div className="customer-list__toolbar-actions">
          <Button variant="outline-primary" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading && <Spinner animation="border" size="sm" />} {t("users.downloadData")}
          </Button>
          <Button size="sm" onClick={() => navigate(`${routes.adminUsers}/new`)}>{c("new")}</Button>
        </div>
      </div>

      <div className="customer-list__filters">
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
        <span className="customer-list__count">
          {from}-{to} / {total}
        </span>
        <Form.Control
          size="sm"
          placeholder={c("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <Button size="sm" variant="secondary" onClick={applyFilters}>{c("filter")}</Button>
      </div>

      <div className="customer-list__table-wrap">
        {loading ? (
          <Loading height={360} />
        ) : (
          <Table hover responsive className="customer-list__table">
            <thead>
              <tr>
                <th>{c("active")}</th>
                <th>{c("code")}</th>
                <th>{c("name")}</th>
                <th>{c("type")}</th>
                <th>{c("nationalId")}</th>
                <th>{c("phone")}</th>
                <th>{c("email")}</th>
                <th className="text-end">{c("debit")}</th>
                <th className="text-end">{c("credit")}</th>
                <th className="text-end">{c("balance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted">{c("empty")}</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`${routes.adminUsers}/${r.id}`)}>
                  <td className="text-center">
                    <span className={r.active === false ? "customer-list__off" : "customer-list__on"}>
                      {r.active === false ? "✕" : "✓"}
                    </span>
                  </td>
                  <td className="customer-list__code">{r.customerCode || "—"}</td>
                  <td className="customer-list__name">
                    {(r.companyTitle || `${r.firstName} ${r.lastName}`).trim() || "—"}
                  </td>
                  <td>{r.customerType || "Bireysel"}</td>
                  <td>{r.nationalId || "—"}</td>
                  <td>{r.phoneNumber || "—"}</td>
                  <td className="customer-list__email">{r.email}</td>
                  <td className="text-end">{money(r.debit)}</td>
                  <td className="text-end">{money(r.credit)}</td>
                  <td className={`text-end${r.balance < 0 ? " customer-list__neg" : ""}`}>
                    {money(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="customer-list__pager">
        <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage(0)}>«</Button>
        <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
        <span>{page + 1} / {totalPages}</span>
        <Button size="sm" variant="outline-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>›</Button>
        <Button size="sm" variant="outline-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>»</Button>
      </div>
    </div>
  );
};

export default AdminUsersPage;
