const { find } = require("lodash");
const { auth } = require("./firebase");
const contributors = require("../files/contributors.json");

class base {
    #api_key;

    constructor(event) {
        ({
            url: this.url,
            path: this.path,
            method: this.method,
            headers: this.headers,
            query: this.query,
            body: this.body,
        } = this.#parseEvent(event)) && this.#setToken();
    }

    #parseEvent(event) {
        const path = event.path;
        const headers = event.headers;
        const method = event.httpMethod;
        const url = new URL(event.rawUrl).origin;
        const body = Object.fromEntries(new URLSearchParams(event.body));
        const query = Object.fromEntries(new URLSearchParams(event.rawQuery));

        return { url, path, method, headers, query, body };
    }

    #setToken() {
        ({ API_KEY: this.#api_key } = process.env);
    }

    async authenticate() {
        switch (this.headers.auth_mode) {
            case "api":
                this.auth = this.headers.token === this.#api_key;
                this.auth === true &&
                    (this.user = {
                        name: "CDH Bot",
                        telegram: 2070558552,
                        email: "cdhiter@gmail.com",
                        code: "CDH",
                    });
                break;
            default:
                await new Promise((resolve, reject) =>
                    auth
                        .verifyIdToken(this.headers.token)
                        .then((payload) => {
                            this.user = find(contributors, {
                                email: payload.email,
                            });
                            this.user.email && (this.auth = true);
                            resolve();
                        })
                        .catch((error) => reject(error))
                ).catch((_error) => (this.auth = false));
        }
    }

    get_mention() {
        return `<a href="tg://user?id=${this.user.telegram}">${this.user.name}</a>`;
    }

    resp_200(body) {
        return {
            statusCode: 200,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ ...body, OK: true }),
            isBase64Encoded: false,
        };
    }

    resp_404() {
        return {
            statusCode: 404,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ message: "Not found", OK: false }),
            isBase64Encoded: false,
        };
    }

    resp_500(body) {
        return {
            statusCode: 500,
            headers: {
                "content-type": `application/json`,
            },
            body: JSON.stringify({ ...body, OK: false }),
            isBase64Encoded: false,
        };
    }
}

module.exports = base;
