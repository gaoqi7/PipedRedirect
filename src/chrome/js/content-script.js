function normalizeHostname(input) {
  const defaultHostname = 'piped.kavin.rocks'
  const fallback =
    typeof defaultHostname === 'string' && defaultHostname.trim()
      ? defaultHostname.trim()
      : 'piped.kavin.rocks'
  const candidate = typeof input === 'string' && input.trim() ? input.trim() : fallback

  try {
    const parsed =
      candidate.startsWith('http://') || candidate.startsWith('https://')
        ? new URL(candidate)
        : new URL(`https://${candidate}`)
    return parsed.host || fallback
  } catch (e) {
    try {
      return new URL(`https://${fallback}`).host || 'piped.kavin.rocks'
    } catch (innerError) {
      return 'piped.kavin.rocks'
    }
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
  const isWatch = url.pathname === '/watch'
  const isShorts = url.pathname.startsWith('/shorts/')

  if (!isYouTube && !isShort) return null
  if (!isShort && !isWatch && !isShorts) return null

  const target = new URL(originalUrl)
  target.protocol = 'https:'
  target.host = pipedHostname

  if (isShort) {
    const videoId = url.pathname.split('/').filter(Boolean)[0] || ''
    if (!videoId) return null
    target.pathname = '/watch'
    target.searchParams.set('v', videoId)
    return target.href
  }

  if (isWatch && !url.searchParams.get('v')) return null

  if (isShorts) {
    const videoId = url.pathname.split('/')[2] || ''
    if (!videoId) return null
    target.pathname = '/watch'
    target.searchParams.set('v', videoId)
  }

  return target.href
}

function startAutoRedirect(pipedHostname) {
  let lastSeenUrl = ''
  let redirectInProgress = false
  let checkQueued = false

  function checkAndRedirect() {
    if (redirectInProgress) return

    const currentUrl = window.location.href
    if (!currentUrl || currentUrl === lastSeenUrl) return
    lastSeenUrl = currentUrl

    const pipedUrl = toPipedUrl(currentUrl, pipedHostname)
    if (!pipedUrl || pipedUrl === currentUrl) return

    redirectInProgress = true
    window.location.replace(pipedUrl)
  }

  function queueCheck() {
    if (checkQueued || redirectInProgress) return
    checkQueued = true
    setTimeout(function () {
      checkQueued = false
      checkAndRedirect()
    }, 0)
  }

  const originalPushState = history.pushState
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments)
    queueCheck()
    return result
  }

  const originalReplaceState = history.replaceState
  history.replaceState = function () {
    const result = originalReplaceState.apply(this, arguments)
    queueCheck()
    return result
  }

  window.addEventListener('popstate', queueCheck)
  window.addEventListener('yt-navigate-finish', queueCheck, true)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      queueCheck()
    }
  })

  checkAndRedirect()
}

chrome.storage.sync.get(['pipedHostname', 'autoRedirect'], function (data) {
  const hostname = normalizeHostname(data.pipedHostname)
  const autoRedirect =
    data.autoRedirect !== undefined ? data.autoRedirect : true
  if (!autoRedirect) return

  startAutoRedirect(hostname)
})
