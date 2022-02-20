import React from "react";
import { isEmpty } from "lodash";

import {
    Alert,
    Form,
    Modal,
    Button,
    Container,
    InputGroup,
    FormControl,
    Spinner,
    Badge,
} from "react-bootstrap";
import { connect } from "react-redux";
import { instanceOf } from "prop-types";
import Navigation from "../../components/Navbar";
import { withCookies, Cookies } from "react-cookie";
import AlertLoginInfo from "../../components/AlertLoginInfo";

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

class Post extends React.Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            validated: false,
            showModal: false,
            showAlert: false,
            confirmed: false,
            data: {},
        };
    }

    componentDidMount() {
        this.handleSubmit = this.handleSubmit.bind(this);
        this.updateData = this.updateData.bind(this);
        this.findSlot = this.findSlot.bind(this);
        this.postMCQ = this.postMCQ.bind(this);
    }

    handleSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        if (event.currentTarget.checkValidity() !== false) {
            this.setState(() => ({ showModal: true }));
        }

        this.setState(() => ({ validated: true }));
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

    postMCQ() {
        this.setState({
            confirmed: true,
        });

        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        const body = new URLSearchParams(this.state.data).toString();

        fetch("/mcq-post/create", {
            method: "POST",
            headers,
            body,
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.OK) {
                    this.showAlert(
                        "success",
                        "Question is submitted successfully and is ready for review. Redirecting to preview in 3secs..."
                    );
                    setTimeout(() => {
                        this.props.history.push(`/question/${data.docId}`);
                    }, 3000);
                } else throw Error(data.error);
            })
            .catch((err) => {
                this.showAlert(
                    "danger",
                    `Question submission failed with Error: ${err.message}`
                );
            })
            .finally(() => {
                this.setState({
                    confirmed: false,
                });
            });
    }

    findSlot() {
        this.setState({
            confirmed: true,
        });

        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        fetch(`/mcq-get/schedule?topic=${this.state.data.topic}`, {
            headers,
        })
            .then((resp) => resp.json())
            .then((data) => {
                if (data.OK) {
                    this.setState({
                        data: { ...this.state.data, schedule: data.schedule },
                    });
                } else throw Error(data.error);
            })
            .catch((err) => {
                this.showAlert(
                    "danger",
                    `Question slot search failed with Error: ${err.message}`
                );
            })
            .finally(() => {
                this.setState({
                    confirmed: false,
                });
            });
    }

    updateData(e) {
        this.setState(() => ({
            data: { ...this.state.data, [e.target.name]: e.target.value },
        }));
    }

    render() {
        return (
            <>
                <Navigation />
                <AlertLoginInfo />
                {this.props.state.auth && (
                    <Container style={{ padding: "20px" }}>
                        {!isEmpty(this.props.state.configs) &&
                            !isEmpty(this.props.state.topics) && (
                                <>
                                    <Alert
                                        show={this.state.showAlert}
                                        variant={this.state.variantAlert}
                                        className="rounded-0"
                                    >
                                        {this.state.textAlert}
                                    </Alert>
                                    <Form
                                        noValidate
                                        validated={this.state.validated}
                                        onSubmit={this.handleSubmit}
                                    >
                                        <Form.Group className="mb-3">
                                            <Form.Label>Question</Form.Label>
                                            <Form.Control
                                                name="question"
                                                as="textarea"
                                                style={styles.textarea}
                                                placeholder="What's your question?"
                                                onChange={this.updateData}
                                                rows={3}
                                                required
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                Please provide a valid question.
                                            </Form.Control.Feedback>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Topic</Form.Label>
                                            <Form.Control
                                                as="select"
                                                name="topic"
                                                onChange={this.updateData}
                                                isValid={Boolean(
                                                    this.state.data.topic
                                                )}
                                                required={true}
                                            >
                                                <option label="Select Topic"></option>
                                                {this.props.state.topics.map(
                                                    (topic) => (
                                                        <option
                                                            label={topic.name}
                                                            key={topic.code}
                                                        >
                                                            {topic.code}
                                                        </option>
                                                    )
                                                )}
                                            </Form.Control>
                                            <Form.Control.Feedback type="invalid">
                                                Please provide a correct topic.
                                            </Form.Control.Feedback>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>
                                                Formatted Code (if any)
                                            </Form.Label>
                                            <Form.Control
                                                name="code"
                                                as="textarea"
                                                style={styles.textarea}
                                                placeholder="Enter formatted Code"
                                                onChange={this.updateData}
                                                rows={3}
                                            />
                                        </Form.Group>
                                        {this.state.data.code && (
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    Code Language
                                                </Form.Label>
                                                <Form.Control
                                                    as="select"
                                                    name="language"
                                                    onChange={this.updateData}
                                                    isValid={Boolean(
                                                        this.state.data.language
                                                    )}
                                                    required={Boolean(
                                                        this.state.data.code
                                                    )}
                                                >
                                                    <option label="Select Language"></option>
                                                    {this.props.state.configs.languages.map(
                                                        (language) => (
                                                            <option
                                                                label={
                                                                    language.name
                                                                }
                                                                key={
                                                                    language.code
                                                                }
                                                            >
                                                                {language.code}
                                                            </option>
                                                        )
                                                    )}
                                                </Form.Control>
                                                <Form.Control.Feedback type="invalid">
                                                    Please provide a correct
                                                    langauge for above code.
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        )}

                                        <Form.Group className="mb-3">
                                            <Form.Label>Explanation</Form.Label>
                                            <Form.Control
                                                name="explanation"
                                                as="textarea"
                                                style={styles.textarea}
                                                placeholder="Explanation"
                                                onChange={this.updateData}
                                                rows={3}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Options</Form.Label>
                                            <InputGroup className="mb-3">
                                                <InputGroup.Radio
                                                    value="option_1"
                                                    name="correct_option"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <FormControl
                                                    name="option_1_value"
                                                    placeholder="Option 1"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    Please provide a valid
                                                    solution.
                                                </Form.Control.Feedback>
                                            </InputGroup>
                                            <InputGroup className="mb-3">
                                                <InputGroup.Radio
                                                    value="option_2"
                                                    name="correct_option"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <FormControl
                                                    name="option_2_value"
                                                    placeholder="Option 2"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    Please provide a valid
                                                    solution.
                                                </Form.Control.Feedback>
                                            </InputGroup>
                                            <InputGroup className="mb-3">
                                                <InputGroup.Radio
                                                    value="option_3"
                                                    name="correct_option"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <FormControl
                                                    name="option_3_value"
                                                    placeholder="Option 3"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    Please provide a valid
                                                    solution.
                                                </Form.Control.Feedback>
                                            </InputGroup>
                                            <InputGroup className="mb-3">
                                                <InputGroup.Radio
                                                    value="option_4"
                                                    name="correct_option"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <FormControl
                                                    name="option_4_value"
                                                    placeholder="Option 4"
                                                    onChange={this.updateData}
                                                    required
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    Please provide a valid
                                                    solution.
                                                </Form.Control.Feedback>
                                            </InputGroup>
                                        </Form.Group>
                                        <Button
                                            type="submit"
                                            disabled={this.state.confirmed}
                                            variant="primary"
                                        >
                                            Post Question
                                        </Button>
                                    </Form>
                                    <Modal
                                        show={this.state.showModal}
                                        fullscreen={true}
                                        onHide={() =>
                                            this.setState({ showModal: false })
                                        }
                                    >
                                        <Modal.Header>
                                            <Modal.Title>
                                                Are you Sure?
                                            </Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <Alert variant={"danger"}>
                                                Confirm your submission
                                            </Alert>
                                            <>
                                                <b>Question:</b>
                                                <pre style={styles.pre}>
                                                    {this.state.data.question}
                                                </pre>
                                            </>
                                            {this.state.data.code && (
                                                <>
                                                    <b>
                                                        Code: (Language:{" "}
                                                        {
                                                            this.state.data
                                                                .language
                                                        }
                                                        )
                                                    </b>
                                                    <pre style={styles.pre}>
                                                        {this.state.data.code}
                                                    </pre>
                                                </>
                                            )}
                                            {this.state.data.explanation && (
                                                <>
                                                    <b>Explanation:</b>
                                                    <pre style={styles.pre}>
                                                        {
                                                            this.state.data
                                                                .explanation
                                                        }
                                                    </pre>
                                                </>
                                            )}
                                            <>
                                                <b>Options:</b>
                                                {[
                                                    "option_1_value",
                                                    "option_2_value",
                                                    "option_3_value",
                                                    "option_4_value",
                                                ].map((option, idx) => (
                                                    <pre
                                                        key={idx}
                                                        style={styles.pre}
                                                    >
                                                        {idx + 1} {">"}{" "}
                                                        {
                                                            this.state.data[
                                                                option
                                                            ]
                                                        }{" "}
                                                        {option.includes(
                                                            this.state.data
                                                                .correct_option
                                                        ) && (
                                                            <Badge
                                                                pill
                                                                bg="success"
                                                            >
                                                                correct
                                                            </Badge>
                                                        )}
                                                    </pre>
                                                ))}
                                            </>
                                        </Modal.Body>
                                        <Modal.Footer>
                                            {!this.state.confirmed && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={() =>
                                                        this.setState({
                                                            showModal: false,
                                                        })
                                                    }
                                                >
                                                    Close
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                onClick={
                                                    this.state.data.schedule
                                                        ? this.postMCQ
                                                        : this.findSlot
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
                                                ) : this.state.data.schedule ? (
                                                    "Confirm"
                                                ) : (
                                                    "Find Slot"
                                                )}
                                            </Button>
                                        </Modal.Footer>
                                    </Modal>
                                </>
                            )}
                    </Container>
                )}
            </>
        );
    }
}

export default connect(mapStateToProps, null)(withCookies(Post));
