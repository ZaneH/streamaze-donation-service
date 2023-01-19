const WebSocketServer = require("ws").Server;
const StreamLabs = require("./modules/StreamLabs");
const TikTok = require("./modules/TikTok");
require("dotenv").config();

const wss = new WebSocketServer({ port: 8080 });

function heartbeat() {
    this.isAlive = true;
}

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on("connection", (ws) => {
    let slobsClient;
    let tiktokClient;

    ws.on("pong", heartbeat);

    // Handle incoming messages from the browser
    ws.on("message", async (message) => {
        if (ws.isAlive) return;
        ws.isAlive = true;

        let payload;
        let streamToken;
        let tiktokUsername;

        try {
            payload = JSON.parse(message);

            streamToken = payload?.streamToken;
            tiktokUsername = payload?.tiktokUsername;

            slobsClient = new StreamLabs(streamToken, ws);
            tiktokClient = new TikTok(tiktokUsername, ws);

            if (streamToken) {
                await slobsClient.connect();
            }

            if (tiktokUsername) {
                await tiktokClient.connect();
            }
        } catch (e) {
            console.log("[ERROR] Invalid request", e);
            return;
        }
    });

    ws.on("close", async () => {
        if (slobsClient) {
            await slobsClient.close();
        }

        if (tiktokClient) {
            await tiktokClient.close();
        }

        console.log("[INFO] Disconnected from client");
    });
});

wss.on("close", function close() {
    clearInterval(interval);
});
