const {
    map,
    set,
    last,
    uniq,
    take,
    omit,
    indexOf,
    compact,
    matches,
    flattenDeep,
    find,
} = require("lodash");

const fetch = require("node-fetch");
const auth = require("./utils/auth");

const validate = require("./utils/validate");
const { database } = require("./utils/firebase");
const telegram = require("node-telegram-bot-api");
const moment = require("moment")().utcOffset("+05:30");

const configs = require("./files/configs.json");
const timetable = require("./files/timetable.json");

const { bot_token, admin_chat_id, chat_id, api_key } = process.env;
const bot = new telegram(bot_token, { polling: false });

exports.handler = async (event, context) => {
    const path = event.path;
    const httpMethod = event.httpMethod;
    const rawUrl = new URL(event.rawUrl).origin;
    const { value: headers, error } = validate.validateHeaders(event.headers);

    const {
        contributor = {},
        OK: authentication,
        error: err_authentication,
    } = await auth(headers.token, rawUrl);
    const api_authentication = headers.key === api_key;

    if (
        !((authentication || api_authentication) && !error) &&
        httpMethod === "POST"
    ) {
        return {
            statusCode: 401,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({
                OK: false,
                error: err_authentication,
            }),
            isBase64Encoded: false,
        };
    }

    if (path.startsWith("/MCQ/schedule") && httpMethod === "GET") {
        const { value: query, error } = validate.validateMCQschedule(
            Object.fromEntries(new URLSearchParams(event.rawQuery))
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

        try {
            if (!authentication) throw Error("Unauthorized");
            const collection = database.collection("questions");
            const results = await collection
                .where("week", "==", moment.week())
                .where("year", "==", moment.year())
                .orderBy("date", "desc")
                .get();

            const result = find(results.docs, (r) =>
                matches({
                    approved: true,
                    topic: query.topic,
                    author: contributor.code,
                })(r.data())
            );

            if (result && !contributor.admin) {
                throw Error(
                    `Question with given topic is already posted by contributor: ${contributor.name}`
                );
            }

            const [schedule] = compact(
                flattenDeep(
                    Object.keys(timetable).map((day) => {
                        return Object.keys(timetable[day]).map((slot) => {
                            const { assignee, topic } = timetable[day][slot];

                            if (
                                assignee === contributor.code &&
                                topic === query.topic
                            ) {
                                return configs.slots.map((s) => {
                                    return s.code === slot
                                        ? moment
                                              .day(day)
                                              .hour(s.startHr)
                                              .minute(0)
                                              .second(0)
                                              .unix()
                                        : 0;
                                });
                            }

                            return 0;
                        });
                    })
                )
            );

            if (!schedule && !contributor.admin) {
                throw Error(
                    `Current timetable doesn't allow posting this topic from contributor ${contributor.name}.`
                );
            }

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    OK: true,
                    schedule: schedule || moment.second(0).unix(),
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
    } else if (path.startsWith("/MCQ/create") && httpMethod === "POST") {
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
                    reply_markup: set({}, "inline_keyboard[0]", [
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
                filter = {},
                body = { OK: true, response: [], nextPage: false };
            const { week, year, lang, topic, author, cursor } = query;

            questionsRef = database
                .collection("questions")
                .orderBy("date", "desc");

            if (week && year) {
                questionsRef = questionsRef
                    .where("week", "==", moment.week())
                    .where("year", "==", moment.year());
            }

            if (topic) filter.topic = topic;
            if (lang) filter.language = lang;
            if (author) filter.author = author;
            if (!authentication) filter.approved = true;

            if (!cursor) questions = await questionsRef.get();
            else questions = await questionsRef.startAfter(cursor).get();

            const response = compact(
                map(questions.docs, (question) => {
                    const docId = question.id;
                    const docData = authentication
                        ? question.data()
                        : omit(question.data(), [
                              "explaination",
                              "correct_option",
                          ]);

                    if (matches(filter)(docData)) return { docId, ...docData };
                })
            );

            if (response.length) {
                body.response = week && year ? response : take(response, 10);
                body.count = body.response.length;
                if (response.length > body.response.length) {
                    body.nextPage = true;
                    body.nextCursor = last(body.response).date;
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
            const docData = authentication
                ? question.data()
                : omit(question.data(), ["explaination", "correct_option"]);

            if (!docData.approved && !authentication && !api_authentication)
                throw Error("Question not found");

            return {
                statusCode: 200,
                headers: {
                    "content-type": `application/json`,
                },
                body: JSON.stringify({
                    OK: true,
                    response: { docId, ...docData },
                    query,
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
                    `<b>${contributor.name}</b> reviewed this question and marked <i>approved</i>. Hence the question is ready to be posted.`,
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
                    `<b>${contributor.name}</b> reviewed this question and marked <i>declined</i>. Hence the question is deleted from database.`,
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
    } else if (path.startsWith("/MCQ/post") && httpMethod === "POST") {
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
