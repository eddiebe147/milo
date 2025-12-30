import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * Modal types managed by this context
 */
export type ModalType =
  | 'addTask'
  | 'apiSettings'
  | 'themeSettings'
  | 'morningBriefing'
  | 'eveningReview'

/**
 * ModalContext value interface
 */
export interface ModalContextValue {
  /** Currently open modal, null if none */
  openModal: ModalType | null
  /** Open a specific modal type */
  openModalWithType: (type: ModalType) => void
  /** Close the currently open modal */
  closeModal: () => void
  /** Check if a specific modal type is open */
  isOpen: (type: ModalType) => boolean
}

/**
 * ModalContext - Centralized modal state management
 *
 * Replaces custom window events with a proper React Context.
 * Only one modal can be open at a time.
 *
 * Usage:
 * ```tsx
 * // In a component
 * const { openModalWithType, closeModal, isOpen } = useModal()
 *
 * // Open a modal
 * openModalWithType('apiSettings')
 *
 * // Check if modal is open
 * if (isOpen('apiSettings')) { ... }
 *
 * // Close modal
 * closeModal()
 * ```
 */
const ModalContext = createContext<ModalContextValue | undefined>(undefined)

interface ModalProviderProps {
  children: React.ReactNode
}

/**
 * ModalProvider - Provides modal state to the app
 *
 * Should wrap the entire application in App.tsx
 */
export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [openModal, setOpenModal] = useState<ModalType | null>(null)

  const openModalWithType = useCallback((type: ModalType) => {
    setOpenModal(type)
  }, [])

  const closeModal = useCallback(() => {
    setOpenModal(null)
  }, [])

  const isOpen = useCallback((type: ModalType) => {
    return openModal === type
  }, [openModal])

  const value: ModalContextValue = {
    openModal,
    openModalWithType,
    closeModal,
    isOpen,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}

/**
 * useModal - Hook to access modal context
 *
 * @throws {Error} If used outside of ModalProvider
 */
export const useModal = (): ModalContextValue => {
  const context = useContext(ModalContext)

  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }

  return context
}
