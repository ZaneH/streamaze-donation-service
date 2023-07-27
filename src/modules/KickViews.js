const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

class KickViews {
  static async getViews(channelName) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      protocolTimeout: 60_000,
    })
    const page = await browser.newPage()
    await page.goto(`https://www.kick.com/${channelName}`, {
      waitUntil: 'load',
      timeout: 0,
    })
    await page.waitForXPath('//span[@class="odometer-value"]')
    const allViewValues = await page.$x('//span[@class="odometer-value"]')

    let viewers = ''
    for (const odometer_value of allViewValues) {
      const value = await page.evaluate((el) => el.textContent, odometer_value)
      viewers += value
    }

    await browser.close()

    if (viewers.length === 0) {
      return {
        error: 'There was an error fetching the viewers for the Kick stream.',
      }
    }

    return { viewers }
  }
}

module.exports = KickViews
