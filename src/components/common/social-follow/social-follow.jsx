import { useTranslation } from "react-i18next";
import { FaFacebookF } from "react-icons/fa";
import { constants } from "../../../constants";
import "./social-follow.scss";

const {
  website: { social = {} },
} = constants;

// Invites a visitor to follow Rentwin's Facebook page at the moments they are
// most likely to: on the contact page, under the campaigns, and right after a
// booking. `context` picks the copy (common.json → socialFollow.<context>).
// Renders nothing while `website.social.facebook` is empty.
const SocialFollow = ({ context = "contact", className = "" }) => {
  const { t } = useTranslation("common");
  if (!social.facebook) return null;

  return (
    <aside className={`social-follow ${className}`.trim()}>
      <span className="social-follow__icon" aria-hidden="true">
        <FaFacebookF />
      </span>
      <div className="social-follow__body">
        <p className="social-follow__title">{t(`socialFollow.${context}.title`)}</p>
        <p className="social-follow__text">{t(`socialFollow.${context}.text`)}</p>
      </div>
      <a
        className="social-follow__button"
        href={social.facebook}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("socialFollow.button")}
      </a>
    </aside>
  );
};

export default SocialFollow;
