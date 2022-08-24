const moment = require("moment");
const fetch = require("node-fetch");
const { uniq, indexOf, sample } = require("lodash");
const validate = require("./utils/validate");
const { database, storage, field } = require("./utils/firebase");
const { error, response } = require("./utils/string");
const telegram = require("./utils/telegram");
const base = require("./utils/base");

exports.handler = async (event, _context) => {
    const main = new mcq_post(event);
    return await main.execute();
};

class mcq_post extends base {
    #error(message) {
        throw new Error(message);
    }

    async execute() {
        await this.authenticate();
        this.telegram = new telegram();

        if (!this.auth) {
            return this.resp_404();
        }

        switch (this.path) {
            case "/mcq-post/create":
                return this.#create();
            case "/mcq-post/edit":
                return this.#edit();
            case "/mcq-post/review":
                return this.#review();
            case "/mcq-post/publish":
                return this.#publish();
            default:
                return this.resp_404();
        }
    }

    async #rm_code2img(id) {
        try {
            const file = storage.file(`${id}.png`);
            const [exists] = await file.exists();
            exists && (await file.delete());
            return true;
        } catch (e) {
            return false;
        }
    }

    async #code2img(id, language, code) {
        const url = new URL("https://code2img.vercel.app/api/to-image");

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

        try {
            (!language || !code) && this.error("Insufficient data");
            const file = storage.file(`${id}.png`);
            const [exists] = await file.exists();
            exists && (await file.delete());

            url.searchParams.set("language", language);
            url.searchParams.set("theme", theme);
            url.searchParams.set("padding", 0);

            const response = await fetch(url, {
                method: "POST",
                body: code,
            });

            const image = await response.buffer();

            await file.save(image, {
                public: true,
                resumable: false,
                metadata: {
                    contentType: "image/png",
                },
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    async #create() {
        const { value: data, error: err } = validate.validateMCQCreate(
            this.body
        );

        try {
            err && this.#error(err);
            const options = [
                data.option_1_value,
                data.option_2_value,
                data.option_3_value,
                data.option_4_value,
            ];

            uniq(options).length !== options.length &&
                this.#error(error.OPTION_DUPLICATE);

            Object.assign(data, { author: this.user.code });
            const question = database.collection("questions").doc();

            if (data.code) {
                const code2img = await this.#code2img(
                    question.id,
                    data.language,
                    data.code
                );

                !code2img && this.#error(error.SCREENSHOT_FETCH);
            }

            const admin_message_id = await this.telegram.create_quiz(
                this.get_mention(),
                `${this.url}/question/${question.id}`
            );

            Object.assign(data, { admin_message_id });
            await question.set(data);

            return this.resp_200({ OK: true, docId: question.id, ...data });
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }

    async #edit() {
        const docId = this.query.id;
        const { value: data, error: err } = validate.validateMCQEdit(this.body);

        try {
            const options = [
                data.option_1_value,
                data.option_2_value,
                data.option_3_value,
                data.option_4_value,
            ];

            (err || !docId) && this.#error(error.LESS_DATA);
            uniq(options).length !== options.length &&
                this.#error(error.OPTION_DUPLICATE);

            const questionRef = database.collection("questions").doc(docId);
            const question = await questionRef.get();

            !question.exists && this.#error(error.QUESTION_NOT_FOUND);
            const { poll_id, code, approved, author, admin_message_id } =
                question.data();

            (((author !== this.user.code || approved) && !this.user.admin) ||
                poll_id) &&
                this.#error(error.QUESTION_ALTER);

            if (data.code && data.code !== code) {
                const code2img = await this.#code2img(
                    question.id,
                    data.language,
                    data.code
                );

                !code2img && this.#error(error.SCREENSHOT_FETCH);
            } else if (code && !data.code) {
                data.code = field.delete();
                data.language = field.delete();
                await this.#rm_code2img(question.id);
            }

            await questionRef.update(data);
            await this.telegram.edit_quiz(this.get_mention(), admin_message_id);

            return this.resp_200({ OK: true, docId: question.id, ...data });
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }

    async #review() {
        const { value: data, error: err } = validate.validateMCQreview(
            this.body
        );

        try {
            (!this.user.admin || err) && this.#error(error.LESS_DATA);

            const { id, action } = data;
            const collection = database.collection("questions");
            const questionRef = collection.doc(id);
            const questionDoc = await questionRef.get();

            !questionDoc.exists && this.#error(error.QUESTION_NOT_FOUND);
            const { approved, admin_message_id } = questionDoc.data();
            approved && !this.user.admin && this.#error(error.ALREADY_APPROVED);

            if (action === "approve") {
                await this.telegram.review_quiz_approve(
                    this.get_mention(),
                    admin_message_id
                );

                await questionRef.update({
                    approved: true,
                });

                return this.resp_200({ message: response.APPROVE_SUCCESS });
            } else if (action === "decline") {
                await questionRef.delete();
                await this.telegram.review_quiz_decline(
                    this.get_mention(),
                    admin_message_id
                );

                return this.resp_200({ message: response.DECLINE_SUCCESS });
            }
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }

    async #publish() {
        const {
            error: err,
            value: { id },
        } = validate.validateMCQpublish(this.query);

        try {
            let _poll_id;
            err && this.#error(err);
            const mention = this.get_mention();
            const collection = database.collection("questions");
            const questionRef = collection.doc(id);
            const questionDoc = await questionRef.get();
            const questionUrl = `${this.url}/question/${questionRef.id}`;
            !questionDoc.exists && this.#error(error.QUESTION_NOT_FOUND);

            const {
                code,
                poll_id,
                approved,
                question,
                schedule,
                explanation,
                correct_option,
                option_1_value,
                option_2_value,
                option_3_value,
                option_4_value,
            } = questionDoc.data();

            !approved && this.#error(error.UNAPPROVED);
            poll_id && this.#error(error.ALREADY_PUBLISHED);
            schedule > moment().utcOffset("+05:30").unix() &&
                !this.user.admin &&
                this.#error(error.EARLY_POST);

            const options = [
                option_1_value,
                option_2_value,
                option_3_value,
                option_4_value,
            ];

            const correct_option_id = indexOf(
                options,
                questionDoc.data()[`${correct_option}_value`]
            );

            if (code) {
                const file = storage.file(`${id}.png`);
                const [exists] = await file.exists();
                !exists && this.#error(error.SCREENSHOT_NOT_FOUND);

                const [screenshot] = await file.getSignedUrl({
                    action: "read",
                    expires: moment().add(1, "minute").toDate(),
                });

                !screenshot && this.error(error.SCREENSHOT_FETCH);
                _poll_id = await this.telegram.send_quiz_with_code(
                    questionUrl,
                    question,
                    options,
                    correct_option_id,
                    explanation,
                    screenshot,
                    mention
                );

                await file.delete();
            } else
                _poll_id = await this.telegram.send_quiz_without_code(
                    questionUrl,
                    question,
                    options,
                    correct_option_id,
                    explanation,
                    mention
                );

            await questionRef.update({ poll_id: _poll_id });
            return this.resp_200({ message: response.PUBLISH_SUCCESS });
        } catch (error) {
            return this.resp_500({ error: error.message });
        }
    }
}
