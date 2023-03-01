const crypto = require('crypto')
const { getStreamlabsDonationClient } = require('./modules/StreamLabsDonation')
const { getTiktokGiftClient } = require('./modules/TikTokGift')
const { getTiktokChatClient } = require('./modules/TikTokChat')
const { getYoutubeChatClient } = require('./modules/YouTubeChat')
const { getKickChatClient } = require('./modules/KickChat')
const { updateKV } = require('./modules/Lanyard')
const express = require('express')
const enableWs = require('express-ws')
const {
  startBroadcast,
  startServer,
  stopServer,
  stopBroadcast,
} = require('./modules/OBS')
const cors = require('cors')
const { stopRPi } = require('./modules/RPi')
const { oneUSDToBaht } = require('./utils/ExchangeRate')
const app = express()
const wsInstance = enableWs(app)

require('dotenv').config()

function heartbeat() {
  this.isAlive = true
}

const interval = setInterval(function ping() {
  wsInstance.getWss().clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate()

    ws.isAlive = false
    ws.ping()
  })
}, 30000)

app.use(cors())
app.use(express.json())

app.ws('/ws', (ws, _req) => {
  let tiktokChatClient
  let youtubeChatClient
  let slobsDonationClient
  let tiktokGiftClient
  let kickChatClient

  ws.on('pong', heartbeat)

  // Handle incoming messages from the browser
  ws.on('message', async (message) => {
    if (ws.isAlive) return
    ws.isAlive = true

    let payload
    let tiktokChatUsername // for TikTok chat
    let youtubeChatUrl // for YouTube chat
    let streamToken // for StreamLabs donations
    let tiktokDonoUsername // for TikTok gifts
    let kickChatroomId // for Kick chat
    let kickChannelId // for Kick chat

    try {
      payload = JSON.parse(message)

      tiktokChatUsername = payload?.tiktokChat
      youtubeChatUrl = payload?.youtubeChat
      streamToken = payload?.streamToken
      tiktokDonoUsername = payload?.tiktokDonos
      kickChatroomId = payload?.kickChatroomId
      kickChannelId = payload?.kickChannelId

      if (streamToken) {
        try {
          // Alias for Sam's key
          const samAlias = process.env.SAM_SOCKET_TOKEN_ALIAS
          if (samAlias.length === streamToken.length) {
            if (
              crypto.timingSafeEqual(
                Buffer.from(samAlias),
                Buffer.from(streamToken),
              )
            ) {
              streamToken = process.env.SAM_SOCKET_TOKEN
            }
          }

          slobsDonationClient = await getStreamlabsDonationClient(streamToken)
          slobsDonationClient.connectedClients++
          slobsDonationClient.on('streamlabsEvent', (data) => {
            ws.send(JSON.stringify(data))
          })
        } catch (e) {
          console.error(e)
        }
      }

      if (tiktokDonoUsername) {
        try {
          tiktokGiftClient = await getTiktokGiftClient(tiktokDonoUsername)
          tiktokGiftClient.connectedClients++
          didConnect = false

          tiktokGiftClient.on('connected', () => {
            didConnect = true
          })

          tiktokGiftClient.on('tiktokGift', (data) => {
            ws.send(JSON.stringify(data))
          })

          tiktokGiftClient.on('end', () => {
            if (!didConnect) {
              // never connected, so don't terminate the connection
              return
            }

            ws.terminate()
          })
        } catch (e) {
          console.error(e)
        }
      }

      if (tiktokChatUsername) {
        try {
          tiktokChatClient = await getTiktokChatClient(tiktokChatUsername)
          tiktokChatClient.connectedClients++
          didConnect = false

          tiktokChatClient.on('connected', () => {
            didConnect = true
          })

          tiktokChatClient.on('tiktokChat', (data) => {
            ws.send(JSON.stringify(data))
          })

          tiktokChatClient.on('end', () => {
            if (!didConnect) {
              // never connected, so don't terminate the connection
              return
            }

            ws.terminate()
          })
        } catch (e) {
          console.error(e)
        }
      }

      if (youtubeChatUrl) {
        try {
          youtubeChatClient = await getYoutubeChatClient(youtubeChatUrl)
          youtubeChatClient.connectedClients++

          let didConnect = false

          youtubeChatClient.on('connected', () => {
            didConnect = true
          })

          youtubeChatClient.on('youtubeChat', (data) => {
            ws.send(JSON.stringify(data))
          })

          youtubeChatClient.on('end', () => {
            if (!didConnect) {
              // never connected, so don't terminate the connection
              return
            }

            ws.terminate()
          })
        } catch (e) {
          console.error(e)
        }
      }

      if (kickChatroomId && kickChannelId) {
        try {
          kickChatClient = await getKickChatClient(
            kickChatroomId,
            kickChannelId,
          )
          kickChatClient.connectedClients++

          let didConnect = false

          kickChatClient.on('connected', () => {
            didConnect = true
          })

          kickChatClient.on('kickChat', (data) => {
            ws.send(JSON.stringify(data))
          })

          kickChatClient.on('kickSub', (data) => {
            ws.send(JSON.stringify(data))
          })

          kickChatClient.on('kickGiftedSub', (data) => {
            ws.send(JSON.stringify(data))
          })

          kickChatClient.on('end', () => {
            if (!didConnect) {
              // never connected, so don't terminate the connection
              return
            }

            ws.terminate()
          })
        } catch (e) {
          console.error(e)
        }
      }
    } catch (e) {
      console.log('[ERROR] Invalid request', e)
      ws.close(1011, 'Invalid request')
      return
    }
  })

  ws.on('close', () => {
    if (slobsDonationClient) {
      const hasListeners = slobsDonationClient.close()
      if (!hasListeners) {
        slobsDonationClient.removeAllListeners()
      }
    }

    if (tiktokGiftClient) {
      const hasListeners = tiktokGiftClient.close()
      if (!hasListeners) {
        tiktokGiftClient.removeAllListeners()
      }
    }

    if (tiktokChatClient) {
      const hasListeners = tiktokChatClient.close()
      if (!hasListeners) {
        tiktokChatClient.removeAllListeners()
      }
    }

    if (youtubeChatClient) {
      const hasListeners = youtubeChatClient.close()
      if (!hasListeners) {
        youtubeChatClient.removeAllListeners()
      }
    }

    if (kickChatClient) {
      const hasListeners = kickChatClient.close()
      if (!hasListeners) {
        kickChatClient.removeAllListeners()
      }
    }

    console.log('[INFO] Disconnected from client')
  })
})

