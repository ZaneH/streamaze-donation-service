const { EventEmitter } = require('stream')

class ChatMonitor extends EventEmitter {
  constructor({ service = 'kick', streamazeKey }) {
    super()

    this.segmentDuration = 1 * 60 * 1000 // X minutes
    this.segmentStartTime = 0 // timestamp of current segment
    this.messageCount = 0 // number of messages in current segment
    this.service = service
    this.streamazeKey = streamazeKey
  }

  addMessageToSegment() {
    const now = Date.now()
    const segmentStartTime = this.segmentStartTime
    const segmentDuration = this.segmentDuration

    if (now - segmentStartTime > segmentDuration) {
      // Start new segment
      this.startNextSegment()
    }

    this.messageCount++
  }

  startNextSegment() {
    this.segmentStartTime = Date.now()

    const messageCount = this.messageCount
    this.messageCount = 0

    this.emit('segment', messageCount)
  }
}

module.exports = ChatMonitor
