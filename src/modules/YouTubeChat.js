/**
 * Copyright 2023, Zane Helton, All rights reserved.
 */

const { EventEmitter } = require('stream')
const { LiveChat } = require('youtube-chat')

const youtubeChatClients = new Map()
const last20MessageIds = []

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
    this.connectedClients = 0
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

    this.chatClient.on('start', () => {
      this.emit('connected')
    })

    this.chatClient.on('chat', (data) => {
      // don't send superchats as chat messages
      if (data?.superchat) {
        return
      }

      // don't send messages that are already in the last 50 messages
      if (last20MessageIds.includes(data?.id)) {
        return
      } else {
        last20MessageIds.push(data?.id)
        if (last20MessageIds.length > 20) {
          last20MessageIds.shift()
        }
      }

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
      this.emit('end')
    })

    this.chatClient.on('end', (_reason) => {
      this.emit('end')
    })

    const ok = await this.chatClient.start()
    if (!ok) {
      throw new Error('Could not connect to YouTube chat', ok)
    } else {
      console.log('[INFO] YouTube chat connected')
    }
  }

  close() {
    if (this.connectedClients > 1) {
      this.connectedClients--
      return true
    }

    if (youtubeChatClients.has(this.channelUrl)) {
      youtubeChatClients.delete(this.channelUrl)
    }

    if (this.chatClient) {
      this.chatClient.stop()
      this.chatClient = null
    }

    console.log('[INFO] YouTube chat disconnected')
    return false
  }
}

module.exports = {
  getYoutubeChatClient,
  YouTubeChat,
}
