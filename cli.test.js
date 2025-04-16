import { describe, it, expect, vi, beforeEach } from 'vitest'
import meow from 'meow'

// Mock the gitPushPR module
vi.mock('./index.js', () => ({
  default: vi.fn()
}))

// Mock meow
vi.mock('meow', () => ({
  default: vi.fn(() => ({
    flags: {
      remote: 'origin',
      allowAll: false,
      silent: false,
      force: false,
      verify: true
    }
  }))
}))

describe('CLI', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should pass flags from meow to gitPushPR', async () => {
    // Import CLI which will immediately call gitPushPR
    const gitPushPR = (await import('./index.js')).default
    await import('./cli.js')

    // Verify gitPushPR was called with the flags from meow
    expect(gitPushPR).toHaveBeenCalledWith({
      remote: 'origin',
      allowAll: false,
      silent: false,
      force: false,
      verify: true
    })
  })

  it('should pass custom flags to gitPushPR', async () => {
    // Mock meow to return custom flags
    meow.mockReturnValueOnce({
      flags: {
        remote: 'upstream',
        allowAll: true,
        silent: true,
        force: true,
        verify: false
      }
    })

    const gitPushPR = (await import('./index.js')).default
    await import('./cli.js')

    // Verify gitPushPR was called with the custom flags
    expect(gitPushPR).toHaveBeenCalledWith({
      remote: 'upstream',
      allowAll: true,
      silent: true,
      force: true,
      verify: false
    })
  })
})
