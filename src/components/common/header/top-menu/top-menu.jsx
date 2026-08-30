import {
  BsHeadset,
  BsFacebook,
  BsInstagram,
  BsTwitter,
  BsYoutube,
  BsLinkedin,
} from "react-icons/bs";
import { MdEmail } from "react-icons/md";
import { constants } from "../../../../constants";
import "./top-menu.scss";

const {
  website: { email, phone, facebook, instagram, twitter, youtube, linkedin },
} = constants;

const listItems = [
  {
    title: "instagram",
    url: instagram,
    icon: <BsInstagram />,
  },
  {
    title: "facebook",
    url: facebook,
    icon: <BsFacebook />,
  },
  {
    title: "twitter",
    url: twitter,
    icon: <BsTwitter />,
  },
  {
    title: "youtube",
    url: youtube,
    icon: <BsYoutube />,
  },
  {
    title: "linkedin",
    url: linkedin,
    icon: <BsLinkedin />,
  },
];

const TopMenu = () => {
  return (
    <div className="top-menu">
      <ul className="contact-bar">
        <li>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            rel="noopener noreferrer"
            className="d-none d-sm-inline"
          >
            <BsHeadset />
            <span> {phone}</span>
          </a>
        </li>
        <li>
          <a
            href={`mailto:${email}`}
            rel="noopener noreferrer"
            className="d-none d-sm-inline"
          >
            <MdEmail />
            <span> {email}</span>
          </a>
        </li>
      </ul>
      <ul className="social-bar">
        {listItems.map((item) => (
          <li key={item.title} className="d-none d-sm-inline">
            <a href={item.url} rel="noopener noreferrer">
              {item.icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopMenu;
