import StarRating from "../../star-rating/star-rating";
import { utils } from "../../../../utils";
import "./review-card.scss";

// A single approved review — public list + homepage teaser. `review.name`
// arrives already masked by the backend ("Ayşe Y.").
const ReviewCard = ({ review }) => (
  <div className="review-card">
    <div className="review-card__head">
      <StarRating value={review.rating} />
      <span className="review-card__date">{utils.functions.getDate(review.createdAt)}</span>
    </div>
    <p className="review-card__body">{review.body}</p>
    <p className="review-card__name">{review.name}</p>
  </div>
);

export default ReviewCard;
