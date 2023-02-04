const fetch = require('node-fetch')

const getPFPFromChannelId = async (channelId) => {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&fields=items%2Fsnippet%2Fthumbnails&key=${process.env.YOUTUBE_API_KEY}`,
    )

    if (!resp.ok) {
      console.error(resp)
      return
    } else {
      const data = await resp.json()
      const pfpUrl = data?.items[0]?.snippet?.thumbnails?.default?.url

      if (!pfpUrl) {
        console.error('Error getting profile picture')
        return
      }

      return pfpUrl
    }
  } catch (e) {
    console.error(e)
    return
  }
}

module.exports = {
  getPFPFromChannelId,
}
