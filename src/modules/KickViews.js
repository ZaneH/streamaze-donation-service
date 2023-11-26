/**
 * Copyright 2023, Zane Helton, All rights reserved.
 */

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

class KickViews {
  static async getViews(channelName) {
    let browser
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--disable-gpu', '--no-sandbox'],
        protocolTimeout: 60_000,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      })

      const page = await browser.newPage()
      await page.goto(`https://www.kick.com/${channelName}`, {
        waitUntil: 'load',
        timeout: 420_000,
      })

      await page.waitForXPath('//span[@class="odometer-value"]')
      const allViewValues = await page.$x('//span[@class="odometer-value"]')

      let viewers = ''
      for (const odometer_value of allViewValues) {
        const value = await page.evaluate(
          (el) => el.textContent,
          odometer_value,
        )
        viewers += value
      }

      await browser.close()

      if (viewers.length === 0) {
        return {
          error: 'There was an error fetching the viewers for the Kick stream.',
        }
      }

      return { viewers }
    } catch (err) {
      if (browser) {
        await browser.close()
      }

      return {
        error: 'There was an error fetching the viewers for the Kick stream.',
      }
    }
  }
}

module.exports = KickViews
