const telegram = require("node-telegram-bot-api");

exports.handler = async (event, context) => {
    const rawUrl = new URL(event.rawUrl).origin;
    const api_key = event.queryStringParameters.api_key;

    if (api_key !== process.env.api_key) {
        return {
            statusCode: 403,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: false, error: "Unauthorized" }),
            isBase64Encoded: false,
        };
    }

    const { admin_chat_id, bot_token } = process.env;
    const bot = new telegram(bot_token, { polling: false });
    const text = "Netlify site is updated. View updated site @ " + rawUrl;

    try {
        await bot.sendMessage(`-100${admin_chat_id}`, text);

        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: true }),
            isBase64Encoded: false,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({
                OK: false,
                error: error.message,
            }),
            isBase64Encoded: false,
        };
    }
};
