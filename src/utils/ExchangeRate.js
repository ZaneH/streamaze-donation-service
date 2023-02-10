const fetch = require('node-fetch')

const oneUSDToBaht = async () => {
  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
    )

    const data = await response.json()
    const rates = data?.rates
    const baht = rates?.THB

    return parseFloat(baht).toFixed(2)
  } catch (error) {
    console.log('[ERROR (Exchange Rate)]: ', error)

    return 33.5
  }
}

module.exports = {
  oneUSDToBaht,
}
