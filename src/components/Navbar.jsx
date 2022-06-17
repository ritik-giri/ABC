import { Navbar, Container, Nav, Image } from "react-bootstrap";
import { Link } from "react-router-dom";

const Navigation = () => {
    return (
        <div>
            <Navbar bg="dark" variant="dark">
                <Container>
                    <Link to={{ pathname: "https://cdh-official.netlify.app" }} target="_blank">
                        <Image
                            src="/logo.png"
                            style={{ height: "30%", width: "30%" }}
                            roundedCircle
                        />
                    </Link>
                    <Navbar.Brand as={Link} to="/">
                        Career Development Hub
                    </Navbar.Brand>
                </Container>
            </Navbar>
            <Nav variant="tabs" defaultActiveKey="/home">
                <Nav.Item>
                    <Nav.Link as={Link} to={"/"}>
                        Home Page
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link as={Link} to={"/questions"}>
                        Questions Page
                    </Nav.Link>
                </Nav.Item>
            </Nav>
        </div>
    );
};

export default Navigation;
