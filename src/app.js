const express = require("express");
const crypto = require("crypto");
const fetch = require('node-fetch');
const tmi = require('tmi.js');
const token = require('./token.js');

require('dotenv').config();

/** Twitch Bot  */

const options = {
    options: {
        debug: true
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: token.bot_username,
        password: token.password_oauth,
    },
    channels: [token.channels]
};

const client = new tmi.Client(options);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    const commandName = msg.trim();

    if (commandName === '!discord') {
        client.say(target, `N'hésite pas à rejoindre le discord : https://discord.gg/QSqPzC9MGF`);
    } else {
        console.log(`* Unknown command ${commandName}`);
    }

    if (commandName === '!twitter') {
        client.say(target, `N'hésite pas à me follow sur twitter : https://twitter.com/FrTeyz`);
    } else {
        console.log(`* Unknown command ${commandName}`);
    }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

/** Twitch Bot  */

const app = express();
const port = process.env.PORT || 2000;
const secret = process.env.SECRET;

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    return next();
});

const discordCallback = () => {
    fetch('https://twitch-back.teyz.fr/discordCallback');
};

const newFollower = (follower) => {
    client.say('#teyz_', `Bienvenue sur le stream @${follower}`);
};

function verifySignature(messageSignature, messageID, messageTimestamp, body) {
    let message = messageID + messageTimestamp + body
    let signature = crypto.createHmac('sha256', secret).update(message) // Remember to use the same secret set at creation
    let expectedSignatureHeader = "sha256=" + signature.digest("hex")

    return expectedSignatureHeader === messageSignature
}

app.use(express.json({ verify: verifySignature }));

app.post("/webhooks/callback", async (req, res) => {
    const messageType = req.header("Twitch-Eventsub-Message-Type");
    if (messageType === "webhook_callback_verification") {
        console.log("Verifying Webhook");
        return res.status(200).send(req.body.challenge);
    }

    const { type } = req.body.subscription;
    const { event } = req.body;

    if (type === 'stream.online') {
        discordCallback();
    } else if (type === 'channel.follow') {
        newFollower(event.user_name);
    }

    res.status(200).end();
});

const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
});