const WebSocketServer = require("ws").Server;
const crypto = require("crypto");
const { getStreamlabsDonationClient } = require("./modules/StreamLabsDonation");
const { getTiktokGiftClient } = require("./modules/TikTokGift");
const { getTiktokChatClient } = require("./modules/TikTokChat");
const { getYoutubeChatClient } = require("./modules/YouTubeChat");
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
    let tiktokChatClient;
    let youtubeChatClient;
    let slobsDonationClient;
    let tiktokGiftClient;

    ws.on("pong", heartbeat);

    // Handle incoming messages from the browser
    ws.on("message", async (message) => {
        if (ws.isAlive) return;
        ws.isAlive = true;

        let payload;
        let tiktokChatUsername; // for TikTok chat
        let youtubeChatUrl; // for YouTube chat
        let streamToken; // for StreamLabs donations
        let tiktokDonoUsername; // for TikTok gifts

        try {
            payload = JSON.parse(message);

            tiktokChatUsername = payload?.tiktokChat;
            youtubeChatUrl = payload?.youtubeChat;
            streamToken = payload?.streamToken;
            tiktokDonoUsername = payload?.tiktokDonos;

            if (streamToken) {
                try {
                    // Alias for Sam's key
                    const samAlias = process.env.SAM_SOCKET_TOKEN_ALIAS;
                    if (samAlias.length === streamToken.length) {
                        if (
                            crypto.timingSafeEqual(
                                Buffer.from(samAlias),
                                Buffer.from(streamToken)
                            )
                        ) {
                            streamToken = process.env.SAM_SOCKET_TOKEN;
                        }
                    }

                    slobsDonationClient = await getStreamlabsDonationClient(
                        streamToken
                    );
                    slobsDonationClient.on("streamlabsEvent", (data) => {
                        ws.send(JSON.stringify(data));
                    });
                } catch (e) {
                    console.error(e);
                }
            }

            if (tiktokDonoUsername) {
                try {
                    tiktokGiftClient = await getTiktokGiftClient(
                        tiktokDonoUsername
                    );
                    tiktokGiftClient.on("tiktokGift", (data) => {
                        ws.send(JSON.stringify(data));
                    });
                } catch (e) {
                    console.error(e);
                }
            }

            if (tiktokChatUsername) {
                try {
                    tiktokChatClient = await getTiktokChatClient(
                        tiktokChatUsername
                    );
                    tiktokChatClient.on("tiktokChat", (data) => {
                        ws.send(JSON.stringify(data));
                    });
                } catch (e) {
                    console.error(e);
                }
            }

            if (youtubeChatUrl) {
                try {
                    youtubeChatClient = await getYoutubeChatClient(
                        youtubeChatUrl
                    );
                    youtubeChatClient.on("youtubeChat", (data) => {
                        ws.send(JSON.stringify(data));
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        } catch (e) {
            console.log("[ERROR] Invalid request", e);
            ws.close(1011, "Invalid request");
            return;
        }
    });

    ws.on("close", async () => {
        if (slobsDonationClient) {
            await slobsDonationClient.close();
        }

        if (tiktokGiftClient) {
            await tiktokGiftClient.close();
        }

        if (tiktokChatClient) {
            await tiktokChatClient.close();
        }

        if (youtubeChatClient) {
            await youtubeChatClient.close();
        }

        console.log("[INFO] Disconnected from client");
    });
});

wss.on("close", function close() {
    clearInterval(interval);
});
