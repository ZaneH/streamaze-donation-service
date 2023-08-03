const { EventEmitter } = require('stream')
const tmi = require('tmi.js')

const twitchChatClients = new Map()

async function getTwitchChatClient(twitchChannelName) {
  if (twitchChatClients.has(twitchChannelName)) {
    return twitchChatClients.get(twitchChannelName)
  }

  const client = new TwitchChat(twitchChannelName)

  twitchChatClients.set(twitchChannelName, client)

  await client.connect()

  return client
}

class TwitchChat extends EventEmitter {
  constructor(twitchChannelName) {
    super()

    this.twitchChannelName = twitchChannelName
    this.twitchClient = null
    this.connectedClients = 0
  }

  async connect() {
    if (!this.twitchChannelName) {
      throw new Error('Channel name is required')
    }

    if (this.twitchClient) {
      console.log('[INFO] Twitch already connected')
      return
    }

    this.twitchClient = new tmi.Client({
      channels: [this.twitchChannelName],
    })

    this.twitchClient.connect().catch(console.error)

    this.twitchClient.on('connected', () => {
      console.log('[INFO] Twitch chat connected')
    })

    this.twitchClient.on('message', (channel, tags, message, self) => {
      if (self) return
      const displayName = tags['display-name']
      const messageText = message
      const isMod = tags.mod
      const isMember = tags.subscriber

      this.emit('twitchChat', {
        sender: displayName,
        message: messageText,
        origin: 'twitch',
        is_mod: isMod,
        is_member: isMember,
      })
    })
  }

  close() {
    if (this.connectedClients > 1) {
      this.connectedClients--
      return true
    }

    if (!this.twitchClient) {
      return true
    }

    if (twitchChatClients.has(this.twitchChannelName)) {
      twitchChatClients.delete(this.twitchChannelName)
    }

    this.twitchClient.disconnect()
    this.twitchClient = null

    console.log('[INFO] Twitch chat disconnected')
    return false
  }
}

module.exports = {
  getTwitchChatClient,
}
