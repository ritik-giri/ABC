const auth = require('./utils/auth');

exports.handler = async (event, context) => {
  const body = new URLSearchParams(event.body);
  const idToken = body.get("tokenId");
  const rawUrl = new URL(event.rawUrl).origin;

  const verification = await auth(idToken, rawUrl);

  return {
    statusCode: 200,
    headers: {
      "content-type": `application/json`,
    },
    body: JSON.stringify(verification),
    isBase64Encoded: false,
  };
};
