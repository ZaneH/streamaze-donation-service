const { EventEmitter } = require('stream')
const KickLiveConnector = require('./KickLiveConnector')

const kickChatClients = new Map()

async function getKickChatClient(
  options = {
    kickChannelId,
    kickChatroomId,
    kickChannelName,
  },
) {
  // TODO: use a hash of the options to create a unique key
  if (kickChatClients.has(options.kickChannelName)) {
    return kickChatClients.get(options.kickChannelName)
  }

  const client = new KickChat(options)
  kickChatClients.set(options.kickChannelName, client)

  await client.connect()

  return client
}

class KickChat extends EventEmitter {
  constructor(
    options = {
      kickChannelId,
      kickChatroomId,
      kickChannelName,
    },
  ) {
    super()

    this.channelId = options.kickChannelId
    this.chatroomId = options.kickChatroomId
    this.channelName = options.kickChannelName
    this.kickClient = null
    this.connectedClients = 0
    this.connectedWs = []
    this.additionalChatSourceChannelIds = []
  }

  async connect() {
    if (!this.channelName) {
      throw new Error('Missing channel name')
    }

    if (!this.channelId) {
      throw new Error('Missing channel id')
    }

    if (!this.chatroomId) {
      throw new Error('Missing chatroom id')
    }

    if (this.kickClient) {
      console.log('[INFO] Kick already connected')
      return
    }

    this.kickClient = new KickLiveConnector({
      channelId: this.channelId,
      chatroomId: this.chatroomId,
      channelName: this.channelName,
    })

    this.kickClient.on('connected', () => {
      this.emit('connected')
    })

    this.kickClient.on('message', (data) => {
      this.emit('kickChat', data)
    })

    this.kickClient.on('kickSub', (data) => {
      console.log('URGENT (for Zane) - kickSub', data)
      console.log(this.channelName, this.chatroomId, this.channelId)
      if (
        data.chatroomId === this.chatroomId ||
        this.channelName === 'sam' ||
        this.channelName === 'hanridge'
      ) {
        this.emit('kickSub', data)
      }
    })

    this.kickClient.on('kickGiftedSub', (data) => {
      console.log('URGENT (for Zane) - kickGiftedSub', data)
      console.log(this.channelName, this.chatroomId, this.channelId)
      if (
        data.chatroomId === this.chatroomId ||
        this.channelName === 'sam' ||
        this.channelName === 'hanridge'
      ) {
        this.emit('kickGiftedSub', data)
      }
    })

    this.kickClient.on('kickHost', (data) => {
      console.log('URGENT (for Zane) - kickHost', data)
      console.log(this.channelName, this.chatroomId, this.channelId)
      if (
        data.chatroomId === this.chatroomId ||
        this.channelName === 'sam' ||
        this.channelName === 'hanridge'
      ) {
        this.emit('kickHost', data)
      }
    })

    this.kickClient.on('end', () => {
      this.emit('end')
    })
  }

  async addChatSource({ channelId, chatroomId }) {
    if (!this.kickClient) {
      kickChatClients.delete(this.channelName)
      console.log('[ERROR] Kick client is empty')
      return
    }

    if (this.additionalChatSourceChannelIds.includes(channelId)) {
      console.log('[ERROR] Chat source already added')
      return
    }

    this.additionalChatSourceChannelIds.push(channelId)
    console.log('[INFO] Adding chat source', channelId, chatroomId)

    await this.kickClient._connect_chat({
      channelId,
      chatroomId,
    })
  }

  addWs(ws) {
    this.connectedWs.push(ws)
  }

  close() {
    if (this.connectedClients > 1) {
      this.connectedClients--
      return true
    }

    if (!this.kickClient) {
      return true
    }

    if (kickChatClients.has(this.channelName)) {
      kickChatClients.delete(this.channelName)
    }

    this.kickClient.disconnect()
    this.kickClient = null

    console.log('[INFO] Kick chat disconnected')
    this.emit('close')
    return false
  }
}

module.exports = {
  getKickChatClient,
  KickChat,
}
