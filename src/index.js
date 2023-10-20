const crypto = require('crypto')
const { getStreamlabsDonationClient } = require('./modules/StreamLabsDonation')
const { getTiktokGiftClient } = require('./modules/TikTokGift')
const { getTiktokChatClient } = require('./modules/TikTokChat')
const { getYoutubeChatClient } = require('./modules/YouTubeChat')
const { getKickChatClient } = require('./modules/KickChat')
const { getTwitchChatClient } = require('./modules/TwitchChat')
const SpikeWatch = require('./modules/SpikeWatch')
const ChatMonitor = require('./modules/ChatMonitor')
const { updateKV } = require('./modules/Lanyard')
const express = require('express')
const enableWs = require('express-ws')
const cors = require('cors')
const { storeDonation } = require('./utils/Storage')
const KickViews = require('./modules/KickViews')
const { KickIds } = require('./modules/KickIds')
const fetch = require('node-fetch')
const { secondsToHHMMSS } = require('./utils/Time')
const { Hop } = require('@onehop/js')
const app = express()
const wsInstance = enableWs(app)

require('dotenv').config()

const HOP_TOKEN = process.env.HOP_TOKEN
const hop = new Hop(HOP_TOKEN)

function heartbeat() {
  this.isAlive = true
}

const pingInterval = setInterval(function ping() {
  const clients = wsInstance.getWss().clients
  console.log('<3\tActive connections: ' + clients.size)

  clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping()
  })
}, 30000)

app.use(cors())
app.use(express.json())

wsInstance.getWss().on('connection', function connection(ws) {
  ws.isAlive = true
  ws.on('error', console.error)
  ws.on('pong', heartbeat)
})

function sendMessageToSpikeWatcher(_streamerId, _spikeWatcher) {
  if (_spikeWatcher) {
    _spikeWatcher?.addMessageToSegment(_streamerId)
  }
}

function sendMessageToChatMonitor(_streamerId, _chatMonitor) {
  if (_chatMonitor) {
    _chatMonitor?.addMessageToSegment(_streamerId)
  }
}

