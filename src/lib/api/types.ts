import { MiloAPI } from '../../../electron/preload'

/**
 * Re-export the MiloAPI interface from preload for use in the renderer
 */
export type { MiloAPI } from '../../../electron/preload'

/**
 * Platform adapter interface
 */
export interface PlatformAdapter extends MiloAPI {
    platform: 'electron' | 'web' | 'mobile'
}
