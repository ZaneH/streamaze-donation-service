/**
 * Copyright 2023, Zane Helton, All rights reserved.
 */

const TikTokLive = require('tiktok-live-connector').WebcastPushConnection
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
    this.connectedClients = 0
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

    this.tiktokClient = new TikTokLive(this.username)

    this.tiktokClient
      .connect()
      .then(() => {
        console.log('[INFO] Tiktok connected')

        console.log('[INFO] Getting available gifts...')

        console.log('[INFO] Listening for gifts...')

        this.tiktokClient.on('connected', () => {
          this.emit('connected')
        })

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
            this.close()
          }
        })

        this.tiktokClient.on('error', (e) => {
          console.error('[ERROR] TikTok gift listener error', e)
          this.emit('end')
        })

        this.tiktokClient.on('disconnected', () => {
          this.emit('end')
        })
      })
      .catch((e) => {
        console.error('[ERROR] Try again later', e)
        this.emit('end')
      })
  }

  close() {
    try {
      if (this.connectedClients > 1) {
        this.connectedClients--
        return true
      }

      if (!this.tiktokClient) {
        return true
      }

      if (tiktokGiftClients.has(this.username)) {
        tiktokGiftClients.delete(this.username)
      }

      this.tiktokClient.disconnect()
      this.tiktokClient = null

      console.log('[INFO] Disconnected from TikTok gift listener')
      return false
    } catch (e) {
      console.error('[ERROR] Failed to close() TikTok Gift listener')
      console.error(e)
      return false
    }
  }
}

module.exports = {
  TikTokGift,
  getTiktokGiftClient,
}
