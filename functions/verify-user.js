const { database } = require("./utils/firebase");
const telegram = require("node-telegram-bot-api");

const { BOT_TOKEN: bot_token } = process.env;
const bot = new telegram(bot_token, { polling: false });
const regex =
    /[0-9A-F]{8}[0-9A-F]{4}[4][0-9A-F]{3}[89AB][0-9A-F]{3}[0-9A-F]{12}/i;

const message = `Hello {{user}},
Welcome to Coding Wizard Club. Your telegram account has been verified. Please join the group using the given link as soon as possible. If the link does not work, please DM @Shreejoy_Dash or join @cwcincisive and mention your issue.`;

exports.handler = async (event, context) => {
    if (event.httpMethod === "POST" && event.body) {
        const body = JSON.parse(event.body);
        if (body.message.chat.type === "private") {
            if (body.message.text.startsWith("/verify")) {
                const [uuid] = body.message.text.match(regex) || [];

                if (uuid) {
                    const query = await database
                        .collection("members")
                        .where("uuid", "==", uuid)
                        .get();

                    console.log(query.docs.length);
                    if (!query.empty) {
                        const [user] = query.docs;
                        console.log(user.id)

                        if (user) {
                            if (!user.data().telegram_id) {
                                database
                                    .collection("members")
                                    .doc(user.id)
                                    .update({
                                        telegram_id: body.message.chat.id,
                                    });

                                bot.sendMessage(
                                    body.message.chat.id,
                                    message.replace(
                                        "{{user}}",
                                        user.data().name
                                    )
                                );
                            }

                            bot.sendMessage(
                                "-1001234543125",
                                `<a href="tg://user?id=${
                                    body.message.chat.id
                                }">${
                                    user.data().name
                                }</a> is trying to join the group.`,
                                { parse_mode: "HTML" }
                            );

                            bot.sendMessage(
                                body.message.chat.id,
                                `The link to join the group is ${await bot.exportChatInviteLink(
                                    "-1001751279555"
                                )}`
                            );
                        }
                    }
                }
            }
        }
    }

    return {
        statusCode: 200,
        headers: {
            "content-type": `application/json`,
        },
        body: JSON.stringify({
            OK: true,
        }),
        isBase64Encoded: false,
    };
};
