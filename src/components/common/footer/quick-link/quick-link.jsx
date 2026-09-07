import { Link } from "react-router-dom";
import { BsArrowRight } from "react-icons/bs";
import "./quick-link.scss";

const QuickLink = ({ direct, pathname, text }) => (
  <li className="quick-link">
    <Link to={direct} className={pathname === direct ? "active" : ""}>
      <span>{text}</span>
      <BsArrowRight className="quick-link__arrow" />
    </Link>
  </li>
);

export default QuickLink;
