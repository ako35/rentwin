import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import { formatMoney } from "../../contracts/details/contract-helpers";
import "./print.scss";

const { website } = constants;

const AdminCariStatementPrintPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");
  const f = (key) => t(`finance.${key}`);
  const money = (v) => formatMoney(v, i18n.language);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.ledger
      .getUserLedger(userId, {})
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (data) document.title = `${f("statement.title")} — ${data.user.name}`;
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />;
  if (!data) return <div className="sprint">{f("loadError")}</div>;

  return (
    <div className="sprint">
      <div className="sprint__toolbar no-print">
        <button type="button" onClick={() => navigate(-1)}>
          {f("close")}
        </button>
        <button type="button" className="sprint__toolbar-print" onClick={() => window.print()}>
          {f("printStatement")}
        </button>
      </div>

      <article className="sprint-sheet">
        <header className="sprint-head">
          <div>
            <div className="sprint-head__brand">{website.name}</div>
            <div className="sprint-head__meta">
              {website.address} · {website.phone} · {website.email}
            </div>
          </div>
          <div className="sprint-head__doc">
            <div className="sprint-head__title">{f("statement.title")}</div>
            <div>{moment().format("DD.MM.YYYY")}</div>
          </div>
        </header>

        <section className="sprint-info">
          <div>
            <span>{f("statement.account")}</span>
            <strong>{data.user.name}</strong>
          </div>
          {data.user.customerCode && (
            <div>
              <span>{f("list.code")}</span>
              <strong>{data.user.customerCode}</strong>
            </div>
          )}
          <div>
            <span>{f("statement.closingBalance")}</span>
            <strong>{money(data.balance)} TL</strong>
          </div>
        </section>

        <table className="sprint-table">
          <thead>
            <tr>
              <th>{f("table.date")}</th>
              <th>{f("table.doc")}</th>
              <th>{f("table.description")}</th>
              <th className="num">{f("table.debit")}</th>
              <th className="num">{f("table.credit")}</th>
              <th className="num">{f("table.balance")}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{moment(r.date).format("DD.MM.YYYY")}</td>
                <td>{r.contractNo || r.invoiceNo || "—"}</td>
                <td>
                  {t(`finance.categories.${r.category}`)}
                  {r.description ? ` — ${r.description}` : ""}
                </td>
                <td className="num">{r.direction === "DEBIT" ? money(r.amount) : ""}</td>
                <td className="num">{r.direction === "CREDIT" ? money(r.amount) : ""}</td>
                <td className="num">{money(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{f("table.totals")}</td>
              <td className="num">{money(data.debit)}</td>
              <td className="num">{money(data.credit)}</td>
              <td className="num">{money(data.balance)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="sprint-note">{f("statement.note")}</p>
      </article>
    </div>
  );
};

export default AdminCariStatementPrintPage;
