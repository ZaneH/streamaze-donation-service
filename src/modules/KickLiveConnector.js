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

/**
 * DELETED MESSAGE
 * {"event":"App\\Events\\ChatMessageDeletedEvent","data":"{\"deletedMessage\":{\"id\":\"175462f2-62f5-4091-ad30-9ef3ba68b914\",\"deleted_by\":1065824,\"chatroom_id\":\"328681\"}}","channel":"chatrooms.328681"}
 */

/**
 * GIFTED SUB
 * {"event":"App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent","data":"{\"channel\":{\"id\":328683,\"user_id\":336946,\"slug\":\"sam\",\"playback_url\":\"https:\\/\\/fa723fc1b171.us-west-2.playback.live-video.net\\/api\\/video\\/v1\\/us-west-2.196233775518.channel.z7oMLoDcD3va.m3u8\",\"name_updated_at\":null,\"vod_enabled\":true,\"subscription_enabled\":true,\"chatroom\":{\"id\":328681,\"chatable_type\":\"App\\\\Models\\\\Channel\",\"channel_id\":328683,\"created_at\":\"2022-12-24T08:55:26.000000Z\",\"updated_at\":\"2023-02-25T23:57:02.000000Z\",\"chat_mode_old\":\"public\",\"chat_mode\":\"followers_only\",\"slow_mode\":false,\"chatable_id\":328683}},\"usernames\":[\"sooofunny37\"],\"gifter_username\":\"charlottefreya\"}","channel":"channel.328683"}
 */

/**
 * NORMAL SUB
 * {"event":"App\\Events\\ChatMessageSentEvent","data":"{\"message\":{\"id\":\"0522c3a0-797f-4ada-a48e-87d32339bd5b\",\"message\":null,\"type\":\"info\",\"replied_to\":null,\"is_info\":null,\"link_preview\":null,\"chatroom_id\":328681,\"role\":\"user\",\"created_at\":1677375138,\"action\":\"subscribe\",\"optional_message\":null,\"months_subscribed\":1,\"subscriptions_count\":0,\"giftedUsers\":null},\"user\":{\"id\":1158339,\"username\":\"ZaneH\",\"role\":\"user\",\"isSuperAdmin\":null,\"profile_thumb\":\"https:\\/\\/kick-files-prod.s3.us-west-2.amazonaws.com\\/images\\/user\\/1158339\\/profile_image\\/conversion\\/a55df1c3-10e0-425b-b7ed-727ea2d3bed4-thumb.webp?X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEJH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJIMEYCIQDw8zWscWJ8KXtjf%2B7OBVERtUM4BApHMhZ%2BieyNuUBCvQIhALnRnlpTEZOpjmrT5HWy8x4fbodFexoXPXkF1syHZ4PRKqEDCDoQABoMMTk2MjMzNzc1NTE4IgwooDmX1WJ7hAcTNXcq%2FgJ8%2F%2BA%2FZIrgZB8LlDhtYtGqjed0m2IU9NmYdUsGR9HKfFGvcDdppdL8TIghItY4pXRU3UdxkqQSMta1XubpgdHnWjnuPE1w7kXxg9x1NyvnQF7l9pXzYACaDK%2BYFq7NMuPIZvieF3uSB%2FE0LCHukiLUa2LQP%2FH7pvOhre8RsNbEa5LPUXgrz7DjezF1BvrZBOEZazw4xZUGCXpBKhQVeWd%2F%2B12okCFbRq0%2FaS6WVmr2I22GgfIdkWN%2Bnvm%2BGh5tBHoAOdYa8vjlAbbTrqUPsaErkw21zMWh3Yoxq8BraShHncdys5VWTiexspAJBBhwNAFhpimmZzh8M0FiVcgPyMvxPeiLj%2BDkBVfgSdoJgHEEseSeev6IEqK7X%2Fyr2ZCvwEIlFIEP4pAA7LS4YGj0DbR%2FlLHCzp9TxOfffFxd1PvCEZjiretVz7OTUOUR8ot82VIOJxKyL0RIlWtt4Wf73wLAOn71WbgMA39CDrTB7HnN5OOuWSxgEGmY%2FJTB63TWMJ%2Fc6p8GOpwBxRoyh2H94hIOnFqIcHTwmBP%2BPEoWUM56gt1p7%2BB2d0lyamqcL1cZNZgaVRJnBCzFRFL7POOz3yfGwJVqfF%2Bdrb6J2jy7evkGKvxNRioWWx38BsP0BZoKUcT0oXKvgzqh62OeljHRzwGi6N%2FuudNOj%2BCA1QS%2BgnoDVAkgocEfdBriaNYPgZ28D09qn4jlvYDoPvfRJWugsukm1HiM&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAS3MDRZGPELTHSAOJ%2F20230226%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20230226T013218Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Signature=c1093724410d6e139f4f125e3a8dabe272975ec4e6f46883163c98822e437a64\",\"verified\":false,\"follower_badges\":[],\"is_subscribed\":null,\"months_subscribed\":1,\"quantity_gifted\":0}}","channel":"chatrooms.328681"}
 */

