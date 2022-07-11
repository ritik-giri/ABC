const root = process.cwd();
const moment = require("moment");
const { readFileSync } = require("fs");
const { entries, some } = require("lodash");

const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const tomorrow = moment().utcOffset("+05:30").add(1, "day");

const nextDate = tomorrow.format("LL (dddd)");
const nextDay = tomorrow.day();
const week = tomorrow.week();
const year = tomorrow.year();

const baseUrl = process.env.baseUrl || "http://localhost:8888";
const headers = { key: process.env.api_key || "12345" };
console.log(headers);

(async function () {
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
    ).map((c) => ({ ...c, slots: 3 }));

    const getTopicName = (codeName) => {
        var find = topics.find((topic) => topic.code === codeName);
        return find ? find.name : "";
    };

    const getAssigneeMention = (codeName) => {
        var find = contributors.find(
            (contributor) => contributor.code === codeName
        );
        if (find)
            return `<a href="tg://user?id=${find?.telegram}">${find?.name}</a>`;
        return "";
    };

    fetch(`${baseUrl}/mcq-get/list?week=${week}&year=${year}`)
        .then((resp) => resp.json())
        .then((list) => {
            const scheduleText = [];
            const slots = timetable[nextDay];

            for (const [slot, { topic, assignee, ignore }] of entries(slots)) {
                if (!topic || !assignee || ignore) continue;
                if (configs.ignore.includes(assignee)) continue;
                some(list.response, {
                    topic,
                    author: assignee,
                    approved: true,
                }) ||
                    scheduleText.push(
                        `Slot ${slot} => ${getTopicName(
                            topic
                        )} by ${getAssigneeMention(assignee)}`
                    );
            }

            return scheduleText.join("\n");
        })
        .then((schedule) => {
            if (!schedule) return;
            let text = `Reminder: Timetable for ${nextDate} [Tomorrow] is:\n\n${schedule}`;
            text += `\n\nMake sure to post your scheduled assignments on time. If already posted make sure to get it approved now.`;

            fetch(`${baseUrl}/telegram`, {
                body: JSON.stringify({ text, pin: true }),
                method: "POST",
                headers,
            });
        });
})();
