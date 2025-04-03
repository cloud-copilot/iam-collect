import { readFileSync } from 'fs'
import { parse } from 'jsonc-parser'
import { resolve } from 'path'
import { TopLevelConfig } from './config.js'

/**
 * Gets the current directory the process is running in
 *
 * @returns the current directory
 */
function getCurrentDirectory() {
  return process.cwd()
}

/**
 * Load config files from the given paths
 *
 * @param paths the paths to the config files
 * @returns the loaded config files
 */
export function loadConfigFiles(paths: string[]): TopLevelConfig[] {
  return paths.map(loadConfigFile)
}

/**
 * Load a config file from the given path
 *
 * @param path the path to the config file
 * @returns the loaded config file
 */
export function loadConfigFile(path: string): TopLevelConfig {
  const absPath = getAbsolutePath(path)
  const contents = readFileSync(absPath, 'utf-8')
  const parsed = parse(contents)
  return parsed
}

/**
 * Get the absolute path to a configuration file
 *
 * @param path - The path to the configuration file
 * @returns the absolute path to the configuration file
 */
function getAbsolutePath(path: string) {
  if (path.startsWith('.')) {
    return resolve(getCurrentDirectory(), path)
  }

  return resolve(path)
}
