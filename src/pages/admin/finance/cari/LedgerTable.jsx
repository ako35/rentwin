import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment/moment";
import { constants } from "../../../../constants";

const { routes } = constants;

// The running-balance ledger: opening row (only when a filter narrows the view),
// one row per movement with a contract link / invoice no, a debit or credit
// column, the running balance, and edit/delete affordances on manual rows.
const LedgerTable = ({ data, filtered, money, onEdit, onRemove }) => {
  const { t } = useTranslation("admin");
  const f = (key) => t(`finance.${key}`);

  return (
    <div className="finance-page__panel">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>{f("table.date")}</th>
            <th>{f("table.doc")}</th>
            <th>{f("table.description")}</th>
            <th className="text-end">{f("table.debit")}</th>
            <th className="text-end">{f("table.credit")}</th>
            <th className="text-end">{f("table.balance")}</th>
            <th className="ledger-table__act" />
          </tr>
        </thead>
        <tbody>
          {filtered && (
            <tr className="ledger-table__opening">
              <td colSpan={5}>{f("table.opening")}</td>
              <td className="text-end">{money(data.opening)}</td>
              <td />
            </tr>
          )}
          {data.rows.length === 0 && (
            <tr>
              <td colSpan={7} className="ledger-table__empty">
                {f("table.empty")}
              </td>
            </tr>
          )}
          {data.rows.map((r) => {
            const manual = r.source === "MANUAL";
            return (
              <tr key={r.id}>
                <td>{moment(r.date).format("DD.MM.YYYY")}</td>
                <td>
                  {r.contractId ? (
                    <Link to={`${routes.adminContracts}/${r.contractId}`} className="ledger-table__doc">
                      {r.contractNo || "—"}
                    </Link>
                  ) : (
                    r.contractNo || r.invoiceNo || "—"
                  )}
                </td>
                <td>
                  <span className={`ledger-badge ledger-badge--${r.direction === "CREDIT" ? "credit" : "debit"}`}>
                    {t(`finance.categories.${r.category}`)}
                  </span>
                  {r.description && <span className="ledger-table__note"> {r.description}</span>}
                  {r.method && r.direction === "CREDIT" && (
                    <span className="ledger-table__note"> · {t(`finance.methods.${r.method}`)}</span>
                  )}
                </td>
                <td className="text-end">{r.direction === "DEBIT" ? money(r.amount) : ""}</td>
                <td className="text-end">{r.direction === "CREDIT" ? money(r.amount) : ""}</td>
                <td className="text-end ledger-table__bal">{money(r.balance)}</td>
                <td className="ledger-table__act">
                  {manual && (
                    <>
                      <button
                        type="button"
                        className="ghost-btn"
                        title={f("edit")}
                        onClick={() => onEdit(r)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="ghost-btn ghost-btn--danger"
                        title={f("delete")}
                        onClick={() => onRemove(r)}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>{f("table.totals")}</td>
            <td className="text-end">{money(data.debit)}</td>
            <td className="text-end">{money(data.credit)}</td>
            <td className="text-end ledger-table__bal">{money(data.balance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default LedgerTable;
