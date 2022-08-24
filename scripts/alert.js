const root = process.cwd();
const moment = require("moment");
const { readFileSync } = require("fs");
const headers = { token: process.env.api_key || "12345", auth_mode: "api" };
const baseUrl = process.env.baseUrl || "http://localhost:8888";
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

console.log(`Current baseUrl is ${baseUrl}`);
console.log("Header is", headers);

function main() {
    const configs = JSON.parse(
        readFileSync(`${root}/functions/files/configs.json`, "utf-8")
    );

    const topics = JSON.parse(
        readFileSync(`${root}/functions/files/topics.json`, "utf-8")
    );

    const timetable = JSON.parse(
        readFileSync(`${root}/functions/files/timetable.json`, "utf-8")
    );

    const contributors = JSON.parse(
        readFileSync(`${root}/functions/files/contributors.json`, "utf-8")
    );

    const day = moment().utcOffset("+05:30").day();
    const hour = moment().utcOffset("+05:30").hour();
    const week = moment().utcOffset("+05:30").week();
    const year = moment().utcOffset("+05:30").year();
    const slot = configs.slots.find((s) => hour >= s.startHr && hour < s.endHr);

    if (!slot) {
        return [true, "No active slot running. Alert job cancelled."];
    }

    const schedule = timetable[day][slot.code];
    const { topic: _topic, assignee: _assignee } = schedule;

    if (!_topic) {
        return [
            true,
            "Its a active slot but no topic is assigned to this slot. Alert Job cancelled.",
        ];
    }

    if (configs.ignore.includes(_assignee) || schedule.ignore) {
        return [
            true,
            "The assignee has requested not to be disturbed for the assigned slot. Alert Job canncelled",
        ];
    }

    const topic = topics.find((t) => t.code === _topic);
    const assignee = contributors.find((c) => c.code === _assignee);
    const mention = `<a href="tg://user?id=${assignee?.telegram}">${assignee?.name}</a>`;

    if (!topic || !assignee) {
        return [
            true,
            "Either the topic is removed from the topic list or the assignee has left the MCQ team. Alert job cancelled.",
        ];
    }

    return fetch(
        `${baseUrl}/mcq-get/list?week=${week}&year=${year}&topic=${_topic}&author=${_assignee}`,
        {
            headers,
            method: "GET",
        }
    )
        .then((resp) => resp.json())
        .then((list) => {
            if (!list.OK || !list.count) {
                return [
                    false,
                    `Contributor ${mention} has been assigned with topic ${topic.name}, ` +
                        `Scheduler cannot find any question with the given topic from the assigned contributor. ` +
                        `Please post the question if not posted yet.`,
                ];
            } else {
                const [question] = list.response;
                if (question.approved) {
                    if (!question.poll_id) {
                        return fetch(
                            `${baseUrl}/mcq-post/publish?id=${question.docId}`,
                            {
                                headers,
                                method: "POST",
                            }
                        )
                            .then((resp) => resp.json())
                            .then((post) => {
                                if (post.OK) {
                                    return [
                                        true,
                                        `Approved question from contributor ${mention} with topic '${topic.name}' was unpublished. ` +
                                            `It has been published now.`,
                                    ];
                                } else {
                                    return [
                                        false,
                                        `Approved question from contributor ${mention} with topic '${topic.name}' was unpublished. ` +
                                            `Attempt to publish the question failed with the following error: ${post.error}`,
                                    ];
                                }
                            })
                            .catch((e) => {
                                return [false, e.message];
                            });
                    } else {
                        return [
                            true,
                            `Contributor ${mention} has already published question for assigned topic '${topic.name}'`,
                        ];
                    }
                } else {
                    return [
                        false,
                        `Unapproved question from contributor ${mention} with topic '${topic.name}' was unpublished. ` +
                            `Please approve or decline it.`,
                    ];
                }
            }
        })
        .catch((e) => {
            return [false, e.message];
        });
}

(async function () {
    try {
        const [success, response] = await main();
        if (success) console.log(`Main: ${response.replace(/<[^>]+>/g, "")}`);
        else throw Error(response);
    } catch (e) {
        console.log(`Error: ${e.message.replace(/<[^>]+>/g, "")}`);
        fetch(`${baseUrl}/request/telegram`, {
            body: new URLSearchParams({ text: String(e.message) }).toString(),
            method: "POST",
            headers,
        });
    }
})();
