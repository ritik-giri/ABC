const base = require("./utils/base");
const telegram = require("./utils/telegram");
const contributors = require("./files/contributors.json");
const timetable = require("./files/timetable.json");
const configs = require("./files/configs.json");
const topics = require("./files/topics.json");

exports.handler = async (event, _context) => {
    const main = new request(event);
    return await main.execute();
};

class request extends base {
    async execute() {
        await this.authenticate();
        this.telegram_api = new telegram();

        switch (this.path) {
            case "/request/data/contributors":
            case "/request/data/timetable":
            case "/request/data/configs":
            case "/request/data/topics":
                return this.#data();
            case "/request/login":
                return this.#login();
            case "/request/telegram":
                return this.#telegram();
            default:
                return this.resp_404();
        }
    }

    #error(message) {
        throw new Error(message);
    }

    async #telegram() {
        try {
            !this.auth && this.#error("401ER");
            await this.telegram_api.send_message_admin(
                this.body.text,
                this.body.pin
            );

            return this.resp_200();
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }

    async #login() {
        try {
            !this.auth && this.#error("Invalid login");
            this.method !== "POST" && this.#error("POST request only");

            return this.resp_200({
                email: this.user.email,
                contributor: this.user,
            });
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }

    async #data() {
        switch (this.path) {
            case "/request/data/timetable":
                return this.resp_200({ data: timetable });
            case "/request/data/contributors":
                return this.resp_200({ data: contributors });
            case "/request/data/configs":
                return this.resp_200({ data: configs });
            case "/request/data/topics":
                return this.resp_200({ data: topics });
            default:
                return this.resp_404();
        }
    }
}
