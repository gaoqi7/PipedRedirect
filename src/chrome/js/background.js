chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openInPiped',
    title: 'Open link in Piped',
    contexts: ['link'],
  })
})

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
