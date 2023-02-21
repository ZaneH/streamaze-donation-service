const { EventEmitter } = require('stream')
const WebSocket = require('ws')

/**
  {
    "event": "App\\Events\\ChatMessageSentEvent",
    "data": {
        "message": {
            "id": "2d34fac5-4374-4a1c-b10f-7b6ec3b4fee4",
            "message": "Test 2",
            "type": "",
            "replied_to": null,
            "is_info": null,
            "link_preview": null,
            "chatroom_id": "1111249",
            "role": "Channel Host",
            "created_at": 1676996386,
            "action": null,
            "optional_message": null,
            "months_subscribed": 0,
            "subscriptions_count": null,
            "giftedUsers": null
        },
        "user": {
            "id": 1158339,
            "username": "ZaneH",
            "role": "Channel Host",
            "isSuperAdmin": false,
            "profile_thumb": "https://kick-files-prod.s3.us-west-2.amazonaws.com/images/user/1158339/profile_image/conversion/a55df1c3-10e0-425b-b7ed-727ea2d3bed4-thumb.webp?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECgaCXVzLXdlc3QtMiJHMEUCIQDC7Y0nAg5VOPzLM23dqjbfrRjsKkX5lMbV0XKT3P2qaQIgMHjXKQbgU472Rj0W%2FHzXGL03ux6gCKULLlRT%2BnXlfTkqngMIwf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgwxOTYyMzM3NzU1MTgiDMD6F9UDL2T0ZjCSaCryArKN3aN26t7rzDDDxFltAzzSAsQMloFU5F09z3AMhhWWBJq7filXg%2BMWcppBL7fH6kSZyHWlmMPQPU7R5VhDrR%2FDy3mt%2F3bt14Us%2F1U0e0wM55goJskjoFZr0Cu4pcNFGwgcrWuapr%2BrtVutzQAMZYnP3AxlaFdpeUdcQ5Cjbydqdr%2FQLwauFAZNBuuJw4CB8iZoczqD31IvzueEC056AxTHDFziIUOsM7lj7MZCbc7dGxeZc8HWdttbwWFm7PQI0QsVwh%2F6mhvaJIsUqG2tooeN4QFe%2BTQ24xXZ5t1ditqKCVBX5gXbXq3oglLv2hER1iLyeacH%2BvQPQcbS0IpfZJgSr8HDuy0f1Mi2hY8WSNgKyx7wzXdaXFCJZM73cZCZ0UrX5V2eHGz388v7Z3GsnTsZXzFOPlM5iprTQDsVKtW2eS0olMjGiEpaOo%2F0zNhlxXmt8ElrPG2OfAF5iirFJ%2B8LC0KK4rkXzyUoCQeIMx9JOXkwodHTnwY6nQE2Xyp11%2Bkja9tA56UC5DxVZgJm6E%2BPG%2B6st6KiCpROUyWG%2FVh4B56KEeXh05DpICnx%2FFrSgkEqeURQkGVZBHlH3%2B8s8S51Eck%2FCO0YZAV%2F6fXHAwOb%2FSLQdNu9F8O12LQ3zlZ7g9WdeIwwI1rBq6%2B0tk6Z7wUHM0HYgXBIjODwGR6bj2Z9L%2Fq3nWilj3Uu83YiCh5UNMxYpLHRQyW4&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAS3MDRZGPPABKOLNQ%2F20230221%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20230221T161946Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Signature=41307176921cc09594803e23faa762f513a2de7babf42923a03e01391fcf6e50",
            "verified": false,
            "follower_badges": [],
            "is_subscribed": false,
            "months_subscribed": 0,
            "quantity_gifted": 0
        }
    },
    "channel": "chatrooms.1111249"
  } */

class KickLiveChat extends EventEmitter {
  constructor(
    options = {
      chatroomId: '',
      channelId: '',
    },
  ) {
    super()

    this.chatSocket = new WebSocket(
      'wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false',
    )

    this.chatroomId = options.chatroomId
    this.channelId = options.channelId

    this._setup()
  }

  _setup() {
    this.chatSocket.on('open', () => {
      console.log('[INFO] Kick chat connected')

      this._connect_chat({
        chatroomId: this.chatroomId,
        channelId: this.channelId,
      })
    })

    this.chatSocket.on('message', (data) => {
      try {
        const msg = data.toString('utf-8')
        const jsonMsg = JSON.parse(msg)

        if (jsonMsg?.event === 'App\\Events\\ChatMessageSentEvent') {
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { message } = jsonData
          const { user } = jsonData

          const { message: messageText } = message
          const { username, verified, is_subscribed, profile_thumb, role } =
            user
          const isMod = role === 'Channel Host'
          const isOwner = role === 'Channel Host'

          this.emit('message', {
            sender: username,
            message: messageText,
            origin: 'kick',
            pfp: profile_thumb,
            is_mod: isMod,
            is_owner: isOwner,
            is_verified: verified,
            is_member: is_subscribed,
          })
        }
      } catch (e) {
        console.log('Error parsing message', e)
        return
      }
    })

    this.chatSocket.on('close', () => {
      this.emit('end')
    })
  }

  async _connect_chat({ chatroomId, channelId }) {
    // GET https://kick.com/api/v1/channels/:channelName
    // Protected by Cloudflare. Could use cloudscraper on PyPi to get around this.
    // For now, we'll manually specify the channel/chat IDs.
    // .chatroom.id
    // .chatroom.channel_id

    try {
      // Send message to WS:
      // {"event": "pusher:subscribe","data": {"auth": "","channel": "channel.<channel_id>"}}
      // {"event": "pusher:subscribe","data": {"auth": "","channel": "chatrooms.<chatroom_id>"}}
      this.chatSocket.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: {
            auth: '',
            channel: `channel.${channelId}`,
          },
        }),
      )

      this.chatSocket.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: {
            auth: '',
            channel: `chatrooms.${chatroomId}`,
          },
        }),
      )
    } catch (err) {
      console.log(err)
      this.emit('end')
    }
  }

  disconnect() {
    this.chatSocket.close()
    this.chatSocket = null
  }
}

module.exports = KickLiveChat
