const moment = require("moment");
const fetch = require("node-fetch");
const { sample } = require("lodash");
const { storage } = require("./utils/firebase");

const theme = sample([
    "a11y-dark",
    "atom-dark",
    "base16-ateliersulphurpool.light",
    "cb",
    "darcula",
    "default",
    "dracula",
    "duotone-dark",
    "duotone-earth",
    "duotone-forest",
    "duotone-light",
    "duotone-sea",
    "duotone-space",
    "ghcolors",
    "hopscotch",
    "material-dark",
    "material-light",
    "material-oceanic",
    "nord",
    "pojoaque",
    "shades-of-purple",
    "synthwave84",
    "vs",
    "vsc-dark-plus",
    "xonokai",
]);

exports.handler = async (event, context) => {
    let uploaded = false;
    const post = event.httpMethod === "POST";
    const name = event.queryStringParameters.id;
    const api_key = event.queryStringParameters.api_key;
    const language = event.queryStringParameters.language;
    const authenticated = api_key === process.env.API_KEY;
    const api_url = "https://code2img.vercel.app/api/to-image";

    if (!name) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: false, error: "Insufficient data" }),
            isBase64Encoded: false,
        };
    }

    try {
        const file = storage.file(`${name}.png`);
        const [exists] = await file.exists();

        if (language && authenticated && post && event.body) {
            uploaded = true;
            const response = await fetch(
                `${api_url}?language=${language}&theme=${theme}&padding=0`,
                {
                    method: "POST",
                    body: event.body,
                }
            );

            const image = await response.buffer();
            await file.save(image, {
                public: true,
                resumable: false,
                metadata: {
                    contentType: "image/png",
                },
            });
        } else if (!exists) throw Error("File not found.");

        const [screenshot] = await file.getSignedUrl({
            action: "read",
            expires: moment().add(1, "month").toDate(),
        });

        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({
                OK: true,
                uploaded,
                screenshot,
            }),
            isBase64Encoded: false,
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ OK: false, error: error.message }),
            isBase64Encoded: false,
        };
    }
};
