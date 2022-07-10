import React from "react";

import Navigation from "../../components/Navbar";
import { connect } from "react-redux";
import { Container, Placeholder, Table } from "react-bootstrap";
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
    componentDidMount() {
        !this.props.state.auth && this.props.history.push("/questions");
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

    getSchedule() {
        let schedule = []
        const timetable = this.props.state.timetable;
        for (const [day, slots] of Object.entries(timetable)) {
            for (const [slot, { topic, assignee }] of Object.entries(slots)) {
                if (assignee === this.props.state.user.code) {
                    schedule.push({
                        day,
                        slot,
                        topic
                    });
                }
            }
        }
        return schedule;
    }

    render() {
        return (
            <>
                <Navigation />
                {_.isEmpty(this.props.state.timetable) ||
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
                                {this.props.state.user.name} (
                                {this.props.state.user.code})
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
                                {this.props.state.user.email}
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.getSchedule().map((schedule, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{this.getDay(schedule.day)}</td>
                                            <td>{schedule.slot}</td>
                                            <td>{this.getTopicName(schedule.topic)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    </Container>
                )}
            </>
        );
    }
}

export default connect(mapStateToProps, null)(About);
