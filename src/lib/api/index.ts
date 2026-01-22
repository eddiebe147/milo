import { createElectronAdapter } from './ElectronAdapter'
import { WebAdapter } from './WebAdapter'
import { PlatformAdapter } from './types'

/**
 * Detect current environment
 * Check if window.milo exists (only present in Electron via preload script)
 */
const isElectron = typeof window !== 'undefined' && window.milo !== undefined

/**
 * Export the appropriate adapter based on environment
 * 
 * The ElectronAdapter is created via factory function to prevent
 * window.milo from being accessed during module evaluation on web.
 */
export const milo: PlatformAdapter = isElectron ? createElectronAdapter() : WebAdapter

// For convenience
export default milo
