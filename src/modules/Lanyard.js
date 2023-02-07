const ws = require('ws')
const fetch = require('node-fetch')
const { EventEmitter } = require('stream')
const { getPFPFromChannelId } = require('../utils/PFP')

const lanyardClients = new Map()

async function getLanyardClient(discordUserId, apiKey) {
  if (lanyardClients.has(discordUserId)) {
    return lanyardClients.get(discordUserId)
  }

  const client = new LanyardAPI(discordUserId, apiKey)
  lanyardClients.set(discordUserId, client)

  await client.connect()

  return client
}

class LanyardAPI extends EventEmitter {
  constructor(discordUserId, apiKey) {
    super()

    this.discordUserId = discordUserId
    this.apiKey = apiKey
    this.socket = null
    this.heartbeat = null
  }

  async connect() {
    this.socket = new ws('wss://api.lanyard.rest/socket')

    this.socket.on('open', () => {
      console.log('[INFO] Lanyard API connected')
    })

    this.socket.on('message', (data) => {
      try {
        const resp = data.toString('utf-8')
        const parsed = JSON.parse(resp)

        if (parsed.op === 1) {
          const heartbeatInterval = parsed?.d?.heartbeat_interval ?? 30000

          this.socket.send(
            JSON.stringify({
              op: 2,
              d: {
                subscribe_to_id: this.discordUserId,
              },
            }),
          )

          this.heartbeat = setInterval(() => {
            this.socket.send(
              JSON.stringify({
                op: 3,
                d: null,
              }),
            )
          }, heartbeatInterval)
        } else if (parsed.op === 0) {
          // emit update event to listeners
          this.emit('update', parsed.d)
        }
      } catch (e) {
        console.error(e)
      }
    })
  }

  close() {
    if (this.socket) {
      this.socket.close()
    }

    if (this.heartbeat) {
      clearInterval(this.heartbeat)
    }
  }
}

module.exports = {
  getLanyardClient,
}
