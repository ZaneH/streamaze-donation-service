# Streamaze Donation Service

Node.js app for connecting 3rd party sockets such as donation streams and live chats.
Important info (donations mostly) are parsed out and submitted to the Phoenix app.
Live chat data is sent straight to the dashboard.

Each websocket connection attempts to either create a new 3rd party socket connection
or reuse an existing one that may already be initialized. When a new connection is
added to an existing client, `.connectedClients` increases by 1. When a connection
is removed, `.connectedClients` decreases by 1. When `.connectedClients` reaches 0,
the client should be shutdown and all event listeners removed.

## Depends On

- [ZaneH/streamaze-api](https://github.com/ZaneH/streamaze-api)
- [ZaneH/exchange-rate-api](https://github.com/ZaneH/exchange-rate-api)

## Setup

```
$ git clone https://github.com/ZaneH/streamaze-donation-service.git
$ cd streamaze-donation-service
$ npm install
$ npm run dev
```

## Environment Variables

```
export NODE_ENV=development

# set these to random values, they're not necessary
export SAM_SOCKET_TOKEN=<sam's streamlabs socket token>
export SAM_SOCKET_TOKEN_ALIAS=<random letters>

export TIKTOK_API_KEY=<not required>
export YOUTUBE_API_KEY=<youtube api key>
export OBS_API_URL=<livebond url>
export LANYARD_API_URL=https://api.lanyard.rest
export STREAMAZE_STORAGE_API_URL=http://localhost:4000 # Phoenix app url

# https://github.com/ZaneH/exchange-rate-api
export EXCHANGE_RATE_API=
```
