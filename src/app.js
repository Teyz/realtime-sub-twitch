const express = require("express");
const crypto = require("crypto");
const fetch = require('node-fetch');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 2000;
const twitchSigningSecret = process.env.SECRET;

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    return next();
});

const setTotalSubscriber = () => {
    fetch('http://localhost:4000/callback');
};

const discordCallback = () => {
    fetch('http://localhost:4000/discordCallback');
};

// function verifySignature(messageSignature, messageID, messageTimestamp, body) {
//     let message = messageID + messageTimestamp + body
//     let signature = crypto.createHmac('sha256', secret).update(message) // Remember to use the same secret set at creation
//     let expectedSignatureHeader = "sha256=" + signature.digest("hex")

//     return expectedSignatureHeader === messageSignature
// }

const verifyTwitchSignature = (req, res, buf, encoding) => {
    const messageId = req.header("Twitch-Eventsub-Message-Id");
    const timestamp = req.header("Twitch-Eventsub-Message-Timestamp");
    const messageSignature = req.header("Twitch-Eventsub-Message-Signature");
    const time = Math.floor(new Date().getTime() / 1000);
    console.log(`Message ${messageId} Signature: `, messageSignature);

    if (Math.abs(time - timestamp) > 600) {
        // needs to be < 10 minutes
        console.log(
            `Verification Failed: timestamp > 10 minutes. Message Id: ${messageId}.`
        );
        throw new Error("Ignore this request.");
    }

    if (!twitchSigningSecret) {
        console.log(`Twitch signing secret is empty.`);
        throw new Error("Twitch signing secret is empty.");
    }

    const computedSignature =
        "sha256=" +
        crypto
            .createHmac("sha256", twitchSigningSecret)
            .update(messageId + timestamp + buf)
            .digest("hex");
    console.log(`Message ${messageId} Computed Signature: `, computedSignature);

    if (messageSignature !== computedSignature) {
        throw new Error("Invalid signature.");
    } else {
        console.log("Verification successful");
    }
};

app.use(express.json({ verify: verifyTwitchSignature }));

app.post("/webhooks/callback", async (req, res) => {
    const messageType = req.header("Twitch-Eventsub-Message-Type");
    if (messageType === "webhook_callback_verification") {
        console.log("Verifying Webhook");
        return res.status(200).send(req.body.challenge);
    }

    const { type } = req.body.subscription;
    const { event } = req.body;

    console.log(
        `Receiving ${type} request for ${event.broadcaster_user_name}: `,
        event
    );

    if (type === 'stream.online') {
        discordCallback();
    }

    if (type === 'channel.subscribe') {
        setTotalSubscriber();
    }

    res.status(200).end();
});

const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
});