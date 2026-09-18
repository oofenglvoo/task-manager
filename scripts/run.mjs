import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const backendDir = join(root, 'backend')
const frontendDir = join(root, 'frontend')
const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'

const argv = process.argv.slice(2)
const buildOnly = argv.includes('--build-only')
const noBuild = argv.includes('--no-build')
const portIndex = argv.indexOf('--port')
const port =
  portIndex !== -1 ? argv[portIndex + 1] : process.env.PORT || '8000'

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
  const existing = venvPython()
  if (existing) return existing
  console.log('[run] 未找到后端虚拟环境，正在创建 backend/.venv 并安装依赖…')
  run('python', ['-m', 'venv', '.venv'], backendDir)
  const created = venvPython()
  if (!created) {
    console.error('[run] 创建虚拟环境失败，请确认已安装 Python 3.10+。')
    process.exit(1)
  }
  run(created, ['-m', 'pip', 'install', '-r', 'requirements.txt'], backendDir)
  return created
}

function ensureFrontend() {
  if (existsSync(join(frontendDir, 'node_modules'))) return
  console.log('[run] 未找到前端依赖，正在执行 npm install…')
  run(npmCmd, ['install'], frontendDir)
}

function buildFrontend() {
  console.log('[run] 构建前端…')
  run(npmCmd, ['run', 'build'], frontendDir)
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
