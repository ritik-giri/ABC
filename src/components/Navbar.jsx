import { Navbar, Container, Nav, Image } from "react-bootstrap";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <div>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Image
            src="/cwc_logo.png"
            style={{ height: "50px", width: "50px" }}
            roundedCircle
          />
          <Navbar.Brand as={Link} to="/">Coding Wizards Club</Navbar.Brand>
        </Container>
      </Navbar>
      <Nav variant="tabs" defaultActiveKey="/home">
        <Nav.Item>
          <Nav.Link as={Link} to={"/"}>Home Page</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link as={Link} to={"/questions"}>Questions Page</Nav.Link>
        </Nav.Item>
      </Nav>
    </div>
  );
};

export default Navigation;
