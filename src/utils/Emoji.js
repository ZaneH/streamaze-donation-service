const mapKickEmoji = (messageText) => {
  // parse emojis they look like [emote:id_num:name]
  const emojiRegex = /\[emote:(\d+):([^\]]*)*\]/g
  // find all emojis in the messageText and create {url, keys} objects
  const allEmoji = [...(messageText?.matchAll(emojiRegex) || [])].map(
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
  const kickEmotes = [...(messageText?.matchAll(kickEmoteRegex) || [])].map(
    (match) => {
      const [, name] = match
      return {
        url: `https://dbxmjjzl5pc1g.cloudfront.net/a984b19b-fb89-450b-b4c3-6e4fadd199c9/images/emojis/${name}.png`,
        keys: `[emoji:${name}]`,
      }
    },
  )

  return [...new Set([...allEmoji, ...kickEmotes])]
}

module.exports = {
  mapKickEmoji,
}
