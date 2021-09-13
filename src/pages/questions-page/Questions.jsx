import React from "react";
import _ from "lodash";
import moment from "moment";
import {
    Container,
    Alert,
    Button,
    Card,
    ButtonGroup,
    Offcanvas,
    ListGroup,
    Form,
    Badge,
} from "react-bootstrap";
import Navigation from "../../components/Navbar";

import { instanceOf } from "prop-types";
import { withCookies, Cookies } from "react-cookie";

import { Link } from "react-router-dom";
import styled from "styled-components";
import AlertLoginInfo from "../../components/AlertLoginInfo";
import CardPlaceholder from "../../components/CardPlaceholder";
import { connect } from "react-redux";

const CustomCard = styled(Card)`
    margin-bottom: 1rem;
    :hover {
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12),
            0 4px 8px rgba(0, 0, 0, 0.06);
    }
`;

const Text = styled(Card.Text)`
    white-space: nowrap;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
`;

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

class Questions extends React.Component {
    static propTypes = {
        cookies: instanceOf(Cookies).isRequired,
    };
    constructor(props) {
        super(props);
        this.state = {
            data: null,
            filter: {},
            showOffcanvas: false,
            hasNextPage: false,
            isNextLoading: false,
            nextCursor: false,
            showAlert: false,
        };
    }

    componentDidMount() {
        this.updateData = this.updateData.bind(this);
        this.loadData = this.loadData.bind(this);
        this.setState(
            {
                filter: Object.fromEntries(
                    new URLSearchParams(this.props.location.search)
                ),
            },
            () => this.loadData()
        );

        if (this.props.location.state) {
            const showAlert = Boolean(this.props.location.state.showAlert);
            const variant = this.props.location.state.variant || "";
            const alertText = this.props.location.state.alertText || "";

            this.setState({ showAlert, variant, alertText }, () =>
                this.props.history.replace()
            );
        }
    }

    componentDidUpdate(prev) {
        if (this.props.location !== prev.location) {
            this.setState({ data: null }, () => this.loadData());
        }
    }

