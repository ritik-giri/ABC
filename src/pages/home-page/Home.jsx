import _ from "lodash";
import moment from "moment";
import React from "react";

import {
    Alert,
    Container,
    Table,
    ListGroup,
    Placeholder,
} from "react-bootstrap";

import Navigation from "../../components/Navbar";
import { connect } from "react-redux";

const mapStateToProps = (state) => {
    return { state };
};

class Home extends React.Component {
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

    getDatefromTimeStamp(ts) {
        return moment(ts * 1000).format("ll");
    }

    render() {
        return _.isEmpty(this.props.state.timetable) ||
            _.isEmpty(this.props.state.contributors) ||
            _.isEmpty(this.props.state.configs) ||
            _.isEmpty(this.props.state.topics) ? (
            <div>
                <Navigation />
                <Container fluid style={{ padding: "20px" }}>
                    <Alert variant="success" style={{ marginBottom: "2rem" }}>
                        <Alert.Heading>Hey, nice to see you</Alert.Heading>
                        <p>
                            <Placeholder as="p" animation="glow">
                                <Placeholder xs={12} />
                            </Placeholder>
                        </p>
                        <hr />
                        <p className="mb-0">
                            <Placeholder as="p" animation="glow">
                                <Placeholder xs={6} />
                            </Placeholder>
                        </p>
                    </Alert>
                </Container>
            </div>
        ) : (
            <>
                <Navigation />
                <Container fluid style={{ padding: "20px" }}>
                    <Alert variant="success" style={{ marginBottom: "2rem" }}>
                        <Alert.Heading>Hey, nice to see you</Alert.Heading>
                        <p>
                            Here is the MCQ schedule to be followed from{" "}
                            {this.getDatefromTimeStamp(
                                this.props.state.configs.start
                            )}{" "}
                            to{" "}
                            {this.getDatefromTimeStamp(
                                this.props.state.configs.end
                            )}
                            .
                        </p>
                    </Alert>
                    <h2>Timetable</h2>
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
                                {this.props.state.configs.slots.map((slot) => (
                                    <th>{slot.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.state.configs.days.map((day) => {
                                return (
                                    <tr key={day.code}>
                                        <td>{day.name}</td>
                                        {this.props.state.configs.slots.map(
                                            (slot) => {
                                                const slot_data =
                                                    this.props.state.timetable[
                                                        day.code
                                                    ][slot.code];

                                                const topic = this.getTopicName(
                                                    slot_data?.topic
                                                );

                                                const ignore =
                                                    slot_data?.ignore;

                                                return (
                                                    <td
                                                        key={
                                                            slot.code + day.code
                                                        }
                                                    >
                                                        {topic && !ignore
                                                            ? topic
                                                            : "N/A"}
                                                    </td>
                                                );
                                            }
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                    <h2>Topics</h2>
                    <ListGroup style={{ marginBottom: "2rem" }}>
                        {this.props.state.topics.map((topic) => (
                            <ListGroup.Item key={topic.code}>
                                {topic.name}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                    <h2>Contributors</h2>
                    <ListGroup style={{ marginBottom: "2rem" }}>
                        {this.props.state.contributors.map((contributor) => (
                            <ListGroup.Item key={contributor.code}>
                                {contributor.name}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                    <h2>Slots</h2>
                    <ListGroup style={{ marginBottom: "2rem" }}>
                        {this.props.state.configs.slots.map((slot) => (
                            <ListGroup.Item key={slot.code}>
                                {slot.name} ({slot.startHr}:00 - {slot.endHr}
                                :00)
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Container>
            </>
        );
    }
}

export default connect(mapStateToProps, null)(Home);
