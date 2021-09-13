import React from "react";
import { Card, Placeholder } from "react-bootstrap";

class CardPlaceholder extends React.Component {
    render() {
        return (
            <Card style={{marginBottom: '1rem'}}>
                <Card.Body>
                    <Card.Title>
                        <Placeholder as="p" animation="glow">
                            <Placeholder xs={8} size="xs" />
                        </Placeholder>
                    </Card.Title>
                    <Card.Text>
                        <Placeholder as="p" animation="glow">
                            <Placeholder xs={12} />
                        </Placeholder>
                    </Card.Text>
                </Card.Body>
            </Card>
        );
    }
}

export default CardPlaceholder;
