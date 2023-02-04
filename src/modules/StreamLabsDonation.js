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
  }

  async getTTSUrl(message, voice = 'Ivy') {
    let text = message.comment
    if (!text) {
      text = message.message
    }

    const tts = await fetch('https://streamlabs.com/polly/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${message.name} said ${text}`,
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
                    amount: m.displayString,
                    tts_url: ttsUrl,
                    pfp: await getPFPFromChannelId(m?.channelId),
                  },
                })
              }
              break
            case 'subscription':
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
                    amount: {
                      months: m?.months || 0,
                    },
                    tts_url: ttsUrl,
                  },
                })
              }
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
                    amount: m?.['formatted_amount'] || 0,
                    tts_url: ttsUrl,
                  },
                })
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
              console.log('[INFO] Unknown event', event)
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

  async close() {
    if (!this.slobsSocket) {
      return
    }

    if (streamlabsDonationClients.has(this.streamToken)) {
      streamlabsDonationClients.delete(this.streamToken)
    }

    this.slobsSocket.close()
    clearInterval(this.heartbeat)
    this.heartbeat = null
    this.slobsSocket = null

    console.log('[INFO] Disconnected from StreamLabs')
  }
}

module.exports = {
  StreamLabsDonation,
  getStreamlabsDonationClient,
}
