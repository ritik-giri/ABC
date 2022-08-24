const root = process.cwd();
const { entries, some, shuffle } = require("lodash");
const { readFileSync } = require("fs");
const moment = require("moment");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const week = moment().utcOffset("+05:30").week();
const year = moment().utcOffset("+05:30").year();
const baseUrl = process.env.baseUrl || "http://localhost:8888";
const headers = { token: process.env.api_key || "12345", auth_mode: "api" };

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

    const getDay = (dayCode) => {
        const dayName = moment().day(dayCode);
        return dayName.format("dddd");
    };

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

    fetch(`${baseUrl}/mcq-get/list?week=${week}&year=${year}`, { headers })
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
                            )} (${getAssigneeMention(assignee)})`
                        );
                }

            return defaulter.join("\n");
        })
        .then((defaulter) => {
            if (!defaulter) return;
            let text = `Here is the list of defaulters for #${week}week${year}:\n\n${defaulter}`;
            text += `\n\nRepeated violations will be reported to club's core team resulting in unfavourable situations.`;

            fetch(`${baseUrl}/request/telegram`, {
                body: new URLSearchParams({ text, pin: true }).toString(),
                method: "POST",
                headers,
            });
        });
})();
