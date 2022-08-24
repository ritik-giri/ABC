import React from "react";

import Navigation from "../../components/Navbar";
import { connect } from "react-redux";
import { Button, Container, Modal, Placeholder, Table } from "react-bootstrap";

import { instanceOf } from "prop-types";
import { withCookies, Cookies } from "react-cookie";
import _ from "lodash";

const mapStateToProps = (state) => {
    return { state };
};

const styles = {
    textarea: {
        resize: "none",
    },
    pre: {
        marginTop: "10px",
        whiteSpace: "pre-wrap",
    },
};

class About extends React.Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            data: {},
            timetable: false,
        };
    }

    componentDidMount() {
        this.getData = this.getData.bind(this);
        !this.props.state.auth && this.props.history.push("/questions");
        console.log(this.getData());
    }

    getDay(day) {
        switch (parseInt(day)) {
            case 0:
                return "Sunday";
            case 1:
                return "Monday";
            case 2:
                return "Tuesday";
            case 3:
                return "Wednesday";
            case 4:
                return "Thursday";
            case 5:
                return "Friday";
            case 6:
                return "Saturday";
            default:
                return "";
        }
    }

    getTopicName(codeName) {
        var find = this.props.state.topics.find(
            (topic) => topic.code === codeName
        );
        return find ? find.name : "";
    }

    getContributorName(codeName) {
        var find = this.props.state.contributors.find(
            (contributor) => contributor.code === codeName
        );
        return find ? find.name : "";
    }

    getData() {
        const {
            cookies: { tokenId: token },
        } = this.props.cookies;

        const headers = {
            token,
        };

        console.log(headers);

        fetch(`/mcq-get/about`, { headers })
            .then((resp) => resp.json())
            .then((data) => {
                const { OK, error, ...response } = data;
                if (OK && !error) {
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

    render() {
        return (
            <>
                <Navigation />
                {_.isEmpty(this.state.data) ||
                _.isEmpty(this.props.state.timetable) ||
                _.isEmpty(this.props.state.contributors) ||
                _.isEmpty(this.props.state.configs) ||
                _.isEmpty(this.props.state.topics) ? (
                    <Container style={{ padding: "2rem" }}>
                        <>
                            <b>Name:</b>
                            <Placeholder as="p" animation="glow">
                                <Placeholder xs={12} />
                            </Placeholder>
                        </>
                        <>
                            <b>Email:</b>
                            <Placeholder as="p" animation="glow">
                                <Placeholder xs={12} />
                            </Placeholder>
                        </>
                        <>
                            <b>Telegram:</b>
                            <Placeholder as="p" animation="glow">
                                <Placeholder xs={12} />
                            </Placeholder>
                        </>
                        <>
                            <b>Schedule:</b>
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Day</th>
                                        <th>Slot</th>
                                        <th>Topic</th>
                                    </tr>
                                </thead>
                            </Table>
                        </>
                    </Container>
                ) : (
                    <Container style={{ padding: "2rem" }}>
                        <>
                            <b>Name:</b>
                            <pre
                                style={{
                                    ...styles.pre,
                                    whiteSpace: "no-wrap",
                                }}
                            >
                                {this.state.data.name} ({this.state.data.code})
                            </pre>
                        </>
                        <>
                            <b>Email:</b>
                            <pre
                                style={{
                                    ...styles.pre,
                                    whiteSpace: "no-wrap",
                                }}
                            >
                                {this.state.data.email}
                            </pre>
                        </>
                        <>
                            <b>Telegram:</b>
                            <pre
                                style={{
                                    ...styles.pre,
                                    whiteSpace: "no-wrap",
                                }}
                            >
                                <a
                                    href={`tg://user?id=${this.state.data.telegram}`}
                                >
                                    Open with Telegram
                                </a>
                            </pre>
                        </>
                        <>
                            <b>Schedule:</b>
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Day</th>
                                        <th>Slot</th>
                                        <th>Topic</th>
                                        <th>Posted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.state.data.assignment.map(
                                        (schedule, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {this.getDay(schedule.day)}
                                                </td>
                                                <td>{schedule.slot}</td>
                                                <td>
                                                    {this.getTopicName(
                                                        schedule.topic
                                                    )}
                                                </td>
                                                <td>
                                                    {schedule.fulfilled
                                                        ? "Yes"
                                                        : "No"}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                                <Button
                                    variant="primary"
                                    style={{ marginTop: "1rem" }}
                                    onClick={() =>
                                        this.setState({ timetable: true })
                                    }
                                >
                                    Show Timetable
                                </Button>
                                <Modal
                                    show={this.state.timetable}
                                    size="lg"
                                    fullscreen={"lg-down"}
                                    onHide={() =>
                                        this.setState({ timetable: false })
                                    }
                                >
                                    <Modal.Header closeButton>
                                        <Modal.Title>Timetable</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Table
                                            responsive
                                            striped
                                            bordered
                                            hover
                                            style={{ marginBottom: "2rem" }}
                                        >
                                            <thead>
                                                <tr>
                                                    <th>DAY</th>
                                                    {this.props.state.configs.slots.map(
                                                        (slot) => (
                                                            <th>{slot.name}</th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {this.props.state.configs.days.map(
                                                    (day) => {
                                                        return (
                                                            <tr key={day.code}>
                                                                <td>
                                                                    {day.name}
                                                                </td>
                                                                {this.props.state.configs.slots.map(
                                                                    (slot) => {
                                                                        const data =
                                                                            this
                                                                                .state
                                                                                .data
                                                                                .schedule[
                                                                                day
                                                                                    .code
                                                                            ][
                                                                                slot
                                                                                    .code
                                                                            ];

                                                                        const topic =
                                                                            this.getTopicName(
                                                                                data?.topic
                                                                            );

                                                                        const assignee =
                                                                            this.getContributorName(
                                                                                data?.assignee
                                                                            );

                                                                        const fulfilled =
                                                                            data?.fulfilled;

                                                                        const ignore =
                                                                            data?.ignore;

                                                                        const color =
                                                                            fulfilled ===
                                                                            true
                                                                                ? "green"
                                                                                : fulfilled ===
                                                                                  false
                                                                                ? "red"
                                                                                : "black";

                                                                        return (
                                                                            <td
                                                                                key={
                                                                                    slot.code +
                                                                                    day.code
                                                                                }
                                                                            >
                                                                                {topic &&
                                                                                !ignore ? (
                                                                                    <>
                                                                                        <span
                                                                                            style={{
                                                                                                color,
                                                                                            }}
                                                                                        >
                                                                                            {
                                                                                                topic
                                                                                            }
                                                                                        </span>
                                                                                        <br />
                                                                                        <small>
                                                                                            (
                                                                                            {
                                                                                                assignee
                                                                                            }

                                                                                            )
                                                                                        </small>
                                                                                    </>
                                                                                ) : (
                                                                                    "N/A"
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    }
                                                                )}
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </Table>
                                    </Modal.Body>
                                </Modal>
                            </Table>
                        </>
                    </Container>
                )}
            </>
        );
    }
}

export default connect(mapStateToProps, null)(withCookies(About));
