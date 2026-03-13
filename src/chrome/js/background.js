chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openInPiped',
    title: 'Open link in Piped',
    contexts: ['link'],
  })
})

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openInPiped') {
    chrome.storage.sync.get('pipedHostname', function (data) {
      const hostname = normalizeHostname(data.pipedHostname)
      const pipedUrl = toPipedUrl(info.linkUrl, hostname)
      if (pipedUrl) {
        chrome.tabs.create({ url: pipedUrl })
      }
    })
  }
})
