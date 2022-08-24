import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Footer from "./components/Footer";
import About from "./pages/about-page/About";
import Edit from "./pages/edit-page/Edit";
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
        fetch("/request/data/timetable")
            .then((resp) => resp.json())
            .then((timetable) => dispatch(setTimetable(timetable.data)));
        fetch("/request/data/contributors")
            .then((resp) => resp.json())
            .then((contributors) =>
                dispatch(setContributors(contributors.data))
            );
        fetch("/request/data/topics")
            .then((resp) => resp.json())
            .then((topics) => dispatch(setTopics(topics.data)));
        fetch("/request/data/configs")
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
                    <Route exact path="/question/edit/:id" component={Edit} />
                    <Route exact path="/about" component={About} />
                </Switch>
            </BrowserRouter>
            <Footer />
        </div>
    );
}

export default App;
