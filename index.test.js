import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'

vi.mock('ora', () => {
  return {
    default: vi.fn(() => ({
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      render: vi.fn().mockReturnThis()
    }))
  }
})

vi.mock('open', () => ({
  default: vi.fn()
}))

vi.mock('shelljs', () => ({
  exec: vi.fn().mockImplementation((cmd, options, callback) => {
    if (cmd.includes('git remote get-url')) {
      return { stdout: 'https://github.com/user/repo.git' }
    }

    // Handle async exec for git push
    if (options && options.async) {
      const mockChild = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              // Simulate some stdout data
              setTimeout(() => handler(Buffer.from('Everything up-to-date\n')), 10)
            }
          })
        },
        stderr: {
          on: vi.fn((event, handler) => {
            // No stderr by default
          })
        },
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            // Simulate successful exit
            setTimeout(() => handler(0), 20)
          }
        })
      }
      return mockChild
    }

    if (callback) {
      callback(0, 'success', '')
    }
    return { code: 0, stdout: 'success', stderr: '' }
  }),
  which: vi.fn().mockReturnValue(true)
}))

vi.mock('git-branch', () => ({
  default: vi.fn().mockResolvedValue('feature-branch')
}))

const originalConsoleLog = console.log
console.log = vi.fn()

import ora from 'ora'
import open from 'open'
import gitPushPR, { getPullRequestUrl } from './index.js'
import { exec, which } from 'shelljs'
import branch from 'git-branch'

let exitSpy

beforeEach(() => {
  vi.clearAllMocks()
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit unexpectedly called with "${code}"`)
  })
})

afterEach(() => {
  exitSpy.mockRestore()
  vi.clearAllMocks()
  vi.clearAllTimers()
})

afterAll(() => {
  console.log = originalConsoleLog
})

describe('getPullRequestUrl', () => {
  it('should generate correct GitHub pull request URL', () => {
    const url = getPullRequestUrl('https://github.com/user/repo.git', 'feature-branch', '')
    expect(url).toBe('https://github.com/user/repo/pull/new/feature-branch')
  })

  it('should generate correct BitBucket pull request URL', () => {
    const url = getPullRequestUrl('https://bitbucket.org/user/repo.git', 'feature-branch', '')
    expect(url).toBe('https://bitbucket.org/user/repo/pull-requests/new?source=feature-branch&t=1')
  })

  it('should generate correct GitLab merge request URL', () => {
    const url = getPullRequestUrl('https://gitlab.com/user/repo.git', 'feature-branch', '')
    expect(url).toBe('https://gitlab.com/user/repo/merge_requests/new?merge_request%5Bsource_branch%5D=feature-branch')
  })

  it('should extract URL from stderr for unknown Git hosts', () => {
    const stderr =
      'remote: Create a pull request for feature-branch on GitHub by visiting:\nremote: https://example.com/user/repo/pull/new/feature-branch\n'
    const url = getPullRequestUrl('https://example.com/user/repo.git', 'feature-branch', stderr)
    expect(url).toBe('https://example.com/user/repo/pull/new/feature-branch')
  })
})

describe('gitPushPR', () => {
  it('should not exit if current branch is protected but allowAll is true', async () => {
    const protectedBranches = ['main', 'master', 'develop']

    for (const branchName of protectedBranches) {
      branch.mockResolvedValueOnce(branchName)
      const promise = gitPushPR({ allowAll: true, remote: 'origin' })
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(exitSpy).not.toHaveBeenCalled()
      await promise
    }
  })

  it('should use force flag when option is set', async () => {
    const promise = gitPushPR({ force: true, remote: 'origin' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--force'), expect.any(Object))
    await promise
  })

  it('should use no-verify flag when verify option is false', async () => {
    const promise = gitPushPR({ verify: false, remote: 'origin' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--no-verify'), expect.any(Object))
    await promise
  })

  it('should use silent flag when option is set', async () => {
    const promise = gitPushPR({ silent: true, remote: 'origin' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--quiet'), expect.any(Object))
    expect(ora).not.toHaveBeenCalled()
    await promise
  })

  it('should use custom remote when specified', async () => {
    const promise = gitPushPR({ remote: 'upstream' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('upstream'), expect.any(Object))
    await promise
  })

  it('should open a pull request URL after successful push', async () => {
    const promise = gitPushPR({ remote: 'origin' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(open).toHaveBeenCalled()
    await promise
  })

  const expectExitWithError = async (fn) => {
    let error
    try {
      await fn()
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('process.exit unexpectedly called with "1"')
  }

  it('should exit if Git is not installed', async () => {
    which.mockReturnValueOnce(false)
    await expectExitWithError(() => gitPushPR({ remote: 'origin' }))
  })

  it('should exit if branch name cannot be retrieved', async () => {
    branch.mockRejectedValueOnce(new Error('Failed to get branch'))
    await expectExitWithError(() => gitPushPR({ remote: 'origin' }))
  })

  it('should exit if current branch is protected and allowAll is false', async () => {
    const protectedBranches = ['main', 'master', 'develop']
    for (const branchName of protectedBranches) {
      branch.mockResolvedValueOnce(branchName)
      await expectExitWithError(() => gitPushPR({ allowAll: false, remote: 'origin' }))
    }
  })

  it('should stream stdout/stderr and show two separate spinners', async () => {
    const mockSpinner1 = {
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      render: vi.fn().mockReturnThis()
    }
    const mockSpinner2 = {
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      render: vi.fn().mockReturnThis()
    }

    // First call returns spinner1, second call returns spinner2
    ora.mockReturnValueOnce(mockSpinner1).mockReturnValueOnce(mockSpinner2)

    // Execute the command
    const promise = gitPushPR({ remote: 'origin' })

    // Wait a bit for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Verify first spinner (git push) clear/render was called for streaming output
    expect(mockSpinner1.clear).toHaveBeenCalled()
    expect(mockSpinner1.render).toHaveBeenCalled()

    // Verify first spinner succeeded with push message
    expect(mockSpinner1.succeed).toHaveBeenCalledWith(expect.stringContaining('[git-push-pr]: pushed code to remote'))
    expect(mockSpinner1.succeed).toHaveBeenCalledTimes(1)

    // Verify second spinner (PR creation) succeeded with PR URL
    expect(mockSpinner2.succeed).toHaveBeenCalledWith(expect.stringContaining('[git-push-pr]: pull request ready at:'))
    expect(mockSpinner2.succeed).toHaveBeenCalledTimes(1)

    // Verify two ora instances were created
    expect(ora).toHaveBeenCalledTimes(2)
    expect(ora).toHaveBeenNthCalledWith(1, '[git-push-pr]: pushing code to remote\n')
    expect(ora).toHaveBeenNthCalledWith(2, '[git-push-pr]: creating pull request\n')

    await promise
  })
})
