export const LogLevels = ['error', 'warn', 'info', 'debug', 'trace'] as const

export type LogLevel = (typeof LogLevels)[number]

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
}

let CURRENT_LEVEL_NAME: LogLevel = 'warn'
let CURRENT_LEVEL = LEVELS[CURRENT_LEVEL_NAME]

export function setLogLevel(level: LogLevel) {
  if (LEVELS[level] === undefined) {
    throw new Error(`Invalid log level: ${level}`)
  }
  CURRENT_LEVEL_NAME = level
  CURRENT_LEVEL = LEVELS[level]
}

// helper to serialize non-object args into a single string
function serializeArgs(args: unknown[]): string {
  return args
    .map((a) =>
      typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)
    )
    .join(' ')
}

// core log function: level check → prefix → JSON output
function logAt(level: LogLevel, args: unknown[]) {
  if (LEVELS[level] > CURRENT_LEVEL) return

  // Base log entry
  const entry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    level
  }

  // Separate object args and message args
  const objectArgs = args.filter((a) => typeof a === 'object' && a !== null)
  const messageArgs = args.filter((a) => typeof a !== 'object' || a === null)

  // Merge all object arguments into the entry
  for (const obj of objectArgs) {
    Object.assign(entry, obj)
  }

  const msg = serializeArgs(messageArgs)
  if (msg) {
    entry.message = msg
  }

  const line = JSON.stringify(entry)

  switch (level) {
    case 'error':
      return console.error(line)
    case 'warn':
      return console.warn(line)
    case 'info':
      return console.info(line)
    default:
      return console.log(line)
  }
}

export const log = {
  error: (...args: unknown[]) => logAt('error', args),
  warn: (...args: unknown[]) => logAt('warn', args),
  info: (...args: unknown[]) => logAt('info', args),
  debug: (...args: unknown[]) => logAt('debug', args),
  trace: (...args: unknown[]) => logAt('trace', args)
}
