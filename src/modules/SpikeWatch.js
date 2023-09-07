const { EventEmitter } = require('stream')

class SpikeWatch extends EventEmitter {
  constructor() {
    super()

    // Stores the previous rolling average for each user
    this.lastRollingAverage = {}
    // Stores the value of the last 4 segments of the rolling average
    this.lastFourSegments = {}
    // Determines the threshold for a spike
    this.threshold = 0.1
    // The duration of a segment in milliseconds
    this.segmentDuration = 2 * 60 * 1000 // 5 minutes
    // The time at which the current segment started
    this.segmentStartTime = 0
  }

  resetUser(id) {
    this.lastRollingAverage[id] = 0
    delete this.lastFourSegments[id]
  }

  startNextSegment() {
    this.segmentStartTime = Date.now()

    for (const id in this.lastFourSegments) {
      // Calculate the rolling average
      const rAvg = this.getRollingAverage(id)

      // Check if there is a spike
      const isSpike = this.isSpike(id, rAvg)

      if (isSpike) {
        this.emit('spike', id, rAvg)
      }

      // Update the rolling average
      this.lastRollingAverage[id] = rAvg

      // Shift the data
      if (this.lastFourSegments[id].length === 4) {
        this.lastFourSegments[id].shift()
      }

      // Push a new segment
      this.lastFourSegments[id].push(0)
    }
  }

  addMessageToSegment(id) {
    const now = Date.now()
    const segmentStartTime = this.segmentStartTime
    const segmentDuration = this.segmentDuration

    if (now - segmentStartTime > segmentDuration) {
      // Start new segment
      this.startNextSegment()
    }

    const prev = this.lastFourSegments[id]
    if (!prev) {
      this.lastFourSegments[id] = [0]
    }

    const newMessageCount = this.lastFourSegments[id].pop() + 1
    this.lastFourSegments[id].push(newMessageCount)
  }

  getRollingAverage(id) {
    // 1. Get the sum of the first 3 segments
    const lastFourSegments = this.lastFourSegments[id].slice(0, 3)
    const sum = lastFourSegments.reduce((a, b) => a + b, 0)
    // 2. Divide the sum by the number of segments
    const average = sum / lastFourSegments.length
    return average
  }

  isSpike(id, newRollingAverage) {
    if (this.lastFourSegments[id].length < 4) {
      return false // Not enough data
    }

    if (!this.lastRollingAverage[id]) {
      console.log(`No rolling average for user ${id}`)
      return false
    }

    // Calculate the percentage difference between the new and previous rolling averages
    const percentageDifference =
      (newRollingAverage - this.lastRollingAverage[id]) /
      this.lastRollingAverage[id]

    // Check if the percentage difference exceeds the threshold
    if (percentageDifference > this.threshold) {
      return true // Spike detected
    }

    return false // No spike detected
  }
}

module.exports = SpikeWatch
