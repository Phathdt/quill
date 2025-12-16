import { createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs'
import { appDataDir, join } from '@tauri-apps/api/path'

import { STORAGE_DATA_DIR, STORAGE_HISTORY_DIR } from './const'

/**
 * Get the app data directory path
 */
async function getDataPath(...segments: string[]): Promise<string> {
  const appData = await appDataDir()
  return join(appData, STORAGE_DATA_DIR, ...segments)
}

/**
 * Ensure directory exists
 */
async function ensureDir(path: string): Promise<void> {
  const dirExists = await exists(path)
  if (!dirExists) {
    await createDir(path, { recursive: true })
  }
}

/**
 * Read JSON file from app data
 */
export async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = await getDataPath(filename)
    const fileExists = await exists(filePath)
    if (!fileExists) return null

    const content = await readTextFile(filePath)
    return JSON.parse(content) as T
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error)
    return null
  }
}

/**
 * Write JSON file to app data
 */
export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  try {
    const filePath = await getDataPath(filename)
    const dirPath = await getDataPath()
    await ensureDir(dirPath)

    await writeTextFile(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`Failed to write ${filename}:`, error)
    throw error
  }
}

/**
 * Read workspace history from file
 */
export async function readWorkspaceHistory(workspaceId: string): Promise<unknown[]> {
  try {
    const historyDir = await getDataPath(STORAGE_HISTORY_DIR)
    await ensureDir(historyDir)

    const filePath = await join(historyDir, `${workspaceId}.json`)
    const fileExists = await exists(filePath)
    if (!fileExists) return []

    const content = await readTextFile(filePath)
    return JSON.parse(content)
  } catch (error) {
    console.error(`Failed to read history for workspace ${workspaceId}:`, error)
    return []
  }
}

/**
 * Write workspace history to file
 */
export async function writeWorkspaceHistory(workspaceId: string, history: unknown[]): Promise<void> {
  try {
    const historyDir = await getDataPath(STORAGE_HISTORY_DIR)
    await ensureDir(historyDir)

    const filePath = await join(historyDir, `${workspaceId}.json`)
    await writeTextFile(filePath, JSON.stringify(history, null, 2))
  } catch (error) {
    console.error(`Failed to write history for workspace ${workspaceId}:`, error)
    throw error
  }
}
