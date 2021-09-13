const fetch = require("node-fetch");
const { auth } = require("./firebase")

const login = async (idToken, rawUrl) => {
    try {
        const payload = await auth.verifyIdToken(idToken);

        const res = await fetch(`${rawUrl}/data/contributors?action=find&key=email&value=${payload.email}`);
        const contributor = await res.json();

        if (!contributor.OK) {
            throw Error()
        }

        return { OK: contributor.OK, email: payload.email, contributor: contributor.data };
    } catch (error) {
        return { OK: false, error: "Invalid authorization token" };
    }
};

module.exports = login;