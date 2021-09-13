const Joi = require("joi");

const validateHeaders = (headers) => {
    const headersSchema = Joi.object()
        .keys({
            token: Joi.string().optional(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(headersSchema).validate(headers);
};

const validateMCQCreate = (body) => {
    const createSchema = Joi.object()
        .keys({
            date: Joi.date().default(Date.now()),
            question: Joi.string().required(),
            topic: Joi.string().required(),
            code: Joi.string().optional(),
            language: Joi.string().when('code', {
                is: Joi.exist(),
                then: Joi.required(),
            }),
            explanation: Joi.string().optional(),
            option_1_value: Joi.string().required(),
            option_2_value: Joi.string().required(),
            option_3_value: Joi.string().required(),
            option_4_value: Joi.string().required(),
            correct_option: Joi.string().required(),
            published: Joi.boolean().default(false),
            author: Joi.string().optional(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(createSchema).validate(body);
};

const validateMCQList = (query) => {
    const listSchema = Joi.object()
        .keys({
            cursor: Joi.string().optional(),
            lang: Joi.string().optional(),
            topic: Joi.string().optional(),
            author: Joi.string().optional(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(listSchema).validate(query);
};

const validateMCQQuestion = (query) => {
    const questionSchema = Joi.object()
        .keys({
            id: Joi.string().required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(questionSchema).validate(query);
};

const validateMCQreview = (body, headers) => {
    const reviewSchema = Joi.object()
        .keys({
            id: Joi.string().required(),
            action: Joi.string().valid("approve", "decline").required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(reviewSchema).validate(body);
};

module.exports = {
    validateHeaders,
    validateMCQCreate,
    validateMCQList,
    validateMCQQuestion,
    validateMCQreview,
};
