import { ActionTypes } from "../constants/actionconstants";
let default_state = {
    auth: false,
    user: null,
    contributors: null,
    timetable: null,
    topics: null,
    configs: null,
};

let reducerFunction = (state = default_state, action) => {
    switch (action.type) {
        case ActionTypes.AUTH:
            return { ...state, auth: action.payload };
        case ActionTypes.AUTHENTICATED_USER:
            return { ...state, user: action.payload };
        case ActionTypes.CONTRIBUTORS:
            return { ...state, contributors: action.payload };
        case ActionTypes.TIMETABLE:
            return { ...state, timetable: action.payload };
        case ActionTypes.TOPICS:
            return { ...state, topics: action.payload };
        case ActionTypes.CONFIGS:
            return { ...state, configs: action.payload };
        default:
            return state;
    }
};

export default reducerFunction;
