const { EventEmitter } = require('stream')
const KickLiveConnector = require('./KickLiveConnector')

const kickChatClients = new Map()

async function getKickChatClient(kickChatroomId, kickChannelId) {
  if (kickChatClients.has(kickChatroomId)) {
    return kickChatClients.get(kickChatroomId)
  }

  const client = new KickChat({
    chatroomId: kickChatroomId,
    channelId: kickChannelId,
  })
  kickChatClients.set(kickChatroomId, client)

  await client.connect()

  return client
}

class KickChat extends EventEmitter {
  constructor({ chatroomId, channelId }) {
    super()

    this.chatroomId = chatroomId
    this.channelId = channelId
    this.kickClient = null
  }

  async connect() {
    if (!this.chatroomId || !this.channelId) {
      throw new Error('Missing chatroom/channel ID')
    }

    if (this.kickClient) {
      console.log('[INFO] Kick already connected')
      return
    }

    this.kickClient = new KickLiveConnector({
      chatroomId: this.chatroomId,
      channelId: this.channelId,
    })

    this.kickClient.on('connected', () => {
      this.emit('connected')
    })

    this.kickClient.on('message', (data) => {
      this.emit('kickChat', data)
    })

    this.kickClient.on('end', () => {
      this.emit('end')
    })
  }

  close() {
    if (!this.kickClient) {
      return
    }

    if (kickChatClients.has(this.chatroomId)) {
      kickChatClients.delete(this.chatroomId)
    }

    this.kickClient.disconnect()
    this.kickClient = null

    console.log('[INFO] Kick chat disconnected')
  }
}

module.exports = {
  getKickChatClient,
  KickChat,
}
