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
