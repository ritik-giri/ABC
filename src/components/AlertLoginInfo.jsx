import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import React from "react";
import app from "../firebase";
import { connect } from "react-redux";
import { Alert, Button } from "react-bootstrap";
import { setAuth, setUser } from "../redux/actions/actions";
import { withCookies } from "react-cookie";

const mapStateToProps = (state) => {
    return { state };
};

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch: (action) => {
            dispatch(action);
        },
    };
};

class AlertLoginInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loginError: false,
        };
    }

    componentDidMount() {
        this.signInEvent = this.signInEvent.bind(this);
        this.signOutEvent = this.signOutEvent.bind(this);
        this.updateLoginStatus = this.updateLoginStatus.bind(this);
        this.props.cookies.addChangeListener(() => window.location.reload());
        this.updateLoginStatus();
    }

    updateLoginStatus() {
        const {
            cookies: { tokenId: token },
        } = this.props.cookies;
        const headers = { token };

        fetch("/request/login", { method: "POST", headers })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.OK) {
                    this.props.dispatch(setAuth(true));
                    this.props.dispatch(setUser(data.contributor));
                } else {
                    this.props.dispatch(setAuth(false));
                }
            })
            .catch((err) => {
                setTimeout(() => this.props.dispatch(setAuth(false)), 2000);
            });
    }

    signInEvent() {
        signInWithPopup(getAuth(), new GoogleAuthProvider(app))
            .then((result) => {
                const isContributor = this.props.state.contributors.some(
                    (contributor) => contributor.email === result.user.email
                );

                if (!isContributor) {
                    this.setState({
                        loginError: true,
                    });

                    setTimeout(() => {
                        this.setState({
                            loginError: false,
                        });
                    }, 3000);
                } else {
                    getAuth()
                        .currentUser.getIdToken(true)
                        .then((tokenId) => {
                            this.props.cookies.set("tokenId", tokenId, {
                                path: "/",
                            });
                            this.updateLoginStatus();
                        });
                }
            })
            .catch(console.error);
    }

    signOutEvent() {
        signOut(getAuth())
            .then(() => {
                this.props.cookies.remove("tokenId", { path: "/" });
                this.updateLoginStatus();
            })
            .catch((error) => {
                console.error(error);
            });
    }

    render() {
        return this.props.state.auth === true &&
            this.props.state.user !== null ? (
            <Alert variant="info" className="rounded-0">
                You are logged in as <b>{this.props.state.user.email}</b>
                {" ("}
                <span
                    style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                    }}
                    onClick={this.signOutEvent}
                >
                    logout
                </span>
                {")"}
            </Alert>
        ) : this.state.loginError ? (
            <Alert variant="danger">Account is not authorized to login.</Alert>
        ) : (
            <Alert variant="info">
                Login with registered Google Account to access the internal
                tools.
                <div className="d-flex justify-content-end">
                    <Button
                        variant="outline-info"
                        style={{ marginRight: "10px" }}
                        onClick={this.signInEvent}
                    >
                        Login
                    </Button>
                </div>
            </Alert>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withCookies(AlertLoginInfo));
