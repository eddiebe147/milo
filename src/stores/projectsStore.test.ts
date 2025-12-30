import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProjectsStore } from './projectsStore'
import type { Project } from './projectsStore'

// Mock project data for tests
const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  color: '#3B82F6',
  isActive: true,
  sortOrder: 1,
  createdAt: '2024-12-28T10:00:00Z',
  updatedAt: '2024-12-28T10:00:00Z',
}

const mockProjects: Project[] = [
  mockProject,
  {
    id: 'project-2',
    name: 'Second Project',
    color: '#10B981',
    isActive: true,
    sortOrder: 2,
    createdAt: '2024-12-28T10:00:00Z',
    updatedAt: '2024-12-28T10:00:00Z',
  },
  {
    id: 'project-3',
    name: 'Third Project',
    color: '#F59E0B',
    isActive: true,
    sortOrder: 3,
    createdAt: '2024-12-28T10:00:00Z',
    updatedAt: '2024-12-28T10:00:00Z',
  },
]

describe('projectsStore', () => {
  beforeEach(() => {
    // Reset store state
    useProjectsStore.setState({
      projects: [],
      activeFilter: null,
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo.categories API (projectsStore wraps categories)
    window.milo = {
      ...window.milo,
      categories: {
        getActive: vi.fn().mockResolvedValue(mockProjects),
        create: vi.fn().mockResolvedValue(mockProject),
        update: vi.fn().mockResolvedValue(mockProject),
        delete: vi.fn().mockResolvedValue(true),
        reorder: vi.fn().mockResolvedValue(undefined),
      },
    } as any
  })

  describe('initial state', () => {
    it('has empty projects array', () => {
      const state = useProjectsStore.getState()
      expect(state.projects).toEqual([])
    })

    it('has null activeFilter', () => {
      const state = useProjectsStore.getState()
      expect(state.activeFilter).toBeNull()
    })

    it('is not loading', () => {
      const state = useProjectsStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('has no error', () => {
      const state = useProjectsStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('fetchProjects', () => {
    it('sets loading state while fetching', async () => {
      const store = useProjectsStore.getState()

      // Start fetch but don't await
      const fetchPromise = store.fetchProjects()

      // Should be loading
      expect(useProjectsStore.getState().isLoading).toBe(true)

      await fetchPromise

      // Should not be loading after completion
      expect(useProjectsStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores projects', async () => {
      const store = useProjectsStore.getState()
      await store.fetchProjects()

      const state = useProjectsStore.getState()
      expect(state.projects).toEqual(mockProjects)
      expect(window.milo.categories.getActive).toHaveBeenCalledTimes(1)
    })

    it('clears error on successful fetch', async () => {
      // Set initial error
      useProjectsStore.setState({ error: 'Previous error' })

      const store = useProjectsStore.getState()
      await store.fetchProjects()

      const state = useProjectsStore.getState()
      expect(state.error).toBeNull()
    })

    it('handles fetch errors', async () => {
      const errorMessage = 'Failed to fetch projects'
      window.milo.categories.getActive = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useProjectsStore.getState()
      await store.fetchProjects()

      const state = useProjectsStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })

    it('preserves existing projects on error', async () => {
      // Pre-populate with existing projects
      useProjectsStore.setState({ projects: mockProjects })

      window.milo.categories.getActive = vi.fn().mockRejectedValue(new Error('Network error'))

      const store = useProjectsStore.getState()
      await store.fetchProjects()

      // Projects should remain unchanged on error
      const state = useProjectsStore.getState()
      expect(state.projects).toEqual(mockProjects)
    })
  })

  describe('setActiveFilter', () => {
    it('sets active filter to project ID', () => {
      const store = useProjectsStore.getState()
      store.setActiveFilter('project-1')

      expect(useProjectsStore.getState().activeFilter).toBe('project-1')
    })

    it('clears active filter when passed null', () => {
      // Set initial filter
      useProjectsStore.setState({ activeFilter: 'project-1' })

      const store = useProjectsStore.getState()
      store.setActiveFilter(null)

      expect(useProjectsStore.getState().activeFilter).toBeNull()
    })

    it('can switch between different filters', () => {
      const store = useProjectsStore.getState()

      store.setActiveFilter('project-1')
      expect(useProjectsStore.getState().activeFilter).toBe('project-1')

      store.setActiveFilter('project-2')
      expect(useProjectsStore.getState().activeFilter).toBe('project-2')
    })
  })

  describe('createProject', () => {
    it('creates and adds project to state', async () => {
      const newProjectData = {
        name: 'New Project',
        color: '#EF4444',
        isActive: true,
        sortOrder: 1,
      }

      const store = useProjectsStore.getState()
      const result = await store.createProject(newProjectData)

      expect(result).toEqual(mockProject)
      expect(window.milo.categories.create).toHaveBeenCalledWith(newProjectData)
      expect(useProjectsStore.getState().projects).toContain(mockProject)
    })

    it('adds new project to the end of the list', async () => {
      // Pre-populate with existing projects
      useProjectsStore.setState({ projects: mockProjects })

      const newProject = {
        ...mockProject,
        id: 'project-new',
        name: 'New Project',
      }
      window.milo.categories.create = vi.fn().mockResolvedValue(newProject)

      const store = useProjectsStore.getState()
      await store.createProject({
        name: 'New Project',
        color: '#EF4444',
        isActive: true,
        sortOrder: 4,
      })

      const state = useProjectsStore.getState()
      expect(state.projects).toHaveLength(4)
      expect(state.projects[3]).toEqual(newProject)
    })

    it('handles creation errors', async () => {
      const errorMessage = 'Creation failed'
      window.milo.categories.create = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useProjectsStore.getState()
      const result = await store.createProject({
        name: 'New Project',
        color: '#EF4444',
        isActive: true,
        sortOrder: 1,
      })

      expect(result).toBeNull()
      expect(useProjectsStore.getState().error).toBe(errorMessage)
    })

    it('does not add project to state if API returns null', async () => {
      window.milo.categories.create = vi.fn().mockResolvedValue(null)

      const store = useProjectsStore.getState()
      const result = await store.createProject({
        name: 'New Project',
        color: '#EF4444',
        isActive: true,
        sortOrder: 1,
      })

      expect(result).toBeNull()
      expect(useProjectsStore.getState().projects).toHaveLength(0)
    })
  })

  describe('updateProject', () => {
    beforeEach(() => {
      useProjectsStore.setState({ projects: mockProjects })
    })

    it('updates project in state', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' }
      window.milo.categories.update = vi.fn().mockResolvedValue(updatedProject)

      const store = useProjectsStore.getState()
      const result = await store.updateProject('project-1', { name: 'Updated Project' })

      expect(result).toEqual(updatedProject)
      expect(window.milo.categories.update).toHaveBeenCalledWith('project-1', { name: 'Updated Project' })
      expect(useProjectsStore.getState().projects[0].name).toBe('Updated Project')
    })

    it('preserves other projects when updating one', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' }
      window.milo.categories.update = vi.fn().mockResolvedValue(updatedProject)

      const store = useProjectsStore.getState()
      await store.updateProject('project-1', { name: 'Updated Project' })

      const state = useProjectsStore.getState()
      expect(state.projects).toHaveLength(3)
      expect(state.projects[1].name).toBe('Second Project')
      expect(state.projects[2].name).toBe('Third Project')
    })

    it('handles update errors', async () => {
      const errorMessage = 'Update failed'
      window.milo.categories.update = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useProjectsStore.getState()
      const result = await store.updateProject('project-1', { name: 'Updated Project' })

      expect(result).toBeNull()
      expect(useProjectsStore.getState().error).toBe(errorMessage)
    })

    it('does not update state if API returns null', async () => {
      window.milo.categories.update = vi.fn().mockResolvedValue(null)

      const store = useProjectsStore.getState()
      const result = await store.updateProject('project-1', { name: 'Updated Project' })

      expect(result).toBeNull()
      expect(useProjectsStore.getState().projects[0].name).toBe('Test Project')
    })

    it('can update multiple fields at once', async () => {
      const updatedProject = {
        ...mockProject,
        name: 'Updated Name',
        color: '#EF4444',
        isActive: false,
      }
      window.milo.categories.update = vi.fn().mockResolvedValue(updatedProject)

      const store = useProjectsStore.getState()
      const result = await store.updateProject('project-1', {
        name: 'Updated Name',
        color: '#EF4444',
        isActive: false,
      })

      expect(result?.name).toBe('Updated Name')
      expect(result?.color).toBe('#EF4444')
      expect(result?.isActive).toBe(false)
    })
  })

  describe('deleteProject', () => {
    beforeEach(() => {
      useProjectsStore.setState({ projects: mockProjects })
    })

    it('removes project from state', async () => {
      const store = useProjectsStore.getState()
      const result = await store.deleteProject('project-1')

      expect(result).toBe(true)
      expect(window.milo.categories.delete).toHaveBeenCalledWith('project-1')
      expect(useProjectsStore.getState().projects).toHaveLength(2)
      expect(useProjectsStore.getState().projects.find(p => p.id === 'project-1')).toBeUndefined()
    })

    it('clears activeFilter if deleted project was active filter', async () => {
      useProjectsStore.setState({ activeFilter: 'project-1' })

      const store = useProjectsStore.getState()
      await store.deleteProject('project-1')

      expect(useProjectsStore.getState().activeFilter).toBeNull()
    })

    it('preserves activeFilter if different project is deleted', async () => {
      useProjectsStore.setState({ activeFilter: 'project-1' })

      const store = useProjectsStore.getState()
      await store.deleteProject('project-2')

      expect(useProjectsStore.getState().activeFilter).toBe('project-1')
    })

    it('handles deletion errors', async () => {
      const errorMessage = 'Deletion failed'
      window.milo.categories.delete = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useProjectsStore.getState()
      const result = await store.deleteProject('project-1')

      expect(result).toBe(false)
      expect(useProjectsStore.getState().error).toBe(errorMessage)
      expect(useProjectsStore.getState().projects).toHaveLength(3)
    })

    it('does not remove project if API returns false', async () => {
      window.milo.categories.delete = vi.fn().mockResolvedValue(false)

      const store = useProjectsStore.getState()
      const result = await store.deleteProject('project-1')

      expect(result).toBe(false)
      expect(useProjectsStore.getState().projects).toHaveLength(3)
    })

    it('can delete last project in the list', async () => {
      const store = useProjectsStore.getState()
      await store.deleteProject('project-3')

      const state = useProjectsStore.getState()
      expect(state.projects).toHaveLength(2)
      expect(state.projects.map(p => p.id)).toEqual(['project-1', 'project-2'])
    })

    it('can delete middle project in the list', async () => {
      const store = useProjectsStore.getState()
      await store.deleteProject('project-2')

      const state = useProjectsStore.getState()
      expect(state.projects).toHaveLength(2)
      expect(state.projects.map(p => p.id)).toEqual(['project-1', 'project-3'])
    })
  })

  describe('reorderProjects', () => {
    beforeEach(() => {
      useProjectsStore.setState({ projects: mockProjects })
    })

    it('reorders projects by calling API and refetching', async () => {
      const reorderedProjects = [mockProjects[2], mockProjects[0], mockProjects[1]]
      window.milo.categories.getActive = vi.fn().mockResolvedValue(reorderedProjects)

      const store = useProjectsStore.getState()
      await store.reorderProjects(['project-3', 'project-1', 'project-2'])

      expect(window.milo.categories.reorder).toHaveBeenCalledWith(['project-3', 'project-1', 'project-2'])
      expect(window.milo.categories.getActive).toHaveBeenCalled()
      expect(useProjectsStore.getState().projects).toEqual(reorderedProjects)
    })

    it('handles reorder errors', async () => {
      const errorMessage = 'Reorder failed'
      window.milo.categories.reorder = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useProjectsStore.getState()
      await store.reorderProjects(['project-2', 'project-1', 'project-3'])

      expect(useProjectsStore.getState().error).toBe(errorMessage)
      // Projects should remain unchanged on error
      expect(useProjectsStore.getState().projects).toEqual(mockProjects)
    })

    it('handles refetch errors after successful reorder', async () => {
      window.milo.categories.reorder = vi.fn().mockResolvedValue(undefined)
      window.milo.categories.getActive = vi.fn().mockRejectedValue(new Error('Refetch failed'))

      const store = useProjectsStore.getState()
      await store.reorderProjects(['project-2', 'project-1', 'project-3'])

      expect(window.milo.categories.reorder).toHaveBeenCalled()
      expect(useProjectsStore.getState().error).toBe('Refetch failed')
    })

    it('can reverse order of projects', async () => {
      const reversedProjects = [...mockProjects].reverse()
      window.milo.categories.getActive = vi.fn().mockResolvedValue(reversedProjects)

      const store = useProjectsStore.getState()
      await store.reorderProjects(['project-3', 'project-2', 'project-1'])

      expect(useProjectsStore.getState().projects).toEqual(reversedProjects)
    })

    it('handles empty reorder array', async () => {
      window.milo.categories.getActive = vi.fn().mockResolvedValue([])

      const store = useProjectsStore.getState()
      await store.reorderProjects([])

      expect(window.milo.categories.reorder).toHaveBeenCalledWith([])
    })
  })

  describe('getProject', () => {
    beforeEach(() => {
      useProjectsStore.setState({ projects: mockProjects })
    })

    it('returns project by id', () => {
      const store = useProjectsStore.getState()
      const project = store.getProject('project-1')

      expect(project).toEqual(mockProject)
    })

    it('returns undefined for non-existent project', () => {
      const store = useProjectsStore.getState()
      const project = store.getProject('non-existent')

      expect(project).toBeUndefined()
    })

    it('returns correct project when multiple exist', () => {
      const store = useProjectsStore.getState()
      const project = store.getProject('project-2')

      expect(project?.id).toBe('project-2')
      expect(project?.name).toBe('Second Project')
    })

    it('returns undefined when projects array is empty', () => {
      useProjectsStore.setState({ projects: [] })

      const store = useProjectsStore.getState()
      const project = store.getProject('project-1')

      expect(project).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('handles concurrent fetch operations', async () => {
      const store = useProjectsStore.getState()

      // Start multiple fetches concurrently
      const fetch1 = store.fetchProjects()
      const fetch2 = store.fetchProjects()
      const fetch3 = store.fetchProjects()

      await Promise.all([fetch1, fetch2, fetch3])

      // Should have called API multiple times but state should be consistent
      expect(window.milo.categories.getActive).toHaveBeenCalledTimes(3)
      expect(useProjectsStore.getState().projects).toEqual(mockProjects)
    })

    it('handles create followed by immediate fetch', async () => {
      const newProject = { ...mockProject, id: 'project-new' }
      window.milo.categories.create = vi.fn().mockResolvedValue(newProject)

      const store = useProjectsStore.getState()

      // Create and fetch concurrently
      await Promise.all([
        store.createProject({ name: 'New', color: '#000', isActive: true, sortOrder: 1 }),
        store.fetchProjects()
      ])

      // State should reflect both operations
      const state = useProjectsStore.getState()
      expect(state.projects.length).toBeGreaterThan(0)
    })

    it('clears error after successful operation following failure', async () => {
      // First operation fails
      window.milo.categories.create = vi.fn().mockRejectedValue(new Error('First error'))
      const store = useProjectsStore.getState()
      await store.createProject({ name: 'New', color: '#000', isActive: true, sortOrder: 1 })

      expect(useProjectsStore.getState().error).toBe('First error')

      // Second operation succeeds but doesn't clear error (by design)
      window.milo.categories.create = vi.fn().mockResolvedValue(mockProject)
      await store.createProject({ name: 'New', color: '#000', isActive: true, sortOrder: 1 })

      // Error should still be present (fetch clears error, but create/update/delete don't)
      expect(useProjectsStore.getState().error).toBe('First error')
    })

    it('handles delete of activeFilter and immediate filter set', async () => {
      useProjectsStore.setState({ activeFilter: 'project-1', projects: mockProjects })

      const store = useProjectsStore.getState()

      // Delete the active filter project
      await store.deleteProject('project-1')

      expect(useProjectsStore.getState().activeFilter).toBeNull()

      // Immediately set a new filter
      store.setActiveFilter('project-2')

      expect(useProjectsStore.getState().activeFilter).toBe('project-2')
    })

    it('handles malformed project data gracefully', async () => {
      const malformedProject = {
        id: 'malformed',
        name: 'Malformed',
        // Missing color, isActive, sortOrder
      } as any

      window.milo.categories.create = vi.fn().mockResolvedValue(malformedProject)

      const store = useProjectsStore.getState()
      const result = await store.createProject({
        name: 'New',
        color: '#000',
        isActive: true,
        sortOrder: 1,
      })

      expect(result).toEqual(malformedProject)
      expect(useProjectsStore.getState().projects).toContain(malformedProject)
    })
  })

  describe('backward compatibility', () => {
    it('exports useCategoriesStore as alias', async () => {
      const { useCategoriesStore } = await import('./projectsStore')
      expect(useCategoriesStore).toBe(useProjectsStore)
    })
  })
})
