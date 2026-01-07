// Global type declarations for MILO

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

declare module '*.webp' {
  const src: string
  export default src
}

// Global window extension
interface Window {
  milo: any // We use the abstracted milo from @/lib/api now, but window.milo might still exist in Electron
}
