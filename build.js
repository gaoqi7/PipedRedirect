const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const DEFAULT_HOSTNAME = 'piped.kavin.rocks'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    env[key] = value
  }
  return env
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function replaceInJsFiles(dir, searchValue, replacement) {
  if (searchValue === replacement) return
  const files = walkFiles(dir)
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const content = fs.readFileSync(file, 'utf8')
    if (!content.includes(searchValue)) continue
    fs.writeFileSync(file, content.split(searchValue).join(replacement))
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function createZip(browser, hostname) {
  const buildDir = path.join(__dirname, 'build')
  const stagingDir = path.join(buildDir, browser)

  ensureDir(buildDir)
  fs.rmSync(stagingDir, { recursive: true, force: true })

  fs.cpSync(path.join(__dirname, `src/${browser}/`), stagingDir, {
    recursive: true,
  })
  fs.cpSync(path.join(__dirname, 'src/common/'), path.join(stagingDir, 'common'), {
    recursive: true,
  })

  replaceInJsFiles(stagingDir, DEFAULT_HOSTNAME, hostname)

  const output = fs.createWriteStream(
    path.join(buildDir, `${browser}.zip`)
  )
  const archive = archiver('zip', {
    zlib: { level: 9 },
  })

  archive.pipe(output)
  archive.directory(stagingDir, false)
  archive.finalize()
}

const env = loadEnvFile(path.join(__dirname, '.env'))
const hostname =
  env.PIPED_HOSTNAME && env.PIPED_HOSTNAME.trim()
    ? env.PIPED_HOSTNAME.trim()
    : DEFAULT_HOSTNAME

const buildDir = path.join(__dirname, 'build')
fs.rmSync(path.join(buildDir, 'firefox'), { recursive: true, force: true })
fs.rmSync(path.join(buildDir, 'firefox.zip'), { force: true })

createZip('chrome', hostname)
