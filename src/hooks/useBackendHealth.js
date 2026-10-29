import { useCallback, useEffect, useState } from 'react'
import { checkBackendHealth, getServiceConfiguration } from '../services/sceneApi.js'

const initialHealth = {
  ...getServiceConfiguration(),
  status: 'checking',
  message: 'Checking backend health…',
  imageGenerationConfigured: false,
  imageProvider: 'not_configured',
  imageModel: null,
  portraitAnalysisConfigured: false,
  portraitGenerationConfigured: false,
}

export default function useBackendHealth() {
  const [status, setStatus] = useState(initialHealth)

  const refresh = useCallback(async () => {
    const configuration = getServiceConfiguration()
    setStatus((current) => ({ ...current, ...configuration, status: 'checking', message: 'Checking backend health…' }))
    const health = await checkBackendHealth()
    setStatus((current) => ({ ...current, ...configuration, ...health }))
    return health
  }, [])

  useEffect(() => {
    let active = true
    async function poll() {
      const configuration = getServiceConfiguration()
      if (!configuration.healthConfigured) {
        if (active) {
          setStatus({
            ...configuration,
            status: 'offline',
            message: 'Health check URL is not configured.',
            imageGenerationConfigured: false,
            imageProvider: 'not_configured',
            imageModel: null,
            portraitAnalysisConfigured: false,
            portraitGenerationConfigured: false,
          })
        }
        return
      }

      if (active) {
        setStatus((current) => ({ ...current, ...configuration, status: 'checking', message: 'Checking backend health…' }))
      }
      const health = await checkBackendHealth()
      if (active) setStatus((current) => ({ ...current, ...configuration, ...health }))
    }

    void poll()
    const intervalId = window.setInterval(() => { void poll() }, 5_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  return { status, refresh }
}
