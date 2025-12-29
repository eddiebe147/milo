// Global type declarations for MILO
// Uses MiloAPI from electron/preload.ts as the source of truth

/// <reference path="../electron/preload.ts" />

import type { MiloAPI, ExecutionTarget } from '../electron/preload'

declare global {
  interface Window {
    milo: MiloAPI
  }
}

export type { ExecutionTarget }
