const TikTokLive = require('tiktok-live-connector').WebcastPushConnection
const signatureProvider = require('tiktok-live-connector').signatureProvider
const { EventEmitter } = require('stream')

const tiktokGiftClients = new Map()

async function getTiktokGiftClient(username) {
  if (tiktokGiftClients.has(username)) {
    return tiktokGiftClients.get(username)
  }

  const client = new TikTokGift(username)
  tiktokGiftClients.set(username, client)

  await client.connect()

  return client
}

class TikTokGift extends EventEmitter {
  constructor(username) {
    super()

    this.tiktokClient = null
    this.username = username
    this.diamondThreshold = 100
  }

  parseGift(data) {
    return {
      type: 'tiktok_gift',
      data: {
        name: data.uniqueId,
        event_id: data.msgId,
        gift_name: data.giftName,
        gift_cost: data.diamondCount,
        gift_repeat_count: data?.gift?.repeat_count,
      },
    }
  }

  async connect() {
    if (!this.username) {
      throw new Error('Username is required')
    }

    if (this.tiktokClient) {
      console.log('[INFO] Tiktok already connected')
      return
    }

    const apiKey = process.env.TIKTOK_API_KEY
    if (!apiKey) {
      console.log(
        '[INFO] No API key provided, raise rate limits by providing one.',
      )
    }

    signatureProvider.config.extraParams.apiKey = apiKey
    this.tiktokClient = new TikTokLive(this.username)

    return new Promise((resolve, reject) => {
      this.tiktokClient
        .connect()
        .then(() => {
          console.log('[INFO] Tiktok connected')

          console.log('[INFO] Getting available gifts...')

          console.log('[INFO] Listening for gifts...')
          this.tiktokClient.on('gift', (data) => {
            try {
              if (data.giftType === 1 && !data.repeatEnd) {
                // sending a streak, we can improve this later
                return
              }

              const gift = this.parseGift(data)
              if (
                gift.data.gift_cost * gift.data.gift_repeat_count <
                this.diamondThreshold
              ) {
                return
              }

              this.emit('tiktokGift', gift)
            } catch (e) {
              console.error(e)
            }
          })

          resolve()
        })
        .catch((e) => {
          console.error('[ERROR] Try again later')
          reject(e)
        })
    })
  }

  async close() {
    if (!this.tiktokClient) {
      return
    }

    if (tiktokGiftClients.has(this.username)) {
      tiktokGiftClients.delete(this.username)
    }

    this.tiktokClient.disconnect()
    this.tiktokClient = null

    console.log('[INFO] Disconnected from TikTok gift listener')
  }
}

module.exports = {
  TikTokGift,
  getTiktokGiftClient,
}
