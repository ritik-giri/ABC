const telegram = require("node-telegram-bot-api");

const {
    API_KEY: api_key,
    BOT_TOKEN: bot_token,
    ADMIN_CHAT_ID: admin_chat_id,
} = process.env;

exports.handler = async (event, context) => {
    const {
        queryStringParameters: { key },
        rawUrl,
    } = event;

    if (key !== api_key) {
        return {
            statusCode: 403,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: false, error: "Unauthorized" }),
            isBase64Encoded: false,
        };
    }

    const bot = new telegram(bot_token, { polling: false });
    const text =
        "Netlify site is updated. View updated site @ " +
        new URL(rawUrl).origin;

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
