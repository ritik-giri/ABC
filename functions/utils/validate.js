const Joi = require("joi");
const moment = require("moment");

const validateHeaders = (headers) => {
    const headersSchema = Joi.object()
        .keys({
            token: Joi.string().optional(),
            api_key: Joi.string().optional(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(headersSchema).validate(headers);
};

const validateMCQCreate = (body) => {
    const week = moment().utcOffset("+05:30").week();
    const year = moment().utcOffset("+05:30").year();

    const createSchema = Joi.object()
        .keys({
            date: Joi.date().default(moment.unix()),
            question: Joi.string().required(),
            topic: Joi.string().required(),
            code: Joi.string().optional(),
            language: Joi.string().when("code", {
                is: Joi.exist(),
                then: Joi.required(),
            }),
            explanation: Joi.string().optional(),
            option_1_value: Joi.string().required(),
            option_2_value: Joi.string().required(),
            option_3_value: Joi.string().required(),
            option_4_value: Joi.string().required(),
            correct_option: Joi.string().required(),
            approved: Joi.boolean().default(false),
            author: Joi.string().optional(),
            week: Joi.number().default(week),
            year: Joi.number().default(year),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(createSchema).validate(body);
};

const validateMCQList = (query) => {
    const listSchema = Joi.object()
        .keys({
            week: Joi.number().optional(),
            year: Joi.number().optional(),
            cursor: Joi.number().optional(),
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

const validateMCQreview = (body) => {
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

const validateMCQschedule = (query) => {
    const reviewSchema = Joi.object()
        .keys({
            topic: Joi.string().required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(reviewSchema).validate(query);
};

const validateMCQpost = (query) => {
    const reviewSchema = Joi.object()
        .keys({
            id: Joi.string().required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(reviewSchema).validate(query);
};

module.exports = {
    validateHeaders,
    validateMCQCreate,
    validateMCQList,
    validateMCQQuestion,
    validateMCQreview,
    validateMCQschedule,
    validateMCQpost,
};
