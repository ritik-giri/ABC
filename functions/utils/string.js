const error = {
    LESS_DATA: "Insufficient Data",
    OPTION_DUPLICATE: "All the options should be unique.",
    SCREENSHOT_NOT_FOUND: "Screenshot not found",
    SCREENSHOT_FETCH: "Error fetching screenshot, Try again later.",
    QUESTION_NOT_FOUND: "Question not found",
    QUESTION_ALTER: "Question cannot be altered!",
    UNAUTHORISED: "You are not authorized to perform this action",
    ALREADY_APPROVED: "Question is already approved.",
    ALREADY_PUBLISHED: "Question is already published",
    UNAPPROVED:
        "Question is not approved yet. Please ask a admin to approve it first.",
    EARLY_POST:
        "The question has been scheduled for later time, Only admin can post the question before time.",
    NO_SCHEDULE: "Current timetable doesn't allow posting this topic.",
    ALREADY_POSTED: "Question with given topic is already posted.",
};

const message = {
    NEW_QUESTION: (mention) =>
        `❔ New question added for review (by ${mention})`,
    EDIT_QUESTION: (mention) => `${mention} made an edit to the question.`,
    APPROVE_QUESTION: (mention) =>
        `${mention} reviewed this question and marked <i>approved</i>. Hence the question is ready to be posted.`,
    DECLINE_QUESTION: (mention) =>
        `${mention} reviewed this question and marked <i>declined/deleted</i>. Hence the question is deleted from database.`,
    PUBLISH_QUESTION: (mention) => `${mention} published a new question on telegram.`,
};

const response = {
    APPROVE_SUCCESS: "Question approved successfully. Ready to be posted.",
    DECLINE_SUCCESS: "Question successfully deleted from database.",
    PUBLISH_SUCCESS: "Question successfully published on telegram.",
};

const string = {
    error,
    message,
    response,
};

module.exports = string;
