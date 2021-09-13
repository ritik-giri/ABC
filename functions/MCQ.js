const _ = require("lodash");
const fetch = require("node-fetch");
const auth = require("./utils/auth");

const validate = require("./utils/validate");
const telegram = require("node-telegram-bot-api");
const { database } = require("./utils/firebase");

const { bot_token, admin_chat_id, chat_id } = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    const path = event.path;
    const httpMethod = event.httpMethod;
    const rawUrl = new URL(event.rawUrl).origin;
    const { value: headers, error } = validate.validateHeaders(event.headers);

    if (error && httpMethod === "POST") {
        return {
            statusCode: 401,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ error, OK: false, message: "Unauthorized" }),
            isBase64Encoded: false,
        };
    }

    const authentication = await auth(headers.token, rawUrl);
    if (!authentication.OK && httpMethod === "POST") {
        return {
            statusCode: 400,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({
                ...authentication,
                OK: false,
            }),
            isBase64Encoded: false,
        };
    }

    if (path.startsWith("/MCQ/create") && httpMethod === "POST") {
        console.log(event.body);
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
                    error: _.map(error.details, "message"),
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

        if (_.uniq(options).length !== options.length) {
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
            body.author = authentication.contributor.code;
            const contributor = authentication.contributor;
            const collection = database.collection("questions");
            const question = collection.doc();

            if (body.code) {
                const query = new URLSearchParams({
                    id: question.id,
                    language: body.language,
                    key: process.env.api_key,
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
                `❔ New question added for review (by <b>${contributor.name}</b>)`,
                {
                    parse_mode: "HTML",
                    reply_markup: _.set({}, "inline_keyboard[0]", [
                        {
                            text: "View",
                            url: `${
                                rawUrl.includes("localhost")
                                    ? "https://google.co.in/"
                                    : rawUrl
                            }/question/${question.id}`,
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
    } else if (path.startsWith("/MCQ/list") && httpMethod === "GET") {
        const { value: query, error } = validate.validateMCQList(
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

        try {
            var questions,
                questionsRef,
                response = [],
                body = { OK: true, nextPage: false };

            const lang = query.lang;
            const topic = query.topic;
            const author = query.author;
            const cursor = parseInt(query.cursor);

            const collection = database.collection("questions");
            questionsRef = collection.orderBy("date", "desc").limit(10);

            if (!authentication.OK) {
                questionsRef = questionsRef.where("published", "==", true);
            }

            if (lang) {
                questionsRef = questionsRef.where("language", "==", lang);
            }

            if (topic) {
                questionsRef = questionsRef.where("topic", "==", topic);
            }

            if (author) {
                questionsRef = questionsRef.where("author", "==", author);
            }

            if (!cursor) {
                questions = await questionsRef.get();
            } else {
                questions = await questionsRef.startAfter(cursor).get();
            }

            questions.forEach((question) => {
                const docId = question.id;
                const docData = question.data();

                if (!authentication.OK) {
                    delete docData.correct_option;
                    delete docData.explanation;
                }
                response.push({ docId, ...docData });
            });

            if (response.length) {
                body.response = response;
                body.count = response.length;
                const nextCursor = _.last(response).date;
                const nextQuestion = await questionsRef
                    .startAfter(nextCursor)
                    .limit(1)
                    .get();
                if (nextQuestion.size) {
                    body.nextPage = true;
                    body.nextCursor = nextCursor;
                }
            }

            return {
                statusCode: 200,
                body: JSON.stringify(body),
                headers: {
                    "content-type": `application/json`,
                },
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
    } else if (path.startsWith("/MCQ/question") && httpMethod === "GET") {
        const { value: query, error } = validate.validateMCQQuestion(
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

        try {
            const docId = query.id;
            const collection = database.collection("questions");
            const question = await collection.doc(docId).get();
            if (!question.exists) throw Error("Question not found");
            const docData = question.data();

            if (!authentication.OK) {
                if (!docData.published) throw Error("Question not found");
                delete docData.correct_option;
                delete docData.explanation;
            }

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    OK: true,
                    response: { docId, ...docData },
                    query,
                    authentication,
                }),
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
    } else if (path.startsWith("/MCQ/review") && httpMethod === "POST") {
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

        if (!authentication.contributor.admin) {
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
            if (!questionDoc.exists) {
                throw new Error("Question does not exist");
            }

            if (questionDoc.data().published) {
                throw new Error("Question is already published");
            }

            if (action === "approve") {
                const {
                    code,
                    question,
                    screenshot,
                    explanation,
                    correct_option,
                    option_1_value,
                    option_2_value,
                    option_3_value,
                    option_4_value,
                    admin_message_id,
                } = questionDoc.data();

                const options = [
                    option_1_value,
                    option_2_value,
                    option_3_value,
                    option_4_value,
                ];

                const correct_option_id = _.indexOf(
                    options,
                    questionDoc.data()[`${correct_option}_value`]
                );

                if (code) {
                    if (!screenshot) throw Error("Screenshot not found");
                    const sendPhoto = await bot.sendPhoto(
                        `-100${chat_id}`,
                        screenshot
                    );

                    const sendPoll = await bot.sendPoll(
                        `-100${chat_id}`,
                        question,
                        options,
                        {
                            reply_to_message_id: sendPhoto.message_id,
                            is_anonymous: false,
                            correct_option_id,
                            explanation,
                            type: "quiz",
                        }
                    );

                    await bot.sendMessage(
                        `-100${admin_chat_id}`,
                        `<b>${authentication.contributor.name}</b> reviewed this question and marked <i>approved</i>. Hence the question is published on telegram group.`,
                        {
                            parse_mode: "HTML",
                            reply_to_message_id: admin_message_id,
                            reply_markup: _.set({}, "inline_keyboard[0]", [
                                {
                                    text: "Open",
                                    url: `https://t.me/c/${chat_id}/${sendPoll.message_id}`,
                                },
                            ]),
                        }
                    );

                    await questionRef.update({
                        published: true,
                        publish_date: Date.now(),
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
                } else {
                    const sendPoll = await bot.sendPoll(
                        `-100${chat_id}`,
                        question,
                        options,
                        {
                            is_anonymous: false,
                            correct_option_id,
                            explanation,
                            type: "quiz",
                        }
                    );

                    await bot.sendMessage(
                        `-100${admin_chat_id}`,
                        `<b>${authentication.contributor.name}</b> reviewed this question and marked <i>approved</i>. Hence the question is published on telegram group.`,
                        {
                            parse_mode: "HTML",
                            reply_to_message_id: admin_message_id,
                            reply_markup: _.set({}, "inline_keyboard[0]", [
                                {
                                    text: "Open",
                                    url: `https://t.me/c/${chat_id}/${sendPoll.message_id}`,
                                },
                            ]),
                        }
                    );

                    await questionRef.update({
                        published: true,
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
                }
            } else if (action === "decline") {
                const { admin_message_id } = questionDoc.data();

                await bot.sendMessage(
                    `-100${admin_chat_id}`,
                    `<b>${authentication.contributor.name}</b> reviewed this question and marked <i>declined</i>. Hence the question is deleted from database.`,
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
    }
};
