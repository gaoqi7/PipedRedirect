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
