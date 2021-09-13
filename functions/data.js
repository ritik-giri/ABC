const contributors = require("./files/contributors.json");
const timetable = require("./files/timetable.json");
const configs = require("./files/configs.json");
const topics = require("./files/topics.json");

const files = {
    contributors,
    timetable,
    configs,
    topics,
};

const parseValue = (value) => {
    return value === "true"
        ? true
        : value === "false"
        ? false
        : isNaN(value)
        ? value
        : parseInt(value);
};

exports.handler = async (event, context) => {
    const path = event.path;
    const file = path.split('/').pop();
    const body = {
        OK: false,
        data: null,
        error: "Data not found",
    };

    if (file === "timetable") {
        body.OK = true;
        body.data = files.timetable;
    } else {
        const { action, key, value } = event.queryStringParameters;

        if (action && key && value) {
            if (action === "filter") {
                const filter = files[file].filter(
                    (res) => res[key] === parseValue(value)
                );

                if (filter) {
                    body.OK = true;
                    body.data = filter;
                }
            } else if (action === "find") {
                const find = files[file].find(
                    (res) => res[key] === parseValue(value)
                );

                if (find) {
                    body.OK = true;
                    body.data = find;
                }
            }
        } else {
            body.OK = true;
            body.data = files[file];
        }

        if (body.OK) delete body.error;
    }

    return {
        statusCode: body.OK ? 200 : 404,
        headers: {
            "content-type": `application/json`,
        },
        body: JSON.stringify(body),
        isBase64Encoded: false,
    };
};
