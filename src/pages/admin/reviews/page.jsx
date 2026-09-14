import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonGroup, Table } from "react-bootstrap";
import { BsCheckLg, BsTrash, BsXLg } from "react-icons/bs";
import { CustomPagination, Loading, StarRating } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

// Admin moderation queue for /yorumlar submissions (Faz 3/3). Visitor
// submissions land PENDING and stay invisible on the public site until
// approved here — see reviews.controller.js on the backend.
const AdminReviewsPage = () => {
  const { t } = useTranslation("admin");
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [paging, setPaging] = useState({ pageNumber: 0, totalPages: 0 });
  const [busyId, setBusyId] = useState(null);

  const loadData = async (page, forStatus) => {
    setLoading(true);
    try {
      const data = await services.review.getReviewsByPageAdmin(page, PAGE_SIZE, forStatus);
      setReviews(data.content);
      setPaging({ pageNumber: data.number, totalPages: data.totalPages });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(0, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const runAction = async (id, action) => {
    setBusyId(id);
    try {
      await action(id);
      utils.functions.swalToast(t("reviewsPage.actionSuccess"), "success");
      loadData(paging.pageNumber, status);
    } catch (error) {
      utils.functions.swalToast(t("reviewsPage.actionError"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (review) => runAction(review.id, services.review.approveReview);
  const handleReject = (review) => runAction(review.id, services.review.rejectReview);

  const handleDelete = (review) => {
    utils.functions
      .swalQuestion(t("reviewsPage.deleteTitle"), t("reviewsPage.deleteText"), { danger: true })
      .then((result) => {
        if (result.isConfirmed) runAction(review.id, services.review.deleteReview);
      });
  };

  return (
    <div className="admin-reviews-page">
      <div className="admin-reviews-page__toolbar">
        <h2>{t("reviewsPage.title")}</h2>
        <ButtonGroup>
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "primary" : "outline-primary"}
              onClick={() => setStatus(s)}
            >
              {t(`reviewsPage.status.${s}`)}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <p className="admin-reviews-page__hint">{t("reviewsPage.hint")}</p>

      {loading ? (
        <Loading height={300} />
      ) : (
        <>
          <Table hover responsive className="admin-reviews-page__table">
            <thead>
              <tr>
                <th>{t("reviewsPage.table.name")}</th>
                <th>{t("reviewsPage.table.rating")}</th>
                <th>{t("reviewsPage.table.body")}</th>
                <th>{t("reviewsPage.table.date")}</th>
                <th>{t("reviewsPage.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center">
                    {t("reviewsPage.empty")}
                  </td>
                </tr>
              )}
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.name}</td>
                  <td>
                    <StarRating value={review.rating} size="1rem" />
                  </td>
                  <td className="admin-reviews-page__body">{review.body}</td>
                  <td>{utils.functions.getDate(review.createdAt)}</td>
                  <td className="admin-reviews-page__actions">
                    {review.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline-success"
                        className="me-2"
                        disabled={busyId === review.id}
                        onClick={() => handleApprove(review)}
                        title={t("reviewsPage.approve")}
                      >
                        <BsCheckLg />
                      </Button>
                    )}
                    {review.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline-warning"
                        className="me-2"
                        disabled={busyId === review.id}
                        onClick={() => handleReject(review)}
                        title={t("reviewsPage.reject")}
                      >
                        <BsXLg />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={busyId === review.id}
                      onClick={() => handleDelete(review)}
                      title={t("reviewsPage.delete")}
                    >
                      <BsTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {paging.totalPages > 1 && (
            <CustomPagination paging={paging} loadData={(page) => loadData(page, status)} />
          )}
        </>
      )}
    </div>
  );
};

export default AdminReviewsPage;
