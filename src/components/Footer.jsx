const { Alert } = require("react-bootstrap");

const Footer = () => {
    return <Alert variant={"dark"} style={{
        bottom: "0",
        width: "100%",
        textAlign: "center",
        borderRadius: "0",
    }}>Career Development Hub @ {new Date().getFullYear()}</Alert>;
};

export default Footer;