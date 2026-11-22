import { useTranslation } from "react-i18next";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { constants } from "../../../constants";
import "./social-follow.scss";

const {
  website: { social = {} },
} = constants;

// Invites a visitor to follow Rentwin at the moments they are most likely to:
// on the contact page, under the campaigns, and right after a booking.
// Instagram leads (most local customers use it); Facebook stays as a second,
// smaller button. `context` picks the copy (common.json →
// socialFollow.<context>). Renders nothing while neither profile is set.
const SocialFollow = ({ context = "contact", className = "" }) => {
  const { t } = useTranslation("common");
  if (!social.instagram && !social.facebook) return null;
  const lead = social.instagram ? "instagram" : "facebook";

  return (
    <aside className={`social-follow social-follow--${lead} ${className}`.trim()}>
      <span className="social-follow__icon" aria-hidden="true">
        {lead === "instagram" ? <FaInstagram /> : <FaFacebookF />}
      </span>
      <div className="social-follow__body">
        <p className="social-follow__title">{t(`socialFollow.${context}.title`)}</p>
        <p className="social-follow__text">{t(`socialFollow.${context}.text`)}</p>
      </div>
      <div className="social-follow__actions">
        {social.instagram && (
          <a
            className="social-follow__button social-follow__button--instagram"
            href={social.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaInstagram aria-hidden="true" /> {t("socialFollow.instagramButton")}
          </a>
        )}
        {social.facebook && (
          <a
            className="social-follow__button social-follow__button--facebook"
            href={social.facebook}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaFacebookF aria-hidden="true" /> {t("socialFollow.facebookButton")}
          </a>
        )}
      </div>
    </aside>
  );
};

export default SocialFollow;
