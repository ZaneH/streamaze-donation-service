const { EventEmitter } = require('stream')
const WebSocket = require('ws')
const { mapKickEmoji } = require('../utils/Emoji')

class KickLiveChat extends EventEmitter {
  constructor(
    options = {
      channelId: '',
      chatroomId: '',
      channelName: '',
    },
  ) {
    super()

    this.chatSocket = new WebSocket(
      'wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false',
    )

    this.channelId = options.channelId
    this.chatroomId = options.chatroomId
    this.channelName = options.channelName

    this._setup()
  }

  _setup() {
    this.chatSocket.on('open', () => {
      console.log('[INFO] Kick chat connected')

      this._connect_chat({
        channelName: this.channelName,
        channelId: this.channelId,
        chatroomId: this.chatroomId,
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
          const {
            follower_badges,
            quantity_gifted,
            months_subscribed,
            is_founder,
          } = user

          // handle subscriptions
          if (message?.action === 'subscribe') {
            // console.log("Deprecated call for 'subscribe' action...skipping")
          } else if (message?.type === 'message') {
            // V1 Kick messages
            const { message: messageText } = message

            const uniqueEmoji = mapKickEmoji(messageText)

            const { username, verified, is_subscribed, profile_thumb, role } =
              user
            const isMod = role === 'Moderator'
            const isOwner = role === 'Channel Host'

            const badges = []
            if (is_founder) {
              badges.push('Founder')
            }

            if (parseInt(quantity_gifted) >= 50) {
              badges.push('Gifter50')
            } else if (parseInt(quantity_gifted) >= 25) {
              badges.push('Gifter25')
            } else if (parseInt(quantity_gifted) > 0) {
              badges.push('Gifter')
            }

            badges.push(...follower_badges)

            this.emit('message', {
              sender: username,
              message: messageText,
              origin: 'kick',
              pfp: profile_thumb,
              is_mod: isMod,
              is_owner: isOwner,
              is_verified: verified,
              is_member: is_subscribed,
              emotes: uniqueEmoji,
              badges,
            })
          } else {
            console.log('[INFO] Unhandled Kick message', jsonMsg)
          }
        } else if (
          jsonMsg?.event ===
          'App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent'
        ) {
          // V1 Kick gifted subs
          // const { data } = jsonMsg // data is another json string
          // const jsonData = JSON.parse(data)
          // const { usernames, gifter_username } = jsonData

          // const amountOfSubs = usernames.length
          // const displayString = `just gifted ${amountOfSubs} sub${
          //   amountOfSubs <= 1 ? '' : 's'
          // } on Kick!`

          // this.emit('kickGiftedSub', {
          //   type: 'kickGiftedSub',
          //   data: {
          //     id: Math.floor(Math.random() * 1000000000).toString(),
          //     name: gifter_username,
          //     usernames,
          //     displayString,
          //     amount: {
          //       months: amountOfSubs,
          //     },
          //   },
          // })

          console.log(
            'Deprecated call for LuckyUsersWhoGotGiftSubscriptionsEvent',
          )
        } else if (jsonMsg?.event === 'App\\Events\\GiftedSubscriptionsEvent') {
          // V2 Kick gifted subs
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { gifted_usernames, gifter_username } = jsonData

          const amountOfSubs = gifted_usernames.length
          const displayString = `just gifted ${amountOfSubs} sub${
            amountOfSubs <= 1 ? '' : 's'
          } on Kick!`

          this.emit('kickGiftedSub', {
            type: 'kickGiftedSub',
            data: {
              id: Math.floor(Math.random() * 1000000000).toString(),
              name: gifter_username,
              usernames: gifted_usernames,
              displayString,
              amount: {
                months: amountOfSubs,
              },
            },
          })
        } else if (jsonMsg?.event === 'pusher:connection_established') {
          // noop
        } else if (
          jsonMsg?.event === 'pusher_internal:subscription_succeeded'
        ) {
          // noop
        } else if (jsonMsg?.event === 'pusher:pong') {
          // noop
        } else if (jsonMsg?.event === 'App\\Events\\ChatMessageEvent') {
          // V2 Kick messages
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { id: msgId, sender, content, type } = jsonData
          const { username, identity } = sender
          const { badges: fullBadges } = identity
          const badges = fullBadges.map((badge) => badge.type)
          const isMod = badges.includes('moderator')
          const isSubscribed = badges.includes('subscriber')
          const isVerified = badges.includes('verified')
          const isOwner = badges.includes('broadcaster')

          const { metadata } = jsonData || {}
          const uniqueEmoji = mapKickEmoji(content)

          this.emit('message', {
            id: msgId,
            type, // 'message' or 'reply'
            sender: username,
            message: content,
            origin: 'kick',
            is_mod: isMod,
            is_owner: isOwner,
            is_verified: isVerified,
            is_member: isSubscribed,
            gifted_count:
              fullBadges.find((b) => b.type === 'sub_gifter')?.count || 0,
            emotes: uniqueEmoji,
            badges,
            metadata,
          })
        } else if (jsonMsg?.event === 'App\\Events\\SubscriptionEvent') {
          // V2 Kick sub
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { months } = jsonData

          this.emit('kickSub', {
            type: 'kickSub',
            data: {
              id: Math.floor(Math.random() * 1000000000).toString(),
              name: jsonData.username,
              displayString: 'just subscribed on Kick!',
              amount: {
                months,
              },
            },
          })
        } else if (jsonMsg?.event === 'App\\Events\\StreamHostEvent') {
          // V2 Kick host
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { number_viewers, host_username, optional_message } =
            jsonData || {}

          this.emit('kickHost', {
            type: 'kickHost',
            data: {
              id: Math.floor(Math.random() * 1000000000).toString(),
              name: host_username,
              number_viewers,
              optional_message,
            },
          })
        } else {
          console.log('[INFO] Unhandled Kick message', jsonMsg)
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

  async _connect_chat(chatOptions = {}) {
    // GET https://kick.com/api/v1/channels/:channelName
    // Protected by Cloudflare. Could use cloudscraper on PyPi to get around this.
    // For now, we'll manually specify the channel/chat IDs.
    // .chatroom.id
    // .chatroom.channel_id

    const { channelId, chatroomId } = chatOptions

    try {
      // Send message to WS:
      // {"event": "pusher:subscribe","data": {"auth": "","channel": "channel.<channel_id>"}}
      // {"event": "pusher:subscribe","data": {"auth": "","channel": "chatrooms.<chatroom_id>.v2"}}
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
            channel: `chatrooms.${chatroomId}.v2`,
          },
        }),
      )

      // TODO: This doesn't need to be 30s, it can be larger
      this.heartbeat = setInterval(() => {
        this.chatSocket.send(
          JSON.stringify({
            event: 'pusher:ping',
            data: {},
          }),
        )
      }, 30000)
    } catch (err) {
      console.log(err)
      this.emit('end')
    }
  }

  disconnect() {
    if (this.chatSocket.readyState === WebSocket.OPEN) {
      this.chatSocket.close()
    }

    clearInterval(this.heartbeat)
    this.chatSocket = null
  }
}

module.exports = KickLiveChat
