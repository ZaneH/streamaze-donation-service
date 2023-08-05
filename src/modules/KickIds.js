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
        const receivedIds = {
          channel: null,
          chatrooms: null,
        }

        function checkAndResolve() {
          if (receivedIds.channel !== null && receivedIds.chatrooms !== null) {
            console.log(`[INFO] Resolved IDs for ${channelName}`)
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

        setTimeout(() => {
          reject(new Error('Timeout'))
        }, 15000)
      })

      await page.goto(`https://www.kick.com/${channelName}`, {
        waitUntil: 'load',
        timeout: 420_000,
      })

      return idsPromise
    } catch (err) {
      console.error(err)
      return
    }
  }
}

module.exports = {
  KickIds,
}
