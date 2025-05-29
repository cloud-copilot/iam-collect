import * as fs from 'fs'
import * as path from 'path'

interface LogEntry {
  timestamp: string
  level: string
  workerId?: number
  service?: string
  accountId?: string
  region?: string
  sync?: string
  message: string
}

interface JobKey {
  service: string
  accountId: string
  region: string
  sync: string
}

type KeyString = string

function keyToString(k: JobKey): KeyString {
  return [k.service, k.accountId, k.region, k.sync].join('|')
}

function stringToKey(s: KeyString): JobKey {
  const [service, accountId, region, sync] = s.split('|')
  return { service, accountId, region, sync }
}

function parseLogs(filePath: string): LogEntry[] {
  const raw = fs.readFileSync(filePath, 'utf8')
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LogEntry)
}

function analyzeJobs(entries: LogEntry[]) {
  const startTimes = new Map<KeyString, Date>()
  const finishTimes = new Map<KeyString, Date>()
  const fmt = (ts: string) => new Date(ts)

  for (const e of entries) {
    const keyProps: Partial<JobKey> = {
      service: e.service,
      accountId: e.accountId,
      region: e.region ?? '', // global jobs will have empty region
      sync: e.sync
    }
    // only consider entries with a full set of job identifiers
    if (!keyProps.service || !keyProps.accountId || !keyProps.sync) {
      continue
    }
    const keyStr = keyToString(keyProps as JobKey)
    const when = fmt(e.timestamp)

    if (e.message.includes('Executing') && e.message.includes('sync')) {
      // first start time wins
      if (!startTimes.has(keyStr)) {
        startTimes.set(keyStr, when)
      }
    } else if (e.message.includes('Finished') && e.message.includes('sync')) {
      finishTimes.set(keyStr, when)
    }
  }

  // 1) Jobs that started but didn't finish
  const incomplete = Array.from(startTimes.keys())
    .filter((k) => !finishTimes.has(k))
    .map(stringToKey)

  // 2) Compute durations for completed jobs
  const durations = Array.from(startTimes.entries())
    .filter(([k]) => finishTimes.has(k))
    .map(([k, start]) => {
      const finish = finishTimes.get(k)!
      const deltaSec = (finish.getTime() - start.getTime()) / 1000
      return { ...stringToKey(k), durationSec: deltaSec }
    })

  return { incomplete, durations }
}

/**
 * Analyze the provided log file for job execution times and incomplete jobs.
 *
 * @param logFilePath the path to the log file to analyze
 * @returns true if all jobs completed successfully, false if there are incomplete jobs
 */
export async function conductLogAnalysis(logFilePath: string): Promise<boolean> {
  const logFile = path.resolve(logFilePath)
  const entries = parseLogs(logFile)
  const { incomplete, durations } = analyzeJobs(entries)

  if (incomplete.length > 0) {
    console.log('\n🔴 Incomplete Jobs:')
    incomplete.forEach((j) => {
      console.log(`  • ${j.service} | ${j.accountId} | ${j.region} | ${j.sync}`)
    })
  }

  console.log('\n⏱️  Job Durations (seconds):')
  durations.forEach((d) => {
    console.log(
      `  • ${d.service} | ${d.accountId} | ${d.region} | ${d.sync}: ${d.durationSec.toFixed(3)}s`
    )
  })

  return incomplete.length === 0
}
