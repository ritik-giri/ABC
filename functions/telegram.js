const telegram = require("node-telegram-bot-api");

const {
    API_KEY: api_key,
    BOT_TOKEN: bot_token,
    ADMIN_CHAT_ID: admin_chat_id,
} = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    try {
        if (event.headers.key !== api_key) throw Error("!AUTH");
        else
            await bot.sendMessage(`-100${admin_chat_id}`, event.body, {
                parse_mode: "HTML",
            });

        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: true }),
            isBase64Encoded: false,
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: false, error: e.message }),
            isBase64Encoded: false,
        };
    }
};
