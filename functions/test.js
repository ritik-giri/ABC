exports.handler = async (event, context) => {
    const output = JSON.stringify({event, context});

    return {
        statusCode: 200,
        headers: {
            "content-type": `application/json`,
        },
        body: output,
        isBase64Encoded: false,
    };
};