import { useEffect, useState } from "react";
import { Alert, ProgressBar } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Loading } from "../../../../components";
import { services } from "../../../../services";

const CustomerScoreTab = ({ userId }) => {
  const { t } = useTranslation("admin");
  const c = (key, options) => t(`users.scoreTab.${key}`, options);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    services.user
      .getCustomerScoreAdmin(userId)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return <Loading height={160} />;
  if (error) return <Alert variant="danger">{c("error")}</Alert>;
  if (!summary) return <Alert variant="danger">{c("error")}</Alert>;

  const hasScore = summary.score !== null;

  return (
    <section className="customer-form__card">
      <h3>{c("title")}</h3>
      <p className="text-muted">{c("description")}</p>

      {hasScore ? (
        <>
          <div className="d-flex align-items-center gap-3 mb-3">
            <strong className="fs-3">{summary.score}%</strong>
            <span>{c("onTimeRate")}</span>
          </div>
          <ProgressBar now={summary.score} aria-label={c("onTimeRate")} className="mb-3" />
        </>
      ) : (
        <Alert variant="info">{c("insufficientHistory", {
          count: summary.completedRentals,
          required: summary.minimumCompletedRentals,
        })}</Alert>
      )}

      <ul className="mb-3">
        <li>{c("completedRentals", { count: summary.completedRentals })}</li>
        <li>{c("onTimeReturns", { count: summary.onTimeReturns })}</li>
        <li>{c("lateReturns", { count: summary.lateReturns })}</li>
      </ul>

      <Alert variant="warning" className="mb-0">{c("limitations")}</Alert>
    </section>
  );
};

export default CustomerScoreTab;
