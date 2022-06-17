import {
    Container,
    Alert,
    Placeholder,
    Button,
    Modal,
    Badge,
    Spinner,
} from "react-bootstrap";

import _ from "lodash";
import React from "react";
import moment from "moment";
import { connect } from "react-redux";
import { instanceOf } from "prop-types";
import Navigation from "../../components/Navbar";
import { withCookies, Cookies } from "react-cookie";
import AlertLoginInfo from "../../components/AlertLoginInfo";
import { Link } from "react-router-dom";

const styles = {
    textarea: {
        resize: "none",
    },
    pre: {
        marginTop: "10px",
        whiteSpace: "pre-wrap",
    },
};

const mapStateToProps = (state) => {
    return { state };
};

class Question extends React.Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            data: {},
            method: null,
            confirmed: false,
            showModal: false,
            showAlert: false,
        };
    }

    componentDidMount() {
        if (this.props.location.state) {
            const variant = this.props.location.state.variant;
            const alertText = this.props.location.state.alertText;
            const showAlert = Boolean(this.props.location.state.showAlert);

            this.setState({ showAlert, variant, alertText }, () =>
                this.props.history.replace()
            );
        }

        this.postMCQ = this.postMCQ.bind(this);
        this.loadData = this.loadData.bind(this);
        this.reviewMCQ = this.reviewMCQ.bind(this);
        this.loadData();
    }

    showAlert(variant, text) {
        this.setState(
            {
                textAlert: text,
                showAlert: true,
                showModal: false,
                variantAlert: variant,
            },
            window.scrollTo(0, 0)
        );
    }

    loadData() {
        const {
            params: { id },
        } = this.props.match;

        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        fetch(`/mcq-get/question?id=${id}`, { headers })
            .then((resp) => resp.json())
            .then((data) => {
                const { OK, response, error } = data;
                if (OK && !error && response) {
                    this.setState({ data: response });
                } else throw Error(error);
            })
            .catch((e) => {
                this.props.history.push({
                    pathname: "/questions",
                    state: {
                        showAlert: true,
                        variant: "danger",
                        alertText: e.message,
                    },
                });
            });
    }

    reviewMCQ() {
        this.setState({ confirmed: true });

        const {
            action,
            data: { docId: id },
        } = this.state;

        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        fetch("/mcq-post/review", {
            method: "POST",
            headers,
            body: new URLSearchParams({ action, id }).toString(),
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.OK) this.showAlert("success", data.message);
                else throw Error(data.error);
            })
            .catch((error) => {
                this.showAlert("danger", error.message);
            })
            .finally(() => {
                this.loadData();
                this.setState({
                    confirmed: false,
                    showModal: false,
                });
            });
    }

    postMCQ() {
        this.setState({ confirmed: true });

        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        const {
            data: { docId: id },
        } = this.state;

        fetch(`/mcq-post/publish?id=${id}`, {
            method: "POST",
            headers,
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.OK) this.showAlert("success", data.message);
                else throw Error(data.error);
            })
            .catch((error) => {
                this.showAlert("danger", error.message);
            })
            .finally(() => {
                this.loadData();
                this.setState({
                    confirmed: false,
                    showModal: false,
                });
            });
    }

    getContributorName(codeName) {
        const find = this.props.state.contributors.find(
            (contributor) => contributor.code === codeName
        );
        return find ? find.name : "Anonymous";
    }

    timestampToDate(timestamp) {
        return moment(timestamp, "X").format("lll");
    }

    render() {
        return (
            <>
                <Navigation />
                <AlertLoginInfo />
                <Container style={{ padding: "20px" }}>
                    <Alert
                        show={this.state.showAlert}
                        variant={this.state.variantAlert}
                        className="rounded-0"
                        onClose={() => this.setState({ showAlert: false })}
                        dismissible
                    >
                        {this.state.textAlert}
                    </Alert>
                    {_.isEmpty(this.state.data) ||
                    !this.props.state.contributors ? (
                        <>
                            <b>Question:</b>
                            <pre style={styles.pre}>
                                <Placeholder as="p" animation="glow">
                                    <Placeholder xs={12} />
                                </Placeholder>
                            </pre>

                            <b>Options:</b>
                            {_.times(4, (id) => (
                                <pre key={id} style={styles.pre}>
                                    <Placeholder as="p" animation="glow">
                                        <Placeholder xs={12} />
                                    </Placeholder>
                                </pre>
                            ))}
                        </>
                    ) : (
                        <>
                            <b>Author:</b>
                            <pre style={styles.pre}>
                                {this.getContributorName(
                                    this.state.data.author
                                )}
                            </pre>

                            <b>Date {"&"} TIme:</b>
                            <pre style={styles.pre}>
                                {this.timestampToDate(this.state.data.date)}
                            </pre>

                            <b>Question: (Topic: {this.state.data.topic})</b>
                            <pre style={styles.pre}>
                                {this.state.data.question}
                            </pre>

                            {this.state.data.code && (
                                <>
                                    <b>
                                        Code: (Language:{" "}
                                        {this.state.data.language})
                                    </b>
                                    <pre
                                        style={{
                                            ...styles.pre,
                                            whiteSpace: "no-wrap",
                                        }}
                                    >
                                        {this.state.data.code}
                                    </pre>
                                </>
                            )}
                            {this.state.data.explanation && (
                                <>
                                    <b>Explanation:</b>
                                    <pre style={styles.pre}>
                                        {this.state.data.explanation}
                                    </pre>
                                </>
                            )}

                            <b>Options:</b>
                            {[
                                "option_1_value",
                                "option_2_value",
                                "option_3_value",
                                "option_4_value",
                            ].map((option, idx) => (
                                <pre key={idx} style={styles.pre}>
                                    {idx + 1} {">"} {this.state.data[option]}{" "}
                                    {option.includes(
                                        this.state.data.correct_option
                                    ) && (
                                        <Badge pill bg="success">
                                            correct
                                        </Badge>
                                    )}
                                </pre>
                            ))}

                            <Modal
                                show={this.state.showModal}
                                backdrop="static"
                                onHide={() =>
                                    this.setState({ showModal: false })
                                }
                            >
                                <Modal.Header>
                                    <Modal.Title>Are you Sure?</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    <Alert variant={"danger"}>
                                        <b>Remember:</b> This is a permanent
                                        irreversible action.{" "}
                                        {this.state.modalText}
                                    </Alert>
                                </Modal.Body>
                                <Modal.Footer>
                                    {this.state.confirmed || (
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                this.setState({
                                                    showModal: false,
                                                    method: "",
                                                })
                                            }
                                        >
                                            Close
                                        </Button>
                                    )}
                                    <Button
                                        variant="primary"
                                        onClick={
                                            this.state.method == null
                                                ? ""
                                                : this.state.method === "review"
                                                ? this.reviewMCQ
                                                : this.postMCQ
                                        }
                                        disabled={this.state.confirmed}
                                    >
                                        {this.state.confirmed ? (
                                            <Spinner
                                                as="span"
                                                animation="grow"
                                                size="sm"
                                                role="status"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            "Understood"
                                        )}
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                            {this.state.data.approved &&
                                this.props.state.auth &&
                                (this.props.state.user.code ===
                                    this.state.data.author ||
                                    this.props.state.user.admin) &&
                                !this.state.data.poll_id &&
                                (moment().utcOffset("+05:30").unix() >=
                                    this.state.data.schedule ||
                                    this.props.state.user.admin) && (
                                    <Alert show={true} variant="success">
                                        <p>
                                            The question is APPROVED but not
                                            PUBLISHED yet. Click below button to
                                            publish.
                                        </p>
                                        <div>
                                            <Button
                                                variant="success"
                                                onClick={() =>
                                                    this.setState({
                                                        showModal: true,
                                                        modalText:
                                                            "Confirm this action?",
                                                        action: "approve",
                                                        method: "post",
                                                    })
                                                }
                                            >
                                                Publish
                                            </Button>{" "}
                                            {this.state.data.canEdit && (
                                                <Button
                                                    variant="danger"
                                                    as={Link}
                                                    onClick={() =>
                                                        this.setState({
                                                            showModal: true,
                                                            modalText:
                                                                "Once DECLINED, it will be deleted and cannot be recovered.",
                                                            action: "decline",
                                                            method: "review",
                                                        })
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            )}{" "}
                                            {this.state.data.canEdit && (
                                                <Button
                                                    variant="primary"
                                                    as={Link}
                                                    to={`/question/edit/${this.state.data.docId}`}
                                                >
                                                    Edit Question
                                                </Button>
                                            )}
                                        </div>
                                    </Alert>
                                )}

                            {!this.state.data.approved &&
                                this.props.state.auth && (
                                    <Alert show={true} variant="warning">
                                        <p>
                                            The question is not approved yet.
                                            Please use the below buttons to
                                            approve or decline.
                                        </p>
                                        <div>
                                            <Button
                                                variant="success"
                                                disabled={
                                                    !this.props.state.user.admin
                                                }
                                                onClick={() =>
                                                    this.setState({
                                                        showModal: true,
                                                        modalText:
                                                            "Once APPROVED, you will not be able to edit this question.",
                                                        action: "approve",
                                                        method: "review",
                                                    })
                                                }
                                            >
                                                Approve
                                            </Button>{" "}
                                            <Button
                                                variant="danger"
                                                disabled={
                                                    !this.props.state.user.admin
                                                }
                                                onClick={() =>
                                                    this.setState({
                                                        showModal: true,
                                                        modalText:
                                                            "Once DECLINED, it will be deleted and cannot be recovered.",
                                                        action: "decline",
                                                        method: "review",
                                                    })
                                                }
                                            >
                                                Decline
                                            </Button>{" "}
                                            {this.state.data.canEdit && (
                                                <Button
                                                    variant="primary"
                                                    as={Link}
                                                    to={`/question/edit/${this.state.data.docId}`}
                                                >
                                                    Edit Question
                                                </Button>
                                            )}
                                        </div>
                                    </Alert>
                                )}
                        </>
                    )}
                </Container>
            </>
        );
    }
}

export default connect(mapStateToProps, null)(withCookies(Question));
