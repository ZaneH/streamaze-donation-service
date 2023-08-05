// Kick chat + donations require a channel ID and
// a chatroom ID. Getting them is not easy, so
// this module will get them from just a username.

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

class KickIds {
  static async getKickIds(channelName) {
    let browser
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--disable-gpu', '--no-sandbox'],
        protocolTimeout: 60_000,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      })

      const page = await browser.newPage()
      const cdp = await page.target().createCDPSession()
      await cdp.send('Network.enable')
      await cdp.send('Page.enable')

      const idsPromise = new Promise((resolve, reject) => {
        let timeout
        const receivedIds = {
          channel: null,
          chatrooms: null,
        }

        async function checkAndResolve() {
          if (receivedIds.channel !== null && receivedIds.chatrooms !== null) {
            console.log(`[INFO] Resolved IDs for ${channelName}`)
            clearTimeout(timeout)
            resolve(receivedIds)
          }
        }

        cdp.on('Network.webSocketFrameSent', (event) => {
          const { payloadData } = event.response
          const jsonData = JSON.parse(payloadData)
          const { data } = jsonData || {}
          const { channel } = data || {}

          if (channel?.indexOf('channel.') === 0) {
            const channelId = channel.split('.')[1]
            receivedIds.channel = channelId
            checkAndResolve()
          }

          if (channel?.indexOf('chatrooms.') === 0) {
            const chatroomId = channel.split('.')[1]
            receivedIds.chatrooms = chatroomId
            checkAndResolve()
          }
        })

        timeout = setTimeout(async () => {
          console.log(`[INFO] Kick ID request timed out for ${channelName}`)
          reject('Request timed out. Check the channel name and try again.')
        }, 15000)
      })

      await page.goto(`https://www.kick.com/${channelName}`, {
        waitUntil: 'load',
        timeout: 420_000,
      })

      const returnValue = await idsPromise
      await browser.close()
      return returnValue
    } catch (err) {
      console.error(err)
      if (browser) {
        await browser.close()
      }

      throw err
    }
  }
}

module.exports = {
  KickIds,
}
