import { BsArrowRight } from "react-icons/bs";
import AppLink from "../../app-link/app-link";
import { stripLocalePrefix } from "../../../../i18n/locale-routing";
import "./quick-link.scss";

const QuickLink = ({ direct, pathname, text }) => (
  <li className="quick-link">
    <AppLink to={direct} className={stripLocalePrefix(pathname) === direct ? "active" : ""}>
      <span>{text}</span>
      <BsArrowRight className="quick-link__arrow" />
    </AppLink>
  </li>
);

export default QuickLink;
