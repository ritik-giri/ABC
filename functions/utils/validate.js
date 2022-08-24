const Joi = require("joi");
const moment = require("moment");

const validateMCQCreate = (body) => {
    const date = moment().utcOffset("+05:30").unix();
    const week = moment().utcOffset("+05:30").week();
    const year = moment().utcOffset("+05:30").year();

    const createSchema = Joi.object()
        .keys({
            question: Joi.string().required(),
            topic: Joi.string().required(),
            code: Joi.string().optional(),
            schedule: Joi.number().required(),
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
            date: Joi.date().default(date),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(createSchema).validate(body);
};

const validateMCQEdit = (body) => {
    const editSchema = Joi.object()
        .keys({
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
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(editSchema).validate(body);
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
    const scheduleSchema = Joi.object()
        .keys({
            topic: Joi.string().required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(scheduleSchema).validate(query);
};

const validateMCQpublish = (query) => {
    const publishSchema = Joi.object()
        .keys({
            id: Joi.string().required(),
        })
        .options({
            stripUnknown: true,
        });

    return Joi.compile(publishSchema).validate(query);
};

module.exports = {
    validateMCQEdit,
    validateMCQCreate,
    validateMCQList,
    validateMCQQuestion,
    validateMCQreview,
    validateMCQschedule,
    validateMCQpublish,
};
