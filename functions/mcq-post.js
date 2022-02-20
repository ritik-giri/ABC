const fetch = require("node-fetch");
const auth = require("./utils/auth");

const validate = require("./utils/validate");
const { database } = require("./utils/firebase");
const telegram = require("node-telegram-bot-api");
const moment = require("moment")().utcOffset("+05:30");
const { map, set, uniq, last, indexOf } = require("lodash");

const {
    API_KEY: api_key,
    BOT_TOKEN: bot_token,
    GROUP_CHAT_ID: chat_id,
    ADMIN_CHAT_ID: admin_chat_id,
} = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    const httpMethod = event.httpMethod;
    const path = last(event.path.split("/"));
    const rawUrl = new URL(event.rawUrl).origin;
    const baseUrl = rawUrl.includes("localhost")
        ? "https://cwc-mcq.netlify.app/"
        : rawUrl;

    const { contributor = {}, OK: authentication } = await auth(
        event.headers.token,
        rawUrl
    );

    const api_authentication = event.headers.key === api_key;
    const mention = `<a href="tg://user?id=${contributor.telegram}">${contributor.name}</a>`;

    if ((!authentication && !api_authentication) || httpMethod !== "POST") {
        return {
            statusCode: 401,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({
                OK: false,
                error: "Unauthorized",
            }),
            isBase64Encoded: false,
        };
    }

    if (path === "create") {
        const { value: body, error } = validate.validateMCQCreate(
            Object.fromEntries(new URLSearchParams(event.body))
        );

        if (error) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: map(error.details, "message"),
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        const options = [
            body.option_1_value,
            body.option_2_value,
            body.option_3_value,
            body.option_4_value,
        ];

        if (uniq(options).length !== options.length) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: "All the options should be unique.",
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        try {
            body.author = contributor.code;
            const question = database.collection("questions").doc();

            if (body.code) {
                const query = new URLSearchParams({
                    api_key,
                    id: question.id,
                    language: body.language,
                }).toString();

                const code2img = await fetch(`${rawUrl}/code2img?${query}`, {
                    method: "POST",
                    body: body.code,
                });

                const response = await code2img.json();

                if (response.OK) {
                    body.screenshot = response.screenshot;
                } else
                    throw Error("Error fetching screenshot, Try again later.");
            }

            const sendMessage = await bot.sendMessage(
                `-100${admin_chat_id}`,
                `❔ New question added for review (by ${mention})`,
                {
                    parse_mode: "HTML",
                    reply_markup: set({}, "inline_keyboard[0]", [
                        {
                            text: "View",
                            url: `${baseUrl}/question/${question.id}`,
                        },
                    ]),
                }
            );

            await question.set({
                ...body,
                admin_message_id: sendMessage.message_id,
            });

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({ OK: true, docId: question.id, ...body }),
                isBase64Encoded: false,
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: error.message,
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }
    } else if (path === "edit") {
        const docId = event.queryStringParameters.id;
        const { value: body, error } = validate.validateMCQEdit(
            Object.fromEntries(new URLSearchParams(event.body))
        );

        console.log(error)

        if (error || !docId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: "Insufficient Data",
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        const options = [
            body.option_1_value,
            body.option_2_value,
            body.option_3_value,
            body.option_4_value,
        ];

        if (uniq(options).length !== options.length) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: "All the options should be unique.",
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        try {
            const questionRef = database.collection("questions").doc(docId);
            const question = await questionRef.get();

            if (!question.exists) {
                throw Error("Question not found");
            }

            const { poll_id, code, approved, author, admin_message_id } =
                question.data();

            if (
                poll_id ||
                ((author !== contributor.code || approved) &&
                    !contributor.admin)
            )
                throw Error("Question cannot be altered!");

            if (body.code && body.code !== code) {
                const query = new URLSearchParams({
                    api_key,
                    edit: true,
                    id: question.id,
                    language: body.language,
                }).toString();

                const code2img = await fetch(`${rawUrl}/code2img?${query}`, {
                    method: "POST",
                    body: body.code,
                });

                const response = await code2img.json();

                if (response.OK && response.uploaded) {
                    body.screenshot = response.screenshot;
                } else
                    throw Error("Error fetching screenshot, Try again later.");
            }

            await questionRef.update(body);
            await bot.sendMessage(
                `-100${admin_chat_id}`,
                `${mention} made an edit to the question.`,
                {
                    parse_mode: "HTML",
                    reply_to_message_id: admin_message_id,
                }
            );

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({ OK: true, docId: question.id, ...body }),
                isBase64Encoded: false,
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: error.message,
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }
    } else if (path === "review") {
        const { value: body, error } = validate.validateMCQreview(
            Object.fromEntries(new URLSearchParams(event.body))
        );

        if (error) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({ error, OK: false }),
                isBase64Encoded: false,
            };
        }

        if (!contributor.admin) {
            return {
                statusCode: 403,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: "You are not authorized to perform this action",
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        try {
            const { id, action } = body;
            const collection = database.collection("questions");
            const questionRef = collection.doc(id);
            const questionDoc = await questionRef.get();

            if (!questionDoc.exists) throw Error("Question does not exist");
            const { approved, admin_message_id } = questionDoc.data();
            if (approved) throw Error("Question is already approved.");

            if (action === "approve") {
                await bot.sendMessage(
                    `-100${admin_chat_id}`,
                    `${mention} reviewed this question and marked <i>approved</i>. Hence the question is ready to be posted.`,
                    {
                        parse_mode: "HTML",
                        reply_to_message_id: admin_message_id,
                    }
                );

                await questionRef.update({
                    approved: true,
                });

                return {
                    statusCode: 200,
                    headers: {
                        "content-type": `application/json`,
                    },
                    body: JSON.stringify({
                        OK: true,
                        message:
                            "Question approved successfully. Ready to be posted.",
                    }),
                    isBase64Encoded: false,
                };
            } else if (action === "decline") {
                const { admin_message_id } = questionDoc.data();

                await bot.sendMessage(
                    `-100${admin_chat_id}`,
                    `${mention} reviewed this question and marked <i>declined</i>. Hence the question is deleted from database.`,
                    {
                        parse_mode: "HTML",
                        reply_to_message_id: admin_message_id,
                    }
                );

                await questionRef.delete();

                return {
                    statusCode: 200,
                    headers: {
                        "content-type": `application/json`,
                    },
                    body: JSON.stringify({
                        OK: true,
                        message: "Question successfully deleted from database.",
                    }),
                    isBase64Encoded: false,
                };
            }
        } catch (error) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: error.message,
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }
    } else if (path === "publish") {
        const { value: query, error } = validate.validateMCQpost(
            Object.fromEntries(new URLSearchParams(event.rawQuery))
        );

        if (error) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({ error, OK: false }),
                isBase64Encoded: false,
            };
        }

        if (!authentication && !api_authentication) {
            return {
                statusCode: 403,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: "You are not authorized to perform this action",
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }

        try {
            const { id } = query;
            let reply_to_message_id;
            const collection = database.collection("questions");
            const questionRef = collection.doc(id);
            const questionDoc = await questionRef.get();

            if (!questionDoc.exists) {
                throw new Error("Question does not exist");
            }

            const {
                code,
                poll_id,
                approved,
                question,
                schedule,
                screenshot,
                explanation,
                correct_option,
                option_1_value,
                option_2_value,
                option_3_value,
                option_4_value,
                admin_message_id,
            } = questionDoc.data();

            if (poll_id) {
                throw new Error("Question is already published");
            }

            if (!approved) {
                throw new Error(
                    "Question is not approved yet. Please ask a admin to approve it first."
                );
            }

            if (schedule > moment.unix() && !contributor.admin) {
                throw new Error(
                    "The question has been scheduled for later time, Only admin can post the question before time."
                );
            }

            const options = [
                option_1_value,
                option_2_value,
                option_3_value,
                option_4_value,
            ];

            const correct_option_id = indexOf(
                options,
                questionDoc.data()[`${correct_option}_value`]
            );

            if (code) {
                if (!screenshot) throw Error("Screenshot not found");
                const sendPhoto = await bot.sendPhoto(
                    `-100${chat_id}`,
                    screenshot
                );

                reply_to_message_id = sendPhoto.message_id;
            }

            const sendPoll = await bot.sendPoll(
                `-100${chat_id}`,
                question,
                options,
                {
                    is_anonymous: false,
                    reply_to_message_id,
                    correct_option_id,
                    explanation,
                    type: "quiz",
                }
            );

            await bot.sendMessage(
                `-100${admin_chat_id}`,
                `This question is published on telegram group.`,
                {
                    reply_to_message_id: admin_message_id,
                    reply_markup: set({}, "inline_keyboard[0]", [
                        {
                            text: "Open",
                            url: `https://t.me/c/${chat_id}/${sendPoll.message_id}`,
                        },
                    ]),
                }
            );

            await questionRef.update({
                poll_id: sendPoll.poll.id,
            });

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    OK: true,
                    message: `Question successfully published on https://t.me/c/${chat_id}/${sendPoll.message_id}`,
                }),
                isBase64Encoded: false,
            };
        } catch (error) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    error: error.message,
                    OK: false,
                }),
                isBase64Encoded: false,
            };
        }
    }
};
