const firebase = require("firebase-admin");

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64")
);

if (firebase.apps.length === 0) {
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount),
    });
}

const auth = firebase.auth();
const database = firebase.firestore();
const storage = firebase
    .storage()
    .bucket("gs://coding-wizards-club.appspot.com");
const field = firebase.firestore.FieldValue;

module.exports = {
    auth,
    field,
    storage,
    database,
};
