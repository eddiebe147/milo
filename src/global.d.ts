// Global type declarations for MILO
// Uses MiloAPI from electron/preload.ts as the source of truth

/// <reference path="../electron/preload.ts" />

import type { MiloAPI, ExecutionTarget } from '../electron/preload'

// Image imports
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare global {
  interface Window {
    milo: MiloAPI
  }
}

export type { ExecutionTarget }
