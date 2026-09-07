import { useState } from "react";
import { BsLinkedin, BsArrowRight } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import "./member.scss";

// One team card: square, uniformly-framed photo, dark bold name, brand-green
// role, a two-line bio and an optional LinkedIn link (rendered only when the
// member has a `linkedin` URL in the i18n data). If the photo is missing or
// fails to load the frame falls back to the member's name on a plain ground.
const TeamMember = ({ image, imagePos, name, title, desc, linkedin }) => {
  const { t } = useTranslation("home");
  const [imageOk, setImageOk] = useState(true);

  return (
    <article className="team-member">
      <div className="team-member__photo">
        {image && imageOk ? (
          <img
            src={`/img/${image}`}
            alt={name}
            loading="lazy"
            decoding="async"
            style={imagePos ? { objectPosition: imagePos } : undefined}
            onError={() => setImageOk(false)}
          />
        ) : (
          <span className="team-member__noimg">{name}</span>
        )}
      </div>
      <div className="team-member__body">
        <h3 className="team-member__name">{name}</h3>
        <p className="team-member__title">{title}</p>
        <p className="team-member__desc">{desc}</p>
        {linkedin && (
          <a
            className="team-member__link"
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsLinkedin />
            {t("sections.team.linkedin")}
            <BsArrowRight />
          </a>
        )}
      </div>
    </article>
  );
};

export default TeamMember;