    loadData() {
        const filter = new URLSearchParams(this.state.filter).toString();
        const url =
            this.state.hasNextPage && this.state.isNextLoading
                ? `/MCQ/list?${filter}&cursor=${this.state.nextCursor}`
                : `/MCQ/list?${filter}`;

        const options = _.set(
            {},
            "headers.token",
            this.props.cookies.get("tokenId")
        );

        fetch(url, options)
            .then((resp) => resp.json())
            .then((data) => {
                const {
                    OK = false,
                    response = [],
                    nextPage = false,
                    nextCursor = false,
                } = data;

                if (OK) {
                    const data = this.state.data || [];
                    this.setState({ data: [...data, ...response] });
                    if (nextPage) {
                        this.setState({
                            nextCursor,
                            hasNextPage: true,
                        });
                    } else {
                        this.setState({
                            hasNextPage: false,
                        });
                    }
                }
            })
            .finally(() => {
                this.setState({
                    isNextLoading: false,
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
        return moment(timestamp).format("lll");
    }

    updateData(e) {
        this.setState(() => ({
            filter: { ...this.state.filter, [e.target.name]: e.target.value },
        }));
    }

    render() {
        return (
            <>
                <Navigation />
                <AlertLoginInfo />
                <Container style={{ padding: "20px" }}>
                    <Alert
                        show={this.state.showAlert}
                        variant={this.state.variant}
                        className="rounded-0"
                        onClose={() => this.setState({ showAlert: false })}
                        dismissible
                    >
                        {this.state.alertText}
                    </Alert>

                    <ButtonGroup className="d-flex justify-content-center mb-3">
                        <div className="d-flex justify-content-center mb-3">
                            {this.props.state.auth && (
                                <Button
                                    as={Link}
                                    to="/post"
                                    style={{ marginRight: "5px" }}
                                >
                                    Post Question
                                </Button>
                            )}
                            <Button
                                onClick={() =>
                                    this.setState({ showOffcanvas: true })
                                }
                            >
                                Filter Questions{"  "}
                                <Badge bg="dark">
                                    {Object.keys(this.state.filter).length}
                                </Badge>
                            </Button>
                        </div>
                    </ButtonGroup>

                    {!this.state.data ||
                    !this.props.state.contributors ||
                    !this.props.state.topics ||
                    !this.props.state.configs ? (
                        <>
                            {_.times(3, (id) => (
                                <CardPlaceholder key={id} />
                            ))}
                        </>
                    ) : _.isEmpty(this.state.data) ? (
                        <Alert variant="danger">
                            No question(s) found to display. Refresh the page or
                            try again later. If the problem persists, contact
                            Coding Wizard club administrators for assistance.
                        </Alert>
                    ) : (
                        <>
                            {this.state.data.map(
                                (d) =>
                                    (this.props.state.auth || d.published) && (
                                        <Link
                                            to={"/question/" + d.docId}
                                            key={d.docId}
                                            style={{
                                                textDecoration: "none",
                                                color: "inherit",
                                            }}
                                        >
                                            <CustomCard
                                                style={{
                                                    borderColor: d.published
                                                        ? "inherit"
                                                        : "red",
                                                }}
                                            >
                                                <Card.Body>
                                                    <Card.Title
                                                        as={"b"}
                                                        style={{
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        Created by{" "}
                                                        {this.getContributorName(
                                                            d.author
                                                        )}{" "}
                                                        on{" "}
                                                        {this.timestampToDate(
                                                            d.date
                                                        )}{" "}
                                                    </Card.Title>
                                                    <Text>{d.question}</Text>
                                                </Card.Body>
                                            </CustomCard>
                                        </Link>
                                    )
                            )}
                            {this.state.isNextLoading && <CardPlaceholder />}
                            <div className="d-flex justify-content-center mb-3">
                                <Button
                                    disabled={!this.state.hasNextPage}
                                    onClick={() => {
                                        this.setState(
                                            { isNextLoading: true },
                                            () => this.loadData()
                                        );
                                    }}
                                >
                                    Load More
                                </Button>
                            </div>
                        </>
                    )}
                </Container>
                <Offcanvas
                    show={this.state.showOffcanvas}
                    onHide={() => this.setState({ showOffcanvas: false })}
                >
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Filter</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <div style={{ marginBottom: "1rem" }}>
                            <ButtonGroup>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        this.setState(
                                            {
                                                filter: {},
                                                showOffcanvas: false,
                                            },
                                            () =>
                                                this.props.history.replace({
                                                    pathname:
                                                        this.props.location
                                                            .pathname,
                                                })
                                        );
                                    }}
                                >
                                    Clear Filter
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        this.setState(
                                            { showOffcanvas: false },
                                            () =>
                                                this.props.history.replace({
                                                    pathname:
                                                        this.props.location
                                                            .pathname,
                                                    search: new URLSearchParams(
                                                        this.state.filter
                                                    ).toString(),
                                                })
                                        );
                                    }}
                                >
                                    Submit Filter
                                </Button>
                            </ButtonGroup>
                        </div>
                        <Form>
                            <div style={{ marginBottom: "1rem" }}>
                                <b>Languages</b>
                                <ListGroup variant="flush">
                                    {this.props.state.configs?.languages.map(
                                        (language) => (
                                            <ListGroup.Item key={language.code}>
                                                <Form.Check
                                                    type={"radio"}
                                                    name={"lang"}
                                                    value={language.code}
                                                    label={language.name}
                                                    onChange={this.updateData}
                                                    checked={
                                                        language.code ===
                                                        this.state.filter.lang
                                                    }
                                                />
                                            </ListGroup.Item>
                                        )
                                    )}
                                </ListGroup>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <b>Topics</b>
                                <ListGroup variant="flush">
                                    {this.props.state.topics?.map((topic) => (
                                        <ListGroup.Item key={topic.code}>
                                            <Form.Check
                                                type={"radio"}
                                                name={"topic"}
                                                value={topic.code}
                                                label={topic.name}
                                                onChange={this.updateData}
                                                checked={
                                                    topic.code ===
                                                    this.state.filter.topic
                                                }
                                            />
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <b>Authors</b>
                                <ListGroup variant="flush">
                                    {this.props.state.contributors?.map(
                                        (contributor) => (
                                            <ListGroup.Item
                                                key={contributor.code}
                                            >
                                                <Form.Check
                                                    type={"radio"}
                                                    name={"author"}
                                                    value={contributor.code}
                                                    label={contributor.name}
                                                    onChange={this.updateData}
                                                    checked={
                                                        contributor.code ===
                                                        this.state.filter.author
                                                    }
                                                />
                                            </ListGroup.Item>
                                        )
                                    )}
                                </ListGroup>
                            </div>
                        </Form>
                    </Offcanvas.Body>
                </Offcanvas>
            </>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withCookies(Questions));
