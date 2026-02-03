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

document.getElementById('save').addEventListener('click', function () {
  const hostname = normalizeHostname(
    document.getElementById('hostname').value
  )
  const autoRedirect = document.getElementById('autoRedirect').checked
  chrome.storage.sync.set(
    { pipedHostname: hostname, autoRedirect: autoRedirect },
    function () {
      document.getElementById('hostname').value = hostname
      alert('Options saved')
    }
  )
})

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(['pipedHostname', 'autoRedirect'], function (data) {
    const normalized = normalizeHostname(data.pipedHostname)
    document.getElementById('hostname').value = normalized
    document.getElementById('autoRedirect').checked =
      data.autoRedirect !== undefined ? data.autoRedirect : true
  })
})
