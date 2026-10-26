import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distRoot = join(projectRoot, 'dist')
const host = '127.0.0.1'
const port = 4174
const url = `http://${host}:${port}/`

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

function openBrowser() {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true })
  child.unref()
}

if (!existsSync(join(distRoot, 'index.html'))) {
  console.error('La version compilée est absente. Exécutez d’abord : pnpm build')
  process.exit(1)
}

const server = createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? '/', url).pathname)
  const relativePath = normalize(requestPath).replace(/^[/\\]+/, '')
  let filePath = resolve(distRoot, relativePath || 'index.html')

  if (!filePath.startsWith(distRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distRoot, 'index.html')
  }

  response.setHeader('Content-Type', contentTypes[extname(filePath)] ?? 'application/octet-stream')
  response.setHeader('Cache-Control', 'no-cache')
  createReadStream(filePath)
    .on('error', () => {
      response.statusCode = 500
      response.end('Unable to read the application file.')
    })
    .pipe(response)
})

server.listen(port, host, () => {
  console.log(`SignBridge est accessible sur ${url}`)
  console.log('Gardez cette fenêtre ouverte. Appuyez sur Ctrl+C pour arrêter le site.')
  openBrowser()
})

