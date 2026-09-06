import { Container } from "react-bootstrap";
import { BsFacebook, BsInstagram, BsTwitter, BsYoutube, BsLinkedin } from "react-icons/bs";
import { constants } from "../../../../constants";
import "./top-menu.scss";

const {
  website: { email, phone, facebook, instagram, twitter, youtube, linkedin },
} = constants;

const socials = [
  { title: "instagram", url: instagram, icon: <BsInstagram /> },
  { title: "facebook", url: facebook, icon: <BsFacebook /> },
  { title: "twitter", url: twitter, icon: <BsTwitter /> },
  { title: "youtube", url: youtube, icon: <BsYoutube /> },
  { title: "linkedin", url: linkedin, icon: <BsLinkedin /> },
];

// Thin dark strip above the main header row: contact details + social links.
const TopMenu = () => (
  <div className="top-bar">
    <Container className="top-bar__inner">
      <div className="top-bar__contact">
        <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
        <span className="top-bar__sep" />
        <a href={`mailto:${email}`}>{email}</a>
      </div>
      <ul className="top-bar__social">
        {socials.map((s) => (
          <li key={s.title}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.title}>
              {s.icon}
            </a>
          </li>
        ))}
      </ul>
    </Container>
  </div>
);

export default TopMenu;
