const root = process.cwd();
const { entries, some, shuffle } = require("lodash");
const { readFileSync, writeFileSync } = require("fs");
const moment = require("moment");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const week = moment().utcOffset("+05:30").week();
const year = moment().utcOffset("+05:30").year();
const baseUrl = process.env.baseUrl || "http://localhost:8888";
const headers = { key: process.env.api_key || "12345" };

function getDay(day) {
    switch (parseInt(day)) {
        case 0:
            return "Sunday";
        case 1:
            return "Monday";
        case 2:
            return "Tuesday";
        case 3:
            return "Wednesday";
        case 4:
            return "Thursday";
        case 5:
            return "Friday";
        case 6:
            return "Saturday";
        default:
            return "";
    }
}

(async function () {
    const configs = JSON.parse(
        readFileSync(`${root}/functions/files/configs.json`, "utf-8")
    );

    const topics = shuffle(
        JSON.parse(readFileSync(`${root}/functions/files/topics.json`, "utf-8"))
    );

    const timetable = JSON.parse(
        readFileSync(`${root}/functions/files/timetable.json`, "utf-8")
    );

    const contributors = JSON.parse(
        readFileSync(`${root}/functions/files/contributors.json`, "utf-8")
    ).map((c) => ({ ...c, slots: 3 }));

    const getTopicName = (codeName) => {
        var find = topics.find((topic) => topic.code === codeName);
        return find ? find.name : "";
    };

    const getAssigneeName = (codeName) => {
        var find = contributors.find(
            (contributor) => contributor.code === codeName
        );
        return find ? find.name : "";
    };

    fetch(`${baseUrl}/mcq-get/list?week=${week}&year=${year}`)
        .then((resp) => resp.json())
        .then((list) => {
            const defaulter = [];
            for (const [day, slots] of entries(timetable))
                for (const [slot, { topic, assignee, ignore }] of entries(
                    slots
                )) {
                    if (!topic || !assignee || ignore) continue;
                    if (configs.ignore.includes(assignee)) continue;
                    some(list.response, { topic, author: assignee }) ||
                        defaulter.push(
                            `${getDay(day)} (${slot}) => ${getTopicName(
                                topic
                            )} (${getAssigneeName(assignee)})`
                        );
                }

            return defaulter.join("\n");
        })
        .then((defaulter) => {
            if (!defaulter) return;
            let text = `Here is the list of defaulters for #${week}week${year}:\n\n${defaulter}`;
            text += `\n\nRepeated violations will be reported to club's core team resulting in unfavourable situations.`;

            fetch(`${process.env.baseUrl}/telegram`, {
                body: JSON.stringify({ text, pin: true }),
                method: "POST",
                headers,
            });
        });

    const assignment = [];
    for (const [index, topic] of topics.entries()) {
        const assets = [];

        for (const contributor of contributors)
            contributor.slots &&
                !topic.ignore.includes(contributor.code) &&
                !topic.coverage.includes(contributor.code) &&
                !configs.ignore.includes(contributor.code) &&
                assets.push(contributor.code);

        if (topic.slots > assets.length) {
            topics[index]["coverage"] = [];
            contributors.forEach(
                (contributor) =>
                    contributor.slots &&
                    !topic.ignore.includes(contributor.code) &&
                    !configs.ignore.includes(contributor.code) &&
                    !assets.includes(contributor.code) &&
                    assets.push(contributor.code)
            );
        }

        assets.reverse();
        for (let i = 0; i < topic.slots; i++) {
            if (!assets.length) break;
            const contributor = assets.pop();
            const child = contributors.findIndex((c) => c.code === contributor);
            assignment.push([topic.code, contributor]);
            topics[index].coverage.push(contributor);
            contributors[child].slots -= 1;
        }
    }

    configs.end = moment().utcOffset("+05:30").endOf("week").unix();
    configs.start = moment().utcOffset("+05:30").startOf("week").unix();
    const slots = configs.slots.map((slot) => slot.code);
    const days = configs.days.map((day) => day.code);

    for (const slot of slots) {
        for (const day of days) {
            if (day === "0" && slot === "S1") continue;
            if (assignment.length) {
                const [topic, assignee, ignore] = [...assignment.pop(), false];

                timetable[day][slot] = {
                    topic,
                    ignore,
                    assignee,
                };
            } else {
                timetable[day][slot] = {
                    topic: "",
                    assignee: "",
                };
            }
        }
    }

    const removeCountKey = (key, value) => key === "count" && value;

    writeFileSync(
        `${root}/functions/files/topics.json`,
        JSON.stringify(topics, removeCountKey, 4)
    );

    writeFileSync(
        `${root}/functions/files/timetable.json`,
        JSON.stringify(timetable, null, 4)
    );

    writeFileSync(
        `${root}/functions/files/configs.json`,
        JSON.stringify(configs, null, 4)
    );

    const text =
        "New timetable generated. Once netlify deploys the site, Please find the updated timetable.";

    fetch(`${baseUrl}/telegram`, {
        body: JSON.stringify({ text }),
        method: "POST",
        headers,
    });
})();
