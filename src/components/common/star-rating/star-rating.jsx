import { useState } from "react";
import { BsStar, BsStarFill } from "react-icons/bs";
import "./star-rating.scss";

// value: 1-5. Pass onChange to make it an interactive input (review form,
// admin table read is read-only so onChange is omitted there too — only the
// public submission form is interactive).
const StarRating = ({ value = 0, onChange, size = "1.25rem" }) => {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const display = interactive && hover ? hover : value;

  return (
    <div
      className={`star-rating${interactive ? " star-rating--interactive" : ""}`}
      style={{ fontSize: size }}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? undefined : `${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="star-rating__star"
          role={interactive ? "radio" : undefined}
          aria-checked={interactive ? value === n : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? () => onChange(n) : undefined}
          onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onChange(n)) : undefined}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
        >
          {n <= display ? <BsStarFill /> : <BsStar />}
        </span>
      ))}
    </div>
  );
};

export default StarRating;
