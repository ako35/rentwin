import { useEffect, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { services } from "../../../../services";

const CustomerScoreRating = ({ userId }) => {
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

  if (loading) {
    return (
      <div className="customer-score-rating customer-score-rating--loading" aria-label={c("loading")}>
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  if (error || !summary) {
    return <Alert variant="danger" className="customer-score-rating__error">{c("error")}</Alert>;
  }

  const hasScore = summary.score !== null;

  return (
    <div className="customer-score-rating" title={c("limitations")}>
      <span className="customer-score-rating__value">
        {hasScore ? `${summary.score}%` : "—"}
      </span>
      <span className="customer-score-rating__details">
        <strong>{c("ratingTitle")}</strong>
        <span>
          {hasScore
            ? c("onTimeRate")
            : c("shortHistory", {
                count: summary.completedRentals,
                required: summary.minimumCompletedRentals,
              })}
        </span>
      </span>
    </div>
  );
};

export default CustomerScoreRating;
