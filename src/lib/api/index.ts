import { ElectronAdapter } from './ElectronAdapter'
import { WebAdapter } from './WebAdapter'
import { PlatformAdapter } from './types'

/**
 * Detect current environment
 */
const isElectron = typeof window !== 'undefined' && window.milo !== undefined

/**
 * Export the appropriate adapter based on environment
 */
export const milo: PlatformAdapter = isElectron ? ElectronAdapter : WebAdapter

// For convenience
export default milo
