import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonGroup, Table } from "react-bootstrap";
import { FaWhatsapp } from "react-icons/fa";
import { Loading } from "../../../../components";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { titleCaseTr, toWhatsAppNumber } from "../../contracts/details/contract-helpers";
import "./style.scss";

const VIEWS = ["pending", "requested"];

// "Google Yorumu İste" — every customer who returned a car, so the admin can
// send each one the same WhatsApp review request (the message the contract
// page's button uses) exactly once. Opening the chat marks the customer as
// asked; "Geri al" undoes it. Google ranks the Maps listing on review count
// and recency, and past customers are the only legitimate reviewers.
const AdminGoogleReviewsPage = () => {
  const { t, i18n } = useTranslation("admin");
  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(i18n.language?.startsWith("en") ? "en-GB" : "tr-TR") : "—";
  const [view, setView] = useState("pending");
  const [lists, setLists] = useState({ pending: [], requested: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLists(await services.review.getGoogleReviewRequests());
    } catch (error) {
      utils.functions.swalToast(t("googleReviewsPage.loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const whatsappHref = (row) => {
    const phone = toWhatsAppNumber(row.phoneNumber);
    if (!phone) return "";
    const message = t("reservations.contract.reviewRequest.message", {
      name: titleCaseTr(row.firstName || row.companyTitle),
      url: constants.website.googleReviewUrl,
    });
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // The link itself opens WhatsApp; this only moves the row to "İstendi" and
  // stores it (optimistically — a failed save reloads the real state).
  const markRequested = (row) => {
    const requestedAt = new Date().toISOString();
    setLists((prev) => ({
      pending: prev.pending.filter((r) => r.id !== row.id),
      requested: [{ ...row, requestedAt }, ...prev.requested],
    }));
    services.review.markGoogleReviewRequested(row.id).catch(() => {
      utils.functions.swalToast(t("googleReviewsPage.saveError"), "error");
      loadData();
    });
  };

  const undo = async (row) => {
    setBusyId(row.id);
    try {
      await services.review.clearGoogleReviewRequested(row.id);
      await loadData();
    } catch (error) {
      utils.functions.swalToast(t("googleReviewsPage.saveError"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const rows = lists[view];
  const isPending = view === "pending";

  return (
    <div className="admin-google-reviews">
      <div className="admin-google-reviews__toolbar">
        <h2>{t("googleReviewsPage.title")}</h2>
        <ButtonGroup>
          {VIEWS.map((v) => (
            <Button key={v} size="sm" variant={view === v ? "primary" : "outline-primary"} onClick={() => setView(v)}>
              {t(`googleReviewsPage.views.${v}`)}
              <span className="admin-google-reviews__count">{lists[v].length}</span>
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <p className="admin-google-reviews__hint">{t("googleReviewsPage.hint")}</p>

      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive className="admin-google-reviews__table">
          <thead>
            <tr>
              <th>{t("googleReviewsPage.table.customer")}</th>
              <th>{t("googleReviewsPage.table.lastReturn")}</th>
              <th className="text-center">{t("googleReviewsPage.table.rentals")}</th>
              {!isPending && <th>{t("googleReviewsPage.table.requestedAt")}</th>}
              <th aria-label={t("googleReviewsPage.table.actions")} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={isPending ? 4 : 5} className="text-center admin-google-reviews__empty">
                  {t(`googleReviewsPage.empty.${view}`)}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const href = isPending ? whatsappHref(row) : "";
              return (
                <tr key={row.id}>
                  <td className="admin-google-reviews__name">{titleCaseTr(row.name)}</td>
                  <td>{formatDate(row.lastReturnedAt)}</td>
                  <td className="text-center">{row.rentals}</td>
                  {!isPending && <td>{formatDate(row.requestedAt)}</td>}
                  <td className="admin-google-reviews__actions">
                    {isPending ? (
                      href ? (
                        <Button
                          as="a"
                          size="sm"
                          variant="outline-success"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markRequested(row)}
                        >
                          <FaWhatsapp /> {t("googleReviewsPage.open")}
                        </Button>
                      ) : (
                        <span className="admin-google-reviews__muted">{t("googleReviewsPage.noPhone")}</span>
                      )
                    ) : (
                      <Button size="sm" variant="link" disabled={busyId === row.id} onClick={() => undo(row)}>
                        {t("googleReviewsPage.undo")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AdminGoogleReviewsPage;
