import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form } from "react-bootstrap";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import { formatMoney } from "../../contracts/details/contract-helpers";
import { FILTER_CATEGORIES } from "./ledger-constants";
import EntryModal from "./EntryModal";
import LedgerTable from "./LedgerTable";
import "../style.scss";

const { routes } = constants;

const EMPTY_FILTERS = { from: "", to: "", category: "" };

const AdminCariLedgerPage = () => {
  const { userId } = useParams();
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");
  const f = (key) => t(`finance.${key}`);
  const money = (v) => formatMoney(v, i18n.language);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [modal, setModal] = useState({ show: false, mode: "credit", entry: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await services.ledger.getUserLedger(userId, filters));
    } catch (error) {
      console.log(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = () => {
    setModal((m) => ({ ...m, show: false }));
    load();
  };

  const removeEntry = (entry) => {
    utils.functions.swalQuestion(f("deleteConfirmTitle"), f("deleteConfirmText"), { danger: true }).then(async (res) => {
      if (!res.isConfirmed) return;
      try {
        await services.ledger.deleteLedgerEntry(entry.id);
        utils.functions.swalToast(f("deleted"), "success");
        load();
      } catch (error) {
        utils.functions.swalToast(error?.response?.data?.message || f("saveError"), "error");
      }
    });
  };

  const openEntry = (row) =>
    setModal({ show: true, mode: row.direction === "CREDIT" ? "credit" : "debit", entry: row });

  const balanceClass = useMemo(() => {
    if (!data) return "";
    return data.balance < 0 ? "is-negative" : "is-positive";
  }, [data]);

  const setFilter = (key) => (e) => setFilters((s) => ({ ...s, [key]: e.target.value }));
  const filtered = Boolean(filters.from || filters.to || filters.category);

  if (loading && !data) return <Loading height={400} />;
  if (!data) return <div className="finance-page">{f("loadError")}</div>;

  return (
    <div className="finance-page">
      <div className="finance-page__head">
        <div>
          <Link to={routes.adminFinance} className="finance-page__back">
            &larr; {f("backToList")}
          </Link>
          <h2>
            {data.user.name}
            {data.user.customerCode && <span className="finance-page__code">{data.user.customerCode}</span>}
          </h2>
        </div>
        <span className={`finance-page__balance ${balanceClass}`}>
          {f("currentBalance")}: {money(data.balance)} TL
        </span>
      </div>

      <div className="finance-page__actions">
        <Button onClick={() => setModal({ show: true, mode: "credit", entry: null })}>{f("collectAction")}</Button>
        <Button variant="outline-primary" onClick={() => setModal({ show: true, mode: "debit", entry: null })}>
          {f("chargeAction")}
        </Button>
        <span className="finance-page__actions-spacer" />
        <Link to={`${routes.adminFinance}/cari/${userId}/ekstre`} target="_blank" className="btn btn-outline-secondary">
          {f("printStatement")}
        </Link>
      </div>

      <div className="finance-page__filters">
        <label>
          {f("filters.from")}
          <Form.Control size="sm" type="date" value={filters.from} onChange={setFilter("from")} />
        </label>
        <label>
          {f("filters.to")}
          <Form.Control size="sm" type="date" value={filters.to} onChange={setFilter("to")} />
        </label>
        <label>
          {f("filters.category")}
          <Form.Select size="sm" value={filters.category} onChange={setFilter("category")}>
            <option value="">{f("filters.allCategories")}</option>
            {FILTER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`finance.categories.${c}`)}
              </option>
            ))}
          </Form.Select>
        </label>
        {filtered && (
          <Button size="sm" variant="link" onClick={() => setFilters(EMPTY_FILTERS)}>
            {f("filters.clear")}
          </Button>
        )}
      </div>

      <LedgerTable data={data} filtered={filtered} money={money} onEdit={openEntry} onRemove={removeEntry} />

      <EntryModal
        show={modal.show}
        mode={modal.mode}
        entry={modal.entry}
        userId={userId}
        onHide={() => setModal((m) => ({ ...m, show: false }))}
        onSaved={onSaved}
      />
    </div>
  );
};

export default AdminCariLedgerPage;
