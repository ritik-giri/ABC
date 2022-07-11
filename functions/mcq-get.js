const {
    map,
    last,
    take,
    omit,
    pick,
    find,
    compact,
    matches,
    flattenDeep,
} = require("lodash");

const auth = require("./utils/auth");
const validate = require("./utils/validate");
const { database } = require("./utils/firebase");
const moment = require("moment");

const configs = require("./files/configs.json");
const timetable = require("./files/timetable.json");
const { API_KEY: api_key } = process.env;

exports.handler = async (event, context) => {
    const httpMethod = event.httpMethod;
    const path = last(event.path.split("/"));
    const rawUrl = new URL(event.rawUrl).origin;
    const api_authentication = event.headers.key === api_key;
    const { contributor = {}, OK: authentication } = await auth(
        event.headers.token,
        rawUrl
    );

    if (httpMethod !== "GET") {
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
    } else console.log({ authentication, api_authentication });

    if (path === "schedule") {
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
                .where("week", "==", moment().utcOffset("+05:30").week())
                .where("year", "==", moment().utcOffset("+05:30").year())
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
                                    return (
                                        s.code === slot &&
                                        moment()
                                            .utcOffset("+05:30")
                                            .day(day)
                                            .hour(s.startHr)
                                            .minute(0)
                                            .second(0)
                                            .unix()
                                    );
                                });
                            } else return undefined;
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
                    schedule:
                        schedule ||
                        moment().utcOffset("+05:30").second(0).unix(),
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
    } else if (path === "list") {
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
                    .where("week", "==", week)
                    .where("year", "==", year);
            }

            if (topic) filter.topic = topic;
            if (lang) filter.language = lang;
            if (author) filter.author = author;
            if (!authentication && !api_authentication) filter.approved = true;

            if (!cursor) questions = await questionsRef.get();
            else questions = await questionsRef.startAfter(cursor).get();

            const response = compact(
                map(questions.docs, (question) => {
                    let docData = {},
                        docId = question.id;

                    if (matches(filter)(question.data())) {
                        if (!authentication && !api_authentication) {
                            docData = pick(question.data(), [
                                "docId",
                                "question",
                                "author",
                                "topic",
                                "date",
                            ]);
                        } else docData = question.data();
                        return { docId, ...docData };
                    }
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
    } else if (path === "question") {
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

            if (
                !question.exists ||
                !(question.data().approved || authentication)
            ) {
                throw Error("Question not found");
            }

            const docData = authentication
                ? question.data()
                : omit(question.data(), [
                      "admin_message_id",
                      "correct_option",
                      "explanation",
                      "screenshot",
                      "approved",
                      "schedule",
                      "poll_id",
                      "week",
                      "year",
                  ]);

            if (authentication)
                docData.canEdit =
                    !docData.poll_id &&
                    ((docData.author === contributor.code &&
                        !docData.approved) ||
                        contributor.admin)
                        ? true
                        : false;

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
    }
};
