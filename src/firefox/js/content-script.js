function normalizeHostname(input) {
  const fallback = 'piped.kavin.rocks'
  if (!input || typeof input !== 'string') return fallback
  const trimmed = input.trim()
  if (!trimmed) return fallback

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).host || fallback
    }
    if (trimmed.includes('/')) {
      return new URL(`https://${trimmed}`).host || fallback
    }
    return trimmed
  } catch (e) {
    return fallback
  }
}

function toPipedUrl(originalUrl, pipedHostname) {
  let url
  try {
    url = new URL(originalUrl)
  } catch (e) {
    return null
  }

  const hostname = url.hostname
  const isYouTube =
    hostname === 'youtube.com' || hostname.endsWith('.youtube.com')
  const isShort = hostname === 'youtu.be'

  if (!isYouTube && !isShort) return null

  const target = new URL(originalUrl)
  target.host = pipedHostname

  if (isShort) {
    const videoId = url.pathname.replace('/', '')
    if (!videoId) return null
    target.pathname = '/watch'
    target.searchParams.set('v', videoId)
    return target.href
  }

  if (url.pathname.startsWith('/shorts/')) {
    const videoId = url.pathname.split('/')[2] || ''
    if (!videoId) return null
    target.pathname = '/watch'
    target.searchParams.set('v', videoId)
  }

  return target.href
}

(async function () {
  let data = await browser.storage.sync.get(['pipedHostname', 'autoRedirect'])
  const hostname = normalizeHostname(data.pipedHostname)
  const autoRedirect =
    data.autoRedirect !== undefined ? data.autoRedirect : true
  if (!autoRedirect) return

  const pipedUrl = toPipedUrl(window.location.href, hostname)
  if (pipedUrl) {
    window.location.replace(pipedUrl)
  }
})()
