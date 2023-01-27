const { EventEmitter } = require('stream')
const { LiveChat } = require('youtube-chat')

const youtubeChatClients = new Map()

async function getYoutubeChatClient(channelUrl) {
  if (youtubeChatClients.has(channelUrl)) {
    return youtubeChatClients.get(channelUrl)
  }

  const client = new YouTubeChat(channelUrl)
  youtubeChatClients.set(channelUrl, client)

  await client.connect()

  return client
}

class YouTubeChat extends EventEmitter {
  constructor(channelUrl) {
    super()

    this.channelUrl = channelUrl
    this.chatClient = null
  }

  async connect() {
    if (!this.channelUrl) {
      throw new Error('Channel URL is required')
    }

    if (this.chatClient) {
      console.log('[INFO] YouTube chat already connected')
      return
    }

    this.chatClient = new LiveChat({
      handle: this.channelUrl,
    })

    this.chatClient.on('chat', (data) => {
      const {
        author,
        message,
        isMembership,
        isOwner,
        isVerified,
        isModerator,
      } = data
      const pfp = author?.thumbnail?.url
      if (!pfp) {
        console.log(author, data)
      }

      const allEmoji =
        message
          ?.filter((m) => !!m.emojiText)
          ?.map((mi) => ({
            url: mi.url,
            keys: mi.alt,
          })) ?? []

      const uniqueEmoji = [...new Set(allEmoji)]
      const memberBadge = author?.badge?.thumbnail?.url

      this.emit('youtubeChat', {
        sender: author?.name,
        message: message?.map((m) => m.text ?? m?.alt)?.join(''),
        origin: 'youtube',
        emotes: uniqueEmoji,
        pfp,
        is_mod: isModerator,
        is_owner: isOwner,
        is_verified: isVerified,
        is_member: isMembership,
        member_badge: memberBadge,
      })
    })

    this.chatClient.on('error', (err) => {
      console.log(err)
    })

    const ok = await this.chatClient.start()
    if (!ok) {
      throw new Error('Could not connect to YouTube chat')
    } else {
      console.log('[INFO] YouTube chat connected')
    }
  }

  async close() {
    if (youtubeChatClients.has(this.channelUrl)) {
      youtubeChatClients.delete(this.channelUrl)
    }

    if (this.chatClient) {
      this.chatClient.stop()
      this.chatClient = null
    }

    console.log('[INFO] YouTube chat disconnected')
  }
}

module.exports = {
  getYoutubeChatClient,
  YouTubeChat,
}