app.ws('/ws', (ws, _req) => {
  let tiktokChatClient
  let youtubeChatClient
  let slobsDonationClient
  let tiktokGiftClient
  let kickChatClient
  let twitchChatClient
  let excludeFromProfits = false // update profit in Lanyard?

  // Handle incoming messages from the browser
  ws.on('message', async (message) => {
    let payload
    try {
      payload = JSON.parse(message)

      // additional chat source payload
      if (
        payload?.addChannelId &&
        payload?.addChatroomId &&
        payload?.kickChannelName
      ) {
        kickChatClient = await getKickChatClient({
          kickChannelName: payload.kickChannelName,
        })

        if (kickChatClient) {
          await kickChatClient.addChatSource({
            channelId: payload.addChannelId,
            chatroomId: payload.addChatroomId,
          })
        } else {
          console.log(
            '[ERROR] Kick chat client not found',
            payload.kickChannelName,
            payload.addChannelId,
            payload.addChatroomId,
          )
        }

        return
      }

      excludeFromProfits = payload?.excludeFromProfits

      // don't allow a client to re-initialize
      if (ws.hasMessaged) return

      let streamerId // for assigning donations to a streamer
      let tiktokChatUsername // for TikTok chat
      let youtubeChatUrl // for YouTube chat
      let streamToken // for StreamLabs donations
      let ttsService // for TTS
      let streamazeKey // for TTS right now
      // let streamlabsVoice // for StreamLabs TTS
      let tiktokDonoUsername // for TikTok gifts
      let kickChannelId // for Kick chat
      let kickChatroomId // for Kick chat
      let kickChannelName // for Kick chat
      let twitchChannelName // for Twitch chat
      let badWords // censored in TTS

      streamerId = payload?.streamerId
      tiktokChatUsername = payload?.tiktokChat
      youtubeChatUrl = payload?.youtubeChat
      streamToken = payload?.streamToken
      ttsService = payload?.ttsService
      streamazeKey = payload?.streamazeKey
      // streamlabsVoice = payload?.streamlabsVoice
      tiktokDonoUsername = payload?.tiktokDonos
      kickChannelId = payload?.kickChannelId
      kickChatroomId = payload?.kickChatroomId
      kickChannelName = payload?.kickChannelName
      twitchChannelName = payload?.twitchChannelName
      badWords = payload?.badWords

      // turn csv string into array
      if (badWords) {
        badWords = badWords.split(',')
      }

      if (streamToken && streamerId) {
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

          slobsDonationClient = await getStreamlabsDonationClient(
            streamToken,
            streamazeKey,
            {
              ttsService,
              badWords,
            },
          )

          if (slobsDonationClient.connectedClients > 0) {
            slobsDonationClient.connectedClients++
          } else {
            slobsDonationClient.connectedClients++
            slobsDonationClient.on('streamlabsEvent', async (data) => {
              // Send donation data to Streamaze storage API

              const donationData = data?.data
              const donationType = data?.type
              if (donationType === 'superchat') {
                await storeDonation({
                  excludeFromProfits,
                  streamerId,
                  type: donationType,
                  sender: donationData.name,
                  message: donationData.message,
                  amount_in_usd: donationData.amount,
                  amount: donationData.amount * 100,
                  currency: donationData.currency,
                  metadata: {
                    donation_id: donationData.id,
                    emotes: donationData.emotes,
                    pfp: donationData.pfp,
                    tts_url: donationData.tts_url,
                  },
                })
              } else if (donationType === 'subscription') {
                await storeDonation({
                  excludeFromProfits,
                  streamerId,
                  type: donationType,
                  sender: donationData.name,
                  message: donationData.message,
                  // TODO: Figure out how to get the actual subscription amount
                  amount_in_usd: donationData.amount.months * 4.99,
                  amount: donationData.amount.months * 4.99 * 100,
                  currency: 'usd',
                  months: donationData.amount.months,
                  metadata: {
                    donation_id: donationData.id,
                    emotes: donationData.emotes,
                    pfp: donationData.pfp,
                    months: donationData.amount.months,
                  },
                })
              } else if (donationType === 'donation') {
                await storeDonation({
                  excludeFromProfits,
                  streamerId,
                  type: donationType,
                  sender: donationData.name,
                  message: donationData.message,
                  amount_in_usd: donationData.amount,
                  amount: donationData.amount * 100,
                  currency: donationData.currency,
                  metadata: {
                    donation_id: donationData.id,
                    emotes: donationData.emotes,
                    pfp: donationData.pfp,
                    tts_url: donationData.tts_url,
                  },
                })
              } else if (donationType === 'membershipGift') {
                await storeDonation({
                  excludeFromProfits,
                  streamerId,
                  type: donationType,
                  sender: donationData.name,
                  // TODO: Figure out how to get the actual gift amount
                  amount_in_usd: donationData.amount.giftCount * 4.99,
                  amount: donationData.amount.giftCount * 4.99 * 100,
                  currency: 'usd',
                  months: donationData.amount.giftCount,
                  metadata: {
                    donation_id: donationData.id,
                    pfp: donationData.pfp,
                    gift_count: donationData.amount.giftCount,
                    gift_level: donationData.amount.giftLevel,
                  },
                })
              } else if (donationType === 'mediaShareEvent') {
                await storeDonation({
                  excludeFromProfits,
                  streamerId,
                  type: 'streamlabs_media',
                  sender: donationData.action_by,
                  amount_in_usd: donationData?.donation?.amount,
                  amount: donationData?.donation?.amount * 100,
                  currency: donationData?.donation?.currency,
                  metadata: {
                    action: donationData.action,
                    action_by: donationData.action_by,
                    donation_id: donationData.donation_id,
                    media_title: donationData.media_title,
                    media_type: donationData.media_type,
                    media_link: donationData.media_link,
                    media_thumbnail: donationData.media_thumbnail,
                    duration: donationData.duration,
                    start_time: donationData.start_time,
                  },
                })
              }
            })
          }
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
            sendMessageToSpikeWatcher(streamerId)
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
            sendMessageToSpikeWatcher(streamerId)
          })

          youtubeChatClient.on('end', () => {
            if (!didConnect) {
              // never connected, so don't terminate the connection
              return
            }

            ws.terminate()
          })
        } catch (e) {
          console.error(
            '[ERROR] Failed to connect to YouTube chat. Continuing...',
          )
        }
      }

      if (kickChannelId && kickChatroomId && kickChannelName && streamerId) {
        try {
          kickChatClient = await getKickChatClient({
            kickChannelId,
            kickChatroomId,
            kickChannelName,
          })

          if (kickChatClient.connectedClients > 0) {
            kickChatClient.connectedClients++
          } else {
            kickChatClient.connectedClients++
            let didConnect = false
            let spikeWatcher
            let chatMonitor

            // Activity spikes
            spikeWatcher = new SpikeWatch(streamerId)
            spikeWatcher.on('spike', onSpike)

            // Chat monitor
            chatMonitor = new ChatMonitor({ service: 'kick', streamazeKey })
            chatMonitor.on('segment', (cm, messageCount) => {
              ts = cm.segmentStartTime
              onChatMonitorSegment(streamerId, ts, messageCount, streamazeKey)
            })

            kickChatClient.on('connected', () => {
              didConnect = true
            })

            kickChatClient.on('kickChat', (data) => {
              ws.send(JSON.stringify(data))
              sendMessageToSpikeWatcher(streamerId, spikeWatcher)
              sendMessageToChatMonitor(streamerId, chatMonitor)
            })

            kickChatClient.on('kickSub', async ({ data }) => {
              await storeDonation({
                excludeFromProfits,
                streamerId,
                type: 'kick_subscription',
                sender: data.name,
                amount_in_usd: parseInt(data.amount.months) * 4.99,
                amount: parseInt(data.amount.months) * 4.99 * 100,
                currency: 'usd',
                months: data.amount.months,
                metadata: {
                  id: data.id,
                  pfp: data.pfp,
                  months: data.amount.months,
                },
              })
            })

            kickChatClient.on('kickGiftedSub', async ({ data }) => {
              console.log('Debug info', data)

              await storeDonation({
                excludeFromProfits,
                streamerId,
                type: 'kick_gifted_subscription',
                sender: data.name,
                amount_in_usd: parseInt(data.amount.months) * 4.99,
                amount: parseInt(data.amount.months) * 4.99 * 100,
                currency: 'usd',
                months: data.amount.months,
                metadata: {
                  id: data.id,
                  months: data.amount.months,
                },
              })
            })

            kickChatClient.on('kickHost', async ({ data }) => {
              await storeDonation({
                excludeFromProfits,
                streamerId,
                type: 'kick_host',
                message: data.optional_message,
                sender: data.name,
                amount_in_usd: 0,
                amount: 0,
                currency: 'usd',
                metadata: {
                  id: data.id,
                  number_viewers: data.number_viewers,
                },
              })
            })

            kickChatClient.on('end', () => {
              if (!didConnect) {
                // never connected, so don't terminate the connection
                return
              }

              ws.terminate()
            })

            kickChatClient.on('close', () => {
              spikeWatcher?.removeAllListeners()
              spikeWatcher = null

              chatMonitor?.removeAllListeners()
              chatMonitor = null
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      if (twitchChannelName) {
        try {
          twitchChatClient = await getTwitchChatClient(twitchChannelName)
          twitchChatClient.connectedClients++
          didConnect = false

          twitchChatClient.on('connected', () => {
            didConnect = true
          })

          twitchChatClient.on('twitchChat', (data) => {
            // console.log('Twitch', JSON.stringify(data))
            ws.send(JSON.stringify(data))
          })

          twitchChatClient.on('end', () => {
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

    ws.hasMessaged = true
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

    if (twitchChatClient) {
      const hasListeners = twitchChatClient.close()
      if (!hasListeners) {
        twitchChatClient.removeAllListeners()
      }
    }

    console.log('[INFO] Disconnected from client')
    ws.hasMessaged = false
  })
})

wsInstance.getWss().on('close', function close() {
  clearInterval(pingInterval)
})

app.get('/', (_req, res) => {
  return res.send('ok')
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
  const { discordUserId, key, value, apiKey } = req.body || {}
  if (discordUserId && key && apiKey) {
    try {
      const resp = await updateKV(discordUserId, key, value, apiKey)

      return res.send(resp)
    } catch (e) {
      console.error(e)
      return res.status(500).send(e)
    }
  } else {
    return res.status(400).send('Missing discordUserId, key, or apiKey')
  }
})

app.get('/kick/viewers/:channelName', async (req, res) => {
  const { channelName } = req.params
  const viewersResp = await KickViews.getViews(channelName)
  if (viewersResp?.error) {
    return res.status(500).send(viewersResp?.error)
  }

  return res.send(JSON.stringify({ viewers: viewersResp.viewers }))
})

app.post('/kick/ids/:channelName', async (req, res) => {
  const { channelName } = req.params
  try {
    const idsResp = await KickIds.getKickIds(channelName)

    return res.send(JSON.stringify({ ids: idsResp }))
  } catch (e) {
    return res.status(500).send(e)
  }
})

app.post('/wifi/scan', async (req, res) => {
  try {
    await hop.channels.publishMessage(
      process.env.HOP_CHANNEL,
      'SSID_RESCAN',
      {},
    )

    return res.send('ok')
  } catch (e) {
    console.error(e)
    return res.sendStatus(500)
  }
})

app.post('/wifi/connect', async (req, res) => {
  const { ssid, password } = req.body || {}
  try {
    await hop.channels.publishMessage(
      process.env.HOP_CHANNEL,
      'SSSID_CONNECT',
      {
        ssid,
        password,
      },
    )
  } catch (e) {
    console.error(e)
    return res.sendStatus(500)
  }
})

app.listen(8080, () => {
  console.log('Service is running on :8080')
  console.log('Websocket is running on :8080/ws')
})

const onChatMonitorSegment = async (
  _streamerId,
  _timestamp,
  _messageCount,
  _streamazeKey,
) => {
  try {
    const resp = await fetch(
      `${process.env.STREAMAZE_STORAGE_API_URL}/api/chat-monitor/${_streamerId}?streamaze_key=${_streamazeKey}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_activity: {
            [_timestamp]: _messageCount,
          },
        }),
      },
    )

    const json = await resp.json()
    if (resp?.status === 200) {
      console.log('[INFO] Sent chat monitor data to Streamaze storage API')
    } else {
      console.error(
        '[ERROR] Failed to send chat monitor data to Streamaze storage API',
        resp?.status,
      )
    }
  } catch (e) {
    console.error(e)
  }
}

const onSpike = async (_id, rAvg, streamerId) => {
  let channel = process.env.HOP_CHANNEL
  // if (streamerId === '2') {
  //   channel = process.env.HOP_CHANNEL_ICE
  // }

  // TODO: Fix this for other streamers
  const resp = await fetch(`https://api.hop.io/v1/channels/${channel}/state`, {
    method: 'GET',
    headers: {
      Authorization: `${HOP_TOKEN}`,
    },
  })

  const json = await resp.json()
  if (json?.success) {
    let uptime = json?.data?.state?.srt?.uptime

    if (!uptime) {
      const now = new Date()
      // create formattedData with date formatted as Month Day, HH:MM:SS
      const formattedDate = `${now.toLocaleString('default', {
        month: 'long',
      })} ${now.getDate()}, ${now.toLocaleTimeString('en-US')}`
      uptime = formattedDate
    } else {
      uptime = secondsToHHMMSS(uptime)
    }

    if (!!uptime) {
      try {
        // send webhook to Discord bot
        const resp = await fetch(
          `${process.env.DISCORD_BOT_WEBHOOK_URL}/webhook/highlight/${process.env.DISCORD_HIGHLIGHT_CHANNEL}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Spike detected.\n**Rolling average:** ${rAvg.toFixed(
                2,
              )} messages in 2 minutes.\nStream time: ${uptime}\nStreamer ID: ${
                streamerId || 'N/A'
              }`,
            }),
          },
        )

        if (resp.status === 200) {
          console.log('Sent webhook to Discord bot')
        } else {
          console.error('Failed to send webhook to Discord bot')
        }
      } catch (e) {
        console.error(e)
      }
    }
  } else {
    console.error('Failed to get uptime from Hop')
  }
}
