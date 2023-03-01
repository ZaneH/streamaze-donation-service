const io = require('socket.io-client')
const fetch = require('node-fetch')
const { EventEmitter } = require('stream')
const { getPFPFromChannelId } = require('../utils/PFP')

const streamlabsDonationClients = new Map()

async function getStreamlabsDonationClient(streamToken) {
  if (streamlabsDonationClients.has(streamToken)) {
    return streamlabsDonationClients.get(streamToken)
  }

  const client = new StreamLabsDonation(streamToken)
  streamlabsDonationClients.set(streamToken, client)

  await client.connect()

  return client
}

class StreamLabsDonation extends EventEmitter {
  constructor(streamToken) {
    super()

    this.streamToken = streamToken
    this.slobsSocket = null
    this.heartbeat = null
    this.connectedClients = 0
  }

  async getTTSUrl(message, voice = 'Ivy', exactMessage = false) {
    let text = message?.comment

    // Membership messages don't have a comment
    if (!text) {
      text = message?.message
    }

    // Prevent empty messages
    if (!text) {
      return
    }

    const tts = await fetch('https://streamlabs.com/polly/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: exactMessage ? message : `${message?.name} said ${text}`,
        voice,
      }),
    })

    if (!tts.ok) {
      throw new Error('TTS error')
    }

    const ttsData = await tts.json()
    return ttsData?.speak_url
  }

  async connect() {
    if (!this.streamToken) {
      throw new Error('Stream token is required')
    }

    return new Promise((resolve, reject) => {
      if (this.slobsSocket) {
        reject('Slobs already connected')
        return
      }

      this.slobsSocket = io(
        `wss://sockets.streamlabs.com?token=${this.streamToken}`,
        {
          transports: ['websocket'],
        },
      )

      this.slobsSocket.on('connect', () => {
        console.log('[INFO] Slobs connected')

        this.heartbeat = setInterval(() => {
          this.slobsSocket.emit('ping')
        }, 25000)
      })

      this.slobsSocket.on('event', async (event) => {
        try {
          const { type, message } = event

          switch (type) {
            case 'superchat':
              // message is an array
              for (const m of message) {
                const ttsUrl = await this.getTTSUrl(m)
                this.emit('streamlabsEvent', {
                  type,
                  data: {
                    id: m?.['_id'],
                    name: m.name,
                    message: m.comment,
                    displayString: m?.displayString,
                    amount: m?.['amount'] / 1000000,
                    currency: m?.['currency'] || 'usd',
                    tts_url: ttsUrl,
                    pfp: await getPFPFromChannelId(m?.channelId),
                  },
                })
              }
              break
            case 'subscription':
              // message is an array
              for (const m of message) {
                this.emit('streamlabsEvent', {
                  type,
                  data: {
                    id: m?.['_id'],
                    name: m.name,
                    message: m.message,
                    emotes: m?.emotes || [],
                    // TODO: Take this out of amount: {}
                    amount: {
                      months: m?.months || 0,
                    },
                  },
                })
              }
              // TODO: Remove this when I figure out how to calculate the worth of a membership
              console.log('Membership data:', message)
              break
            case 'donation':
              // message is an array
              for (const m of message) {
                const ttsUrl = await this.getTTSUrl(m)
                this.emit('streamlabsEvent', {
                  type,
                  data: {
                    id: m?.['_id'],
                    name: m.name,
                    message: m.message,
                    emotes: m?.emotes || [],
                    displayString: m?.['formatted_amount'],
                    amount: m?.['amount'] || 0,
                    currency: m?.['currency'] || 'usd',
                    tts_url: ttsUrl,
                  },
                })
              }
              break
            case 'membershipGift':
              // message is an array
              for (const m of message) {
                if (!m?.giftMembershipsCount) {
                  continue
                }

                this.emit('streamlabsEvent', {
                  type,
                  data: {
                    id: m?.['_id'],
                    name: m.name,
                    // TODO: gift_* should go into amount: {}
                    gift_count: m?.giftMembershipsCount,
                    gift_level: m?.giftMembershipsLevelName,
                    pfp: await getPFPFromChannelId(m?.channelUrl),
                  },
                })
              }
              break
            case 'mediaShareEvent':
              // mediaEvent examples: acceptAll, newMedia, play, seekMedia
              const { event: mediaEvent } = message || {}
              // media contains the media info
              const { media } = message || {}

              if (mediaEvent === 'play') {
                // modMoveToNext is a 'skip' action for media shares
                // it is triggered when the duration ends, or
                // when a mod clicks the skip button
                const { modMoveToNext } = message || {}

                if (modMoveToNext === true) {
                  this.emit('streamlabsEvent', {
                    type,
                    data: {
                      action: 'modMoveToNext',
                    },
                  })
                } else {
                  // emit info to play media
                  let youtubeUrl
                  let thumbnailUrl

                  if (media?.media_type === 'youtube') {
                    youtubeUrl = `https://www.youtube.com/watch?v=${
                      media?.media
                    }&t=${media?.start_time ?? 0}`

                    thumbnailUrl = `https://img.youtube.com/vi/${media?.media}/default.jpg`
                  }

                  this.emit('streamlabsEvent', {
                    type,
                    data: {
                      action: media?.action,
                      action_by: media?.action_by,
                      donation_id: media?.donation_id ?? media?.id,
                      media_title: media?.media_title,
                      media_type: media?.media_type,
                      media_link: youtubeUrl,
                      media_thumbnail: thumbnailUrl,
                      duration: media?.duration,
                    },
                  })
                }
              }
              break
            case 'streamlabels.underlying':
              break
            case 'streamlabels':
              break
            case 'alertPlaying':
              break
            case 'ping':
              break
            default:
              console.log(
                '[INFO] Unknown event',
                JSON.stringify(event, null, 2),
              )
          }
        } catch (e) {
          console.error(e)
        }
      })

      this.slobsSocket.on('disconnect', () => {
        console.log('[INFO] Slobs disconnected')
      })

      resolve()
    })
  }

  close() {
    if (this.connectedClients > 1) {
      this.connectedClients--
      return true
    }

    if (!this.slobsSocket) {
      return true
    }

    if (streamlabsDonationClients.has(this.streamToken)) {
      streamlabsDonationClients.delete(this.streamToken)
    }

    this.slobsSocket.close()
    clearInterval(this.heartbeat)
    this.heartbeat = null
    this.slobsSocket = null

    console.log('[INFO] Disconnected from StreamLabs')
    return false
  }
}

module.exports = {
  StreamLabsDonation,
  getStreamlabsDonationClient,
}
