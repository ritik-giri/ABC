const telegram = require("node-telegram-bot-api");

const { bot_token, admin_chat_id, api_key } = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    try {
        if (event.headers.key !== api_key) throw Error("!AUTH");
        else await bot.sendMessage(admin_chat_id, event.body);

        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: { OK: true },
            isBase64Encoded: false,
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: { OK: false, error: e.message },
            isBase64Encoded: false,
        };
    }
};
