const fetch = require('node-fetch')

const storeDonation = async ({
  streamerId,
  type,
  sender,
  amount_in_usd,
  message,
  metadata,
  amount,
  currency,
}) => {
  const resp = await fetch(
    `${process.env.STREAMAZE_STORAGE_API_URL}/api/donations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamer_id: streamerId,
        type,
        sender,
        amount_in_usd, // TODO: Convert amount to USD server-side
        message,
        metadata,
        value: {
          amount,
          currency,
        },
      }),
    },
  )

  if (resp.ok) {
    console.log('Created a donation')
  } else {
    console.log(await resp.text())
    console.log('Failed to create a donation')
  }
}

module.exports = {
  storeDonation,
}
