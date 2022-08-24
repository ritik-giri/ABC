const root = process.cwd();
const { shuffle } = require("lodash");
const { readFileSync, writeFileSync } = require("fs");
const moment = require("moment");
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

    const assignment = [];
    for (const [index, topic] of topics.entries()) {
        const assets = [];

        contributors.forEach(
            (contributor) =>
                contributor.slots &&
                !topic.ignore.includes(contributor.code) &&
                !topic.coverage.includes(contributor.code) &&
                !configs.ignore.includes(contributor.code) &&
                assets.push(contributor.code)
        );

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

    configs.end = moment().utcOffset("+05:30").add(1, "week").endOf("week").unix();
    configs.start = moment().utcOffset("+05:30").add(1, "week").startOf("week").unix();
    const slots = configs.slots.map((slot) => slot.code);
    const days = configs.days.map((day) => day.code);

    for (const slot of slots) {
        for (const day of days) {
            if (day === "0" && slot === "S1") continue;
            if (assignment.length) {
                const [topic, assignee, ignore = false] = assignment.pop();

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

    writeFileSync(
        `${root}/functions/files/topics.json`,
        JSON.stringify(topics, null, 4)
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

    fetch(`${baseUrl}/request/telegram`, {
        body: new URLSearchParams({ text }).toString(),
        method: "POST",
        headers,
    });
})();
