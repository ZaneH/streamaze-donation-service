const fetch = require('node-fetch')

createEndpointUrl = (endpoint) => {
  return `${process.env.OBS_API_URL}${endpoint}`
}

handleResponse = (resp) => {
  return resp.status === 204
}

startBroadcast = async () => {
  const resp = await fetch(createEndpointUrl('/streamers/sam/stream/start'), {
    method: 'POST',
  })

  if (handleResponse(resp)) {
    return {
      message: 'Stream started.',
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem starting the stream.',
    }
  }
}

stopBroadcast = async () => {
  const resp = await fetch(createEndpointUrl('/streamers/sam/stream/stop'), {
    method: 'POST',
  })

  if (handleResponse(resp)) {
    return {
      message: 'Stream stopped.',
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem stopping the stream.',
    }
  }
}

startServer = async ({ isYouTube = false, isTikTok = false }) => {
  // if isYouTube or isTikTok is not set, throw an error
  if (!isYouTube && !isTikTok) {
    throw new Error('You must specify a platform to start the server for.')
  }

  const qs = new URLSearchParams()
  if (isYouTube) {
    qs.append('id', 'default')
  } else if (isTikTok) {
    qs.append('id', 'tiktok')
  }

  const resp = await fetch(
    createEndpointUrl(`/streamers/sam/server/start?${qs.toString()}`),
    {
      method: 'POST',
    },
  )

  if (handleResponse(resp)) {
    return {
      message: `${isYouTube ? 'YouTube' : 'TikTok'} server started.`,
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem starting the server.',
    }
  }
}

stopServer = async () => {
  const resp = await fetch(createEndpointUrl('/streamers/sam/server/stop'), {
    method: 'POST',
  })

  if (handleResponse(resp)) {
    return {
      message: 'Server stopped.',
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem stopping the server.',
    }
  }
}

switchScene = async (sceneName) => {
  const resp = await fetch(
    createEndpointUrl(`/streamers/sam/scene/${sceneName}`),
    {
      method: 'PUT',
    },
  )

  if (handleResponse(resp)) {
    return {
      message: `Scene switched to ${sceneName}.`,
    }
  } else {
    console.error(resp)
    return {
      error: 'There was a problem switching scenes.',
    }
  }
}

module.exports = {
  startBroadcast,
  stopBroadcast,
  startServer,
  stopServer,
  switchScene,
}
