const express = require("express");
const crypto = require("crypto");
const bodyParser = require('body-parser');

require('dotenv').config();
const alertsData = require('../assets/alerts.json');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const port = process.env.PORT || 2000;
const secret = process.env.SECRET;
let alertsEventsData = [];
let events = [];


/* Random Logics */

const isWin = () => {
    var d = Math.random();
    if (d <= 0.004) {
        return true;
    }
    return false;
};

/* Random Logics */

/* Set Alert Logic */

const setAlert = (newSubData, eventType) => {
    if (eventType === "channel.subscribe")
        sendEventsToAll(setAlertBasicSub());
    else
        setAlertSubWithMonth(newSubData);
};

const setAlertBasicSub = () => {
    const isSubWin = isWin();
    if (isSubWin)
        return alertsData["02-1MOIS-WIN"];
    else
        return alertsData["02-1MOIS-LOSE"];
};

const setAlertSubWithMonth = (newSubData) => {
    const isSubWin = isWin();
    const userStreak = getStreakSubMonth(newSubData);
    sendEventsToAll(getAlertsWithMonth(isSubWin, userStreak));
};

const getAlertsWithMonth = (isWin, month) => {
    if (isWin)
        return alertsData[month + 1];
    else
        return alertsData[month];
};

const getStreakSubMonth = (newSubData) => {
    if (newSubData.streak_months >= 1 && newSubData.streak_months < 3) {
        return 0;
    } else if (newSubData.streak_months >= 3 && newSubData.streak_months < 6) {
        return 2;
    } else if (newSubData.streak_months >= 6 && newSubData.streak_months < 9) {
        return 4;
    } else if (newSubData.streak_months >= 9 && newSubData.streak_months < 12) {
        return 6;
    } else if (newSubData.streak_months >= 12 && newSubData.streak_months < 18) {
        return 8;
    } else if (newSubData.streak_months >= 18 && newSubData.streak_months < 24) {
        return 10;
    } else if (newSubData.streak_months >= 24) {
        return 12;
    }
};

/* Set Alert Logic */

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    return next();
});

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

    setAlert(event, type);

    res.status(200).end();
});

// ...

function eventsHandler(request, response, next) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);

    const data = `data: ${JSON.stringify(alertsEventsData)}\n\n`;

    response.write(data);

    const eventId = Date.now();

    const newEvent = {
        id: eventId,
        response
    };

    events.push(newEvent);

    request.on('close', () => {
        console.log(`${eventId} Connection closed`);
        events = events.filter(event => event.id !== eventId);
    });
}

app.get('/events', eventsHandler);

function sendEventsToAll(newEvent) {
    alertsEventsData.push({ 'event': newEvent, 'id': alertsEventsData.length });
    events.forEach(event => event.response.write(`data: ${JSON.stringify({ 'event': newEvent, 'id': alertsEventsData.length })}\n\n`))
}

const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
