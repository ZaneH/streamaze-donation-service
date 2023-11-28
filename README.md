# Streamaze Donation Service

Node.js app for connecting 3rd party sockets such as donation streams and live chats.
Important info (donations mostly) are parsed out and submitted to the Phoenix app.
Live chat data is sent straight to the dashboard.

Each websocket connection attempts to either create a new 3rd party socket connection
or reuse an existing one that may already be initialized. When a new connection is
added to an existing client, `.connectedClients` increases by 1. When a connection
is removed, `.connectedClients` decreases by 1. When `.connectedClients` reaches 0,
the client should be shutdown and all event listeners removed.

## Setup

```
$ git clone https://github.com/ZaneH/streamaze-donation-service.git
$ cd streamaze-donation-service
$ npm install
$ npm run dev
```

## Environment Variables

```
NODE_ENV=development
SAM_SOCKET_TOKEN_ALIAS=<random letters>
SAM_SOCKET_TOKEN=<sam's streamlabs socket token>
TIKTOK_API_KEY=<not required>
YOUTUBE_API_KEY=<youtube api key>
OBS_API_URL=<livebond url>
LANYARD_API_URL=https://api.lanyard.rest
STREAMAZE_1_API_URL=http://localhost:8001 # likely not needed
STREAMAZE_STORAGE_API_URL=http://localhost:4000 # Phoenix app url
EXCHANGE_RATE_API=https://exrate-api.streamaze.live
```