import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(process.cwd(), 'dist/client')
const assetsDir = join(distDir, 'assets')

if (!existsSync(assetsDir)) {
  console.error('Assets directory not found. Run `npm run build` first.')
  process.exit(1)
}

const files = readdirSync(assetsDir)
const jsFiles = files.filter(f => f.endsWith('.js'))
const cssFiles = files.filter(f => f.endsWith('.css'))

// Find the largest JS file (main bundle)
let mainJs = ''
let maxSize = 0
for (const file of jsFiles) {
  const size = statSync(join(assetsDir, file)).size
  if (size > maxSize) {
    maxSize = size
    mainJs = file
  }
}

// Find the largest CSS file (main styles)
let mainCss = ''
maxSize = 0
for (const file of cssFiles) {
  const size = statSync(join(assetsDir, file)).size
  if (size > maxSize) {
    maxSize = size
    mainCss = file
  }
}

if (!mainJs) {
  console.error('No JS bundle found in assets')
  process.exit(1)
}

console.log(`Found main JS bundle: ${mainJs}`)
console.log(`Found main CSS bundle: ${mainCss || 'none'}`)

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>The Order-Reagizo Service Company</title>
    ${mainCss ? `<link rel="stylesheet" crossorigin href="/assets/${mainCss}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/${mainJs}"></script>
  </body>
</html>
`

writeFileSync(join(distDir, 'index.html'), html)
console.log('✅ Generated index.html for Capacitor')
