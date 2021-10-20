const root = process.cwd();
const fetch = require("node-fetch");
const { readFileSync } = require("fs");
const headers = { key: process.env.api_key };
const moment = require("moment")().utcOffset("+05:30");
const baseUrl = process.env.baseUrl || "http://localhost:8888";

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

    const day = moment.day();
    const hour = moment.hour();
    const week = moment.week();
    const year = moment.year();
    const slot = configs.slots.find((s) => hour >= s.startHr && hour < s.endHr);

    if (!slot) {
        return [0, "No active slot running. Alert job cancelled."];
    }

    const schedule = timetable[day][slot.code];
    const { topic: _topic, assignee: _assignee } = schedule;

    if (!_topic) {
        return [
            true,
            "Its a active slot but no topic is assigned to this slot. Alert Job cancelled.",
        ];
    }

    if (configs.ignore.includes(_assignee)) {
        return [
            true,
            "The assignee has requested not to be disturbed for the assigned slot. Alert Job canncelled",
        ];
    }

    const topic = topics.find((t) => t.code === _topic);
    const assignee = contributors.find((c) => c.code === _assignee);

    if (!topic || !assignee) {
        return [
            true,
            "Either the topic is removed from the list or the assignee has left the MCQ team. Alert job cancelled.",
        ];
    }

    return fetch(
        `${baseUrl}/MCQ/list?week=${week}&year=${year}&topic=${_topic}&author=${_assignee}`,
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
                    `Contributor "${assignee.name}" has been assigned with topic "${topic.name}", ` +
                        `Scheduler cannot find any question with the given topic from the contrbutor. ` +
                        `If not posted till now. Then post it ASAP.`,
                ];
            } else {
                const [question] = list.response;
                if (question.approved) {
                    if (!question.poll_id) {
                        return fetch(
                            `${baseUrl}/MCQ/post?id=${question.docId}`,
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
                                        `Approved question from contributor ${assignee.name} with topic ${topic.name} was unpublished. ` +
                                            `It has been published now.`,
                                    ];
                                } else {
                                    return [
                                        false,
                                        `Approved question from contributor ${assignee.name} with topic ${topic.name} was unpublished. ` +
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
                            `Contributor "${assignee.name}" has already published question for assigned topic "${topic.name}"`,
                        ];
                    }
                } else {
                    return [
                        false,
                        `Unapproved question from contributor ${assignee.name} with topic ${topic.name} was unpublished. ` +
                            `Please approve or decline it ASAP.`,
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
        if (success) console.log(`Main: ${response}`);
        else throw Error(response);
    } catch (e) {
        console.log(`Error: ${e.message}`);
        fetch(`${baseUrl}/telegram`, {
            body: e.message,
            method: "POST",
            headers,
        });
    }
})();
