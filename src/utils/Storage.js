const fetch = require('node-fetch')

const storeDonation = async ({
  streamerId,
  type,
  sender,
  amount_in_usd,
  message,
  metadata,
  amount,
  currency = 'usd',
  months,
  excludeFromProfits = false,
}) => {
  console.log('[INFO] Storing donation', {
    streamerId,
    type,
    sender,
    amount_in_usd,
  })

  try {
    let amountInUSD = amount_in_usd
    if (currency.toLowerCase() !== 'usd') {
      const currencyRateToUSD = await fetch(
        `${process.env.EXCHANGE_RATE_API}/v1/rates/${currency.toLowerCase()}`,
      )

      if (currencyRateToUSD.ok) {
        const jsonResp = await currencyRateToUSD.json()
        const usdConversionRate = parseFloat(
          jsonResp?.data?.[currency.toLowerCase()],
        )

        amountInUSD = (amount / 100 / usdConversionRate).toFixed(2)
      }
    }

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
          amount_in_usd: amountInUSD,
          message,
          metadata,
          months,
          exclude_from_profit: excludeFromProfits,
          value: {
            amount: parseInt(amount),
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
  } catch (err) {
    console.error(err)
  }
}

module.exports = {
  storeDonation,
}