wsInstance.getWss().on('close', function close() {
  clearInterval(interval)
})

app.get('/', (_req, res) => {
  return res.send('ok')
})

app.post('/obs/start-broadcast', async (_req, res) => {
  const resp = await startBroadcast()
  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.post('/obs/stop-broadcast', async (_req, res) => {
  const resp = await stopBroadcast()
  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.post('/obs/start-server/youtube', async (_req, res) => {
  const resp = await startServer({
    isYouTube: true,
  })

  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.post('/obs/start-server/tiktok', async (_req, res) => {
  const resp = await startServer({
    isTikTok: true,
  })

  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.post('/obs/stop-server', async (_req, res) => {
  const resp = await stopServer()
  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.post('/obs/switch-scene', async (req, res) => {
  if (req.body?.sceneName) {
    const resp = await switchScene(req.body?.sceneName)
    if (resp?.error) {
      return res.status(500).send(resp)
    }

    return res.send(resp)
  } else {
    return res.status(400).send('Missing scene name')
  }
})

app.post('/pi/stop', async (_req, res) => {
  const resp = await stopRPi()
  if (resp?.error) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

app.get('/exchange/baht', async (_req, res) => {
  const resp = await oneUSDToBaht()
  if (isNaN(resp)) {
    return res.status(500).send(resp)
  }

  return res.send(resp)
})

/**
 * Update a key/value pair in the KV store for Lanyard
 * method: POST
 * body: {
 *  discordUserId: string
 *  key: string
 *  value: string
 *  apiKey: string
 * }
 */
app.post('/kv/set', async (req, res) => {
  const { discordUserId, key, value, apiKey } = req.body
  if (discordUserId && key && value && apiKey) {
    try {
      const resp = await updateKV(discordUserId, key, value, apiKey)

      return res.send(resp)
    } catch (e) {
      console.error(e)
      return res.status(500).send(e)
    }
  } else {
    return res.status(400).send('Missing discordUserId, key, value, or apiKey')
  }
})

app.listen(8080, () => {
  console.log('Service is running on :8080')
  console.log('Websocket is running on :8080/ws')
})
