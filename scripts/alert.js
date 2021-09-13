const root = process.cwd();
const { readFileSync } = require("fs");
const firebase = require("firebase-admin");
const moment = require("moment")().utcOffset("+05:30");

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64")
);

if (firebase.apps.length === 0) {
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
    });
}



(function () {

    const configs = JSON.parse(
        readFileSync(`${root}/functions/files/configs.json`, "utf-8")
    );

    const topics = JSON.parse(
        readFileSync(`${root}/functions/files/topics.json`, "utf-8")
    );

    const timetable = JSON.parse(
        readFileSync(`${root}/functions/files/timetable.json`, "utf-8")
    );

    const contributors = JSON.parse(
        readFileSync(`${root}/functions/files/contributors.json`, "utf-8")
    );

    const day = moment.format('d');
    //gitconst date = moment.format('L');

    const timeHr = parseInt(moment.format("H"));
    const slot = configs.slots.find(
        (s) => timeHr >= s.startHr && timeHr < s.endHr
    );

    if (!slot) {
        console.log("No active slot running. Alert job cancelled.");
        process.exit(0);
    }

    const schedule = timetable[day][slot.code];
    const { topic: _topic, assignee: _assignee } = schedule

    if (!_topic) {
        console.log("Its a active slot but no topic is assigned to this slot. Alert Job cancelled.");
        process.exit(0);
    }

    if (configs.ignore.includes(_assignee)) {
        console.log("The assignee has requested not to be disturbed for the assigned slot. Alert Job canncelled");
        process.exit(0);
    }

    const topic = topics.find(t => t.code === _topic);
    const assignee = contributors.find(c => c.code === _assignee);

    if (!topic || !assignee) {
        console.log("Either the topic is removed from the list or the assignee has left the MCQ team. Alert job cancelled.");
        process.exit(0);
    }

})();
