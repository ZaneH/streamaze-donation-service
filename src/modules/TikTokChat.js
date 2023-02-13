const { EventEmitter } = require('stream')
const TikTokLive = require('tiktok-live-connector').WebcastPushConnection

const tiktokChatClients = new Map()

async function getTiktokChatClient(tiktokUsername) {
  if (tiktokChatClients.has(tiktokUsername)) {
    return tiktokChatClients.get(tiktokUsername)
  }

  const client = new TikTokChat(tiktokUsername)
  tiktokChatClients.set(tiktokUsername, client)

  await client.connect()

  return client
}

class TikTokChat extends EventEmitter {
  constructor(tiktokUsername) {
    super()

    this.username = tiktokUsername
    this.tiktokClient = null
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
        console.log('[INFO] Tiktok chat connected')

        this.tiktokClient.on('chat', (data) => {
          let pfpUrl = data?.userDetails?.profilePictureUrls?.[0]

          this.emit('tiktokChat', {
            sender: data?.nickname,
            message: data?.comment,
            origin: 'tiktok',
            pfp: pfpUrl,
          })
        })

        this.tiktokClient.on('error', (err) => {
          console.log('[ERROR] Tiktok connection error', err)
          this.emit('end')
        })

        this.tiktokClient.on('disconnected', () => {
          this.emit('end')
        })
      })
      .catch((err) => {
        console.log('[ERROR] Tiktok connection error', err)
        this.emit('end')
      })
  }

  close() {
    if (!this.tiktokClient) {
      return
    }

    if (tiktokChatClients.has(this.username)) {
      tiktokChatClients.delete(this.username)
    }

    this.tiktokClient.disconnect()
    this.tiktokClient = null

    console.log('[INFO] Tiktok chat disconnected')
  }
}

module.exports = {
  getTiktokChatClient,
  TikTokChat,
}
