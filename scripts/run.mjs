import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const backendDir = join(root, 'backend')
const frontendDir = join(root, 'frontend')
const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'

// 依赖清单指纹：清单内容变了就重装依赖，不再只看目录是否存在。
const HASH_MARKER = '.deps-hash'
const SEPARATOR = '\u0000--deps-file--\u0000'

function depsHash(files) {
  const digest = createHash('sha256')
  for (const file of files) {
    // 用相对仓库根目录的路径做标识，与 Python 版 deps_hash.py 保持一致；
    // 两个启动脚本都写同一个标记文件，路径写法必须相同，否则会互相触发重装。
    const label = relative(root, file).replace(/\\/g, '/')
    digest.update(SEPARATOR)
    digest.update(label)
    digest.update(SEPARATOR)
    if (existsSync(file)) digest.update(readFileSync(file))
  }
  return digest.digest('hex')
}

// 判断是否需要安装；需要时返回写入指纹标记的函数，安装成功后才调用，
// 避免安装失败却留下"已是最新"的假标记。标记文件放在依赖目录内（已被 git 忽略）。
function depsStatus(markerDir, files, label) {
  const marker = join(markerDir, HASH_MARKER)
  const current = depsHash(files)
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === current) {
    return { needed: false, commit: () => {} }
  }
  console.log(`[run] ${label}依赖清单已变更，需要重新安装…`)
  return { needed: true, commit: () => writeFileSync(marker, current) }
}

const argv = process.argv.slice(2)
const buildOnly = argv.includes('--build-only')
const noBuild = argv.includes('--no-build')
const noOpen = argv.includes('--no-open')
const portIndex = argv.indexOf('--port')
const port =
  portIndex !== -1 ? argv[portIndex + 1] : process.env.PORT || '8001'

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: isWindows })
  if (result.status !== 0) {
    console.error(`\n[run] 命令执行失败：${command} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

function venvPython() {
  const candidates = isWindows
    ? [join(backendDir, '.venv', 'Scripts', 'python.exe')]
    : [join(backendDir, '.venv', 'bin', 'python')]
  return candidates.find(existsSync)
}

function ensureBackend() {
  const requirements = join(backendDir, 'requirements.txt')
  const existing = venvPython()

  if (!existing) {
    console.log('[run] 未找到后端虚拟环境，正在创建 backend/.venv…')
    run('python', ['-m', 'venv', '.venv'], backendDir)
    const created = venvPython()
    if (!created) {
      console.error('[run] 创建虚拟环境失败，请确认已安装 Python 3.10+。')
      process.exit(1)
    }
    const status = depsStatus(join(backendDir, '.venv'), [requirements], '后端')
    console.log('[run] 正在安装后端依赖…')
    run(created, ['-m', 'pip', 'install', '-r', 'requirements.txt'], backendDir)
    status.commit()
    return created
  }

  const status = depsStatus(join(backendDir, '.venv'), [requirements], '后端')
  if (status.needed) {
    console.log('[run] 正在更新后端依赖…')
    run(existing, ['-m', 'pip', 'install', '-r', 'requirements.txt'], backendDir)
    status.commit()
  }
  return existing
}

function ensureFrontend() {
  const lockfile = join(frontendDir, 'package-lock.json')
  const nodeModules = join(frontendDir, 'node_modules')
  const status = depsStatus(nodeModules, [lockfile], '前端')

  if (!existsSync(nodeModules) || status.needed) {
    console.log('[run] 正在安装前端依赖…')
    run(npmCmd, ['install'], frontendDir)
    status.commit()
  }
}

function buildFrontend() {
  console.log('[run] 构建前端…')
  run(npmCmd, ['run', 'build'], frontendDir)
}

function openBrowser(url) {
  const options = { detached: true, stdio: 'ignore', shell: isWindows }
  let command
  let args
  if (isWindows) {
    command = 'cmd'
    args = ['/c', 'start', '', url]
  } else if (process.platform === 'darwin') {
    command = 'open'
    args = [url]
  } else {
    command = 'xdg-open'
    args = [url]
  }
  try {
    const child = spawn(command, args, options)
    child.on('error', () => {
      console.log(`[run] 无法自动打开浏览器，请手动访问 ${url}`)
    })
    child.unref()
  } catch {
    console.log(`[run] 无法自动打开浏览器，请手动访问 ${url}`)
  }
}

function startBackend(python) {
  const url = `http://127.0.0.1:${port}`
  console.log(`[run] 启动后端，前端由后端托管 → ${url}`)
  const child = spawn(
    python,
    [
      '-m',
      'uvicorn',
      'app.main:app',
      '--app-dir',
      backendDir,
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    { cwd: backendDir, stdio: 'inherit' },
  )

  if (!noOpen) {
    setTimeout(() => {
      console.log(`[run] 已在浏览器打开 ${url}`)
      openBrowser(url)
    }, 1500)
  }

  const shutdown = () => {
    if (!child.killed) child.kill()
  }
  process.on('SIGINT', () => {
    shutdown()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    shutdown()
    process.exit(0)
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

if (buildOnly) {
  ensureFrontend()
  buildFrontend()
  console.log('[run] 构建完成，产物位于 frontend/dist。')
  process.exit(0)
}

const python = ensureBackend()
if (!noBuild) {
  ensureFrontend()
  buildFrontend()
}
startBackend(python)
