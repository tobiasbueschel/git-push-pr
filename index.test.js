import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

vi.mock('ora', () => {
  return {
    default: vi.fn(() => ({
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis()
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
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('exit')
  })
})

afterAll(() => {
  console.log = originalConsoleLog
  exitSpy.mockRestore()
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
      await expect(gitPushPR({ allowAll: true, remote: 'origin' })).resolves.not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    }
  })

  it('should use force flag when option is set', async () => {
    await gitPushPR({ force: true, remote: 'origin' })
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--force'), expect.any(Object), expect.any(Function))
  })

  it('should use no-verify flag when verify option is false', async () => {
    await gitPushPR({ verify: false, remote: 'origin' })
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--no-verify'), expect.any(Object), expect.any(Function))
  })

  it('should use silent flag when option is set', async () => {
    await gitPushPR({ silent: true, remote: 'origin' })
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('--quiet'), expect.any(Object), expect.any(Function))
    expect(ora).not.toHaveBeenCalled()
  })

  it('should use custom remote when specified', async () => {
    await gitPushPR({ remote: 'upstream' })
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('upstream'), expect.any(Object), expect.any(Function))
  })

  it('should open a pull request URL after successful push', async () => {
    await gitPushPR({ remote: 'origin' })
    expect(open).toHaveBeenCalled()
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
})
