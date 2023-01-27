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

startServer = async () => {
  const resp = await fetch(createEndpointUrl('/streamers/sam/server/start'), {
    method: 'POST',
  })

  if (handleResponse(resp)) {
    return {
      message: 'Server started.',
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