/**
 * DELETED MESSAGE
 * {event: 'App\\Events\\ChatMessageDeletedEvent',data: '{"deletedMessage":{"id":"fceaf753-181e-47ef-872b-7ffff0becc3d","deleted_by":1158339,"chatroom_id":"328681"}}',channel: 'chatrooms.328681'}
 */

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

          // handle subscriptions
          if (message?.action === 'subscribe') {
            const monthsSubscribed = parseInt(message?.months_subscribed)
            const { profile_thumb, username } = user

            this.emit('kickSub', {
              type: 'kickSub',
              data: {
                id: message?.id,
                name: username,
                pfp: profile_thumb,
                displayString: 'just subscribed on Kick!',
                amount: {
                  months: monthsSubscribed || 0,
                },
              },
            })
          } else {
            const { message: messageText } = message
            // parse emojis they look like [emote:id_num:name]
            const emojiRegex = /\[emote:(\d+):([^\]]*)*\]/g
            // find all emojis in the messageText and create {url, keys} objects
            const allEmoji = [...messageText.matchAll(emojiRegex)].map(
              (match) => {
                const [, id, name] = match
                return {
                  url: `https://files.kick.com/emotes/${id}/fullsize`,
                  keys: `[emote:${id}:${name ?? ''}]`,
                }
              },
            )

            // check for kick emotes
            const kickEmoteRegex = /\[emoji:(\w+)*\]/g
            const kickEmotes = [...messageText.matchAll(kickEmoteRegex)].map(
              (match) => {
                const [, name] = match
                return {
                  url: `https://dbxmjjzl5pc1g.cloudfront.net/a984b19b-fb89-450b-b4c3-6e4fadd199c9/images/emojis/${name}.png`,
                  keys: `[emoji:${name}]`,
                }
              },
            )

            const uniqueEmoji = [...new Set([...allEmoji, ...kickEmotes])]

            const { username, verified, is_subscribed, profile_thumb, role } =
              user
            const isMod = role === 'Moderator'
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
              emotes: uniqueEmoji,
            })
          }
        } else if (
          jsonMsg?.event ===
          'App\\Events\\LuckyUsersWhoGotGiftSubscriptionsEvent'
        ) {
          const { data } = jsonMsg // data is another json string
          const jsonData = JSON.parse(data)
          const { usernames, gifter_username } = jsonData

          const amountOfSubs = usernames.length
          const displayString = `just gifted ${amountOfSubs} sub${
            amountOfSubs <= 1 ? '' : 's'
          } on Kick!`

          this.emit('kickGiftedSub', {
            type: 'kickGiftedSub',
            data: {
              id: Math.floor(Math.random() * 1000000000).toString(),
              name: gifter_username,
              usernames,
              displayString,
              amount: {
                months: amountOfSubs,
              },
            },
          })
        } else if (jsonMsg?.event === 'pusher:connection_established') {
        } else if (
          jsonMsg?.event === 'pusher_internal:subscription_succeeded'
        ) {
        } else if (jsonMsg?.event === 'pusher:pong') {
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
