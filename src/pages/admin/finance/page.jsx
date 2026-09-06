import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Table } from "react-bootstrap";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { Loading } from "../../../components";
import { formatMoney } from "../contracts/details/contract-helpers";
import "./style.scss";

const { routes } = constants;

const AdminFinancePage = () => {
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");
  const navigate = useNavigate();
  const f = (key) => t(`finance.${key}`);
  const money = (v) => formatMoney(v, i18n.language);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  useEffect(() => {
    setLoading(true);
    services.user
      .getUsersByPage(0, 500, "firstName", "ASC", { role: "Customer", q: applied })
      .then((data) => setRows(data.content || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [applied]);

  const visible = useMemo(() => {
    const list = onlyDebtors ? rows.filter((r) => (r.balance ?? 0) < 0) : rows;
    return [...list].sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0));
  }, [rows, onlyDebtors]);

  return (
    <div className="finance-page">
      <div className="finance-page__toolbar">
        <h2>{f("pageTitle")}</h2>
        <div className="finance-page__toolbar-controls">
          <Form.Check
            type="checkbox"
            id="only-debtors"
            label={f("onlyDebtors")}
            checked={onlyDebtors}
            onChange={(e) => setOnlyDebtors(e.target.checked)}
          />
          <Form.Control
            size="sm"
            placeholder={f("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
          />
          <Button size="sm" variant="secondary" onClick={() => setApplied(search.trim())}>
            {f("filters.apply")}
          </Button>
        </div>
      </div>

      <div className="finance-page__panel">
        {loading ? (
          <Loading height={320} />
        ) : (
          <Table hover responsive className="ledger-table">
            <thead>
              <tr>
                <th>{f("list.code")}</th>
                <th>{f("list.name")}</th>
                <th>{f("list.type")}</th>
                <th className="text-end">{f("table.debit")}</th>
                <th className="text-end">{f("table.credit")}</th>
                <th className="text-end">{f("table.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="ledger-table__empty">
                    {f("list.empty")}
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id} onClick={() => navigate(`${routes.adminFinance}/cari/${r.id}`)} className="finance-page__row">
                  <td>
                    <span className="ledger-code">{r.customerCode || "—"}</span>
                  </td>
                  <td className="finance-page__name">{(r.companyTitle || `${r.firstName} ${r.lastName}`).trim() || "—"}</td>
                  <td>{r.customerType || "Bireysel"}</td>
                  <td className="text-end">{money(r.debit)}</td>
                  <td className="text-end">{money(r.credit)}</td>
                  <td className={`text-end ledger-table__bal${(r.balance ?? 0) < 0 ? " is-negative" : ""}`}>{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AdminFinancePage;
