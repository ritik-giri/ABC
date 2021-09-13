import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Home from "./pages/home-page/Home";
import Post from "./pages/post-page/Post";
import Question from "./pages/question-page/Question";
import Questions from "./pages/questions-page/Questions";
import {
    setContributors,
    setTimetable,
    setConfigs,
    setTopics,
} from "./redux/actions/actions";

function App() {
    const dispatch = useDispatch();
    useEffect(() => {
        fetch("/data/timetable")
            .then((resp) => resp.json())
            .then((timetable) => dispatch(setTimetable(timetable.data)));
        fetch("/data/contributors")
            .then((resp) => resp.json())
            .then((contributors) =>
                dispatch(setContributors(contributors.data))
            );
        fetch("/data/topics")
            .then((resp) => resp.json())
            .then((topics) => dispatch(setTopics(topics.data)));
        fetch("/data/configs")
            .then((resp) => resp.json())
            .then((configs) => dispatch(setConfigs(configs.data)));
        return () => {};
        // eslint-disable-next-line
    }, []);
    return (
        <div>
            <BrowserRouter>
                <Switch>
                    <Route exact path="/" component={Home} />
                    <Route exact path="/post" component={Post} />
                    <Route exact path="/questions" component={Questions} />
                    <Route exact path="/question/:id" component={Question} />
                </Switch>
            </BrowserRouter>
        </div>
    );
}

export default App;
