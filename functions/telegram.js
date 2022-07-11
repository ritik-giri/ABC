const telegram = require("node-telegram-bot-api");

const {
    API_KEY: api_key,
    BOT_TOKEN: bot_token,
    ADMIN_CHAT_ID: admin_chat_id,
} = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    try {
        console.log(event.headers.key !== api_key, event.headers.key, api_key)
        if (event.headers.key !== api_key) throw Error("!AUTH");
        else {
            console.log(event)
            const { text, pin } = JSON.parse(event.body);
            console.log("Text", text);

            const message = await bot.sendMessage(`-100${admin_chat_id}`, text, {
                parse_mode: "HTML",
            });

            console.log(message);

            if (pin) {
                await bot.pinChatMessage(`-100${admin_chat_id}`, message.message_id)
            }
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: true }),
            isBase64Encoded: false,
        };
    } catch (e) {
        console.log(e.message)
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
