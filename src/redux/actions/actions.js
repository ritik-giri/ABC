import { ActionTypes } from "../constants/actionconstants";

export const setUser = (user) => ({
    type: ActionTypes.AUTHENTICATED_USER,
    payload: user,
});
export const setAuth = (auth) => ({
    type: ActionTypes.AUTH,
    payload: auth,
});
export const setContributors = (contributors) => ({
    type: ActionTypes.CONTRIBUTORS,
    payload: contributors,
});
export const setTimetable = (timetable) => ({
    type: ActionTypes.TIMETABLE,
    payload: timetable,
});
export const setTopics = (topics) => ({
    type: ActionTypes.TOPICS,
    payload: topics,
});

export const setConfigs = (configs) => ({
    type: ActionTypes.CONFIGS,
    payload: configs,
});
