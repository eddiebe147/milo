import { create } from 'zustand'
import type { Category } from '../types'

interface CategoriesState {
  categories: Category[]
  activeFilter: string | null // null = show all
  isLoading: boolean
  error: string | null

  // Actions
  fetchCategories: () => Promise<void>
  setActiveFilter: (categoryId: string | null) => void
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category | null>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category | null>
  deleteCategory: (id: string) => Promise<boolean>
  reorderCategories: (orderedIds: string[]) => Promise<void>
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: [],
  activeFilter: null,
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      const categories = await window.milo.categories.getActive()
      set({ categories, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  setActiveFilter: (categoryId) => {
    set({ activeFilter: categoryId })
  },

  createCategory: async (category) => {
    try {
      const newCategory = await window.milo.categories.create(category)
      if (newCategory) {
        set((state) => ({ categories: [...state.categories, newCategory] }))
      }
      return newCategory
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const updatedCategory = await window.milo.categories.update(id, updates)
      if (updatedCategory) {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
        }))
      }
      return updatedCategory
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  deleteCategory: async (id) => {
    try {
      const success = await window.milo.categories.delete(id)
      if (success) {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          // Clear filter if we just deleted the active filter category
          activeFilter: state.activeFilter === id ? null : state.activeFilter,
        }))
      }
      return success
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  reorderCategories: async (orderedIds) => {
    try {
      await window.milo.categories.reorder(orderedIds)
      // Re-fetch to get updated sort orders
      const categories = await window.milo.categories.getActive()
      set({ categories })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))
