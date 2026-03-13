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

function redirect(newTab) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]

    if (currentTab && currentTab.url && currentTab.url.startsWith('http')) {
      try {
        chrome.storage.sync.get('pipedHostname', function (data) {
          const hostname = normalizeHostname(data.pipedHostname)
          const pipedUrl = toPipedUrl(currentTab.url, hostname)
          if (!pipedUrl) {
            alert('This is not a YouTube URL')
            return
          }
          if (newTab) {
            chrome.tabs.create({ url: pipedUrl })
          } else {
            chrome.tabs.update(currentTab.id, {
              url: pipedUrl,
            })
          }
        })
      } catch (e) {
        console.error(e)
        alert('Invalid URL')
      }
    } else {
      alert('Not a valid URL')
    }
  })
}

document
  .getElementById('openInThisTab')
  .addEventListener('click', () => redirect(false))
document
  .getElementById('openInNewTab')
  .addEventListener('click', () => redirect(true))
