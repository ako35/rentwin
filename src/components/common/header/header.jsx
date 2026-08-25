import { Container } from "react-bootstrap";
import { TopMenu, BottomMenu } from "../../";
import { Link } from "react-router-dom";
import "./header.scss";

const Header = () => {
  return (
    <Container className="p-0 fixed-top">
      <div className="header">
        <Link to="/" title="GO TO HOMEPAGE">
          <div className="logo">
            <img src="/logo.png" alt="Rentwin Logo" />
            <div className="logo_text">
              RENT<br /> <span>WIN</span>
              <p>YOUR RELIABLE RIDE, AS LONG AS YOU NEED</p>
            </div>
          </div>
        </Link>
        <div className="menus">
          <TopMenu />
          <BottomMenu />
        </div>
      </div>
    </Container>
  );
};

export default Header;
