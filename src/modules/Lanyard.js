const fetch = require('node-fetch')

updateKV = async (discordUserId, key, value, apiKey) => {
  const resp = await fetch(
    `${process.env.LANYARD_API_URL}/v1/users/${discordUserId}/kv/${key}`,
    {
      method: 'PUT',
      body: value,
      headers: {
        Authorization: apiKey,
      },
    },
  )

  if (!resp.ok) {
    console.error(resp)
    throw new Error(
      `Failed to update KV for ${discordId}, Key: ${key}, Value: ${value}`,
    )
  }

  return resp
}

module.exports = {
  updateKV,
}
