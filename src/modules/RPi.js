/**
 * Copyright 2023, Zane Helton, All rights reserved.
 */

const fetch = require('node-fetch')

createEndpointUrl = (endpoint) => {
  return `${process.env.OBS_API_URL}${endpoint}`
}

handleResponse = (resp) => {
  return resp.status === 204
}

stopRPi = async () => {
  const resp = await fetch(
    createEndpointUrl('/streamers/sam/device/shutdown'),
    {
      method: 'POST',
    },
  )

  if (handleResponse(resp)) {
    return {
      message: 'Raspberry Pi stopped.',
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem stopping the Raspberry Pi.',
    }
  }
}

module.exports = {
  stopRPi,
}
