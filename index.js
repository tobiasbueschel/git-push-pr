import ora from 'ora'
import chalk from 'chalk'
import open from 'open'
import branch from 'git-branch'
import GitUrlParse from 'git-url-parse'
import shell from 'shelljs'

const { exec, which } = shell
const { exit } = process
const { log } = console

const PROTECTED_BRANCHES = ['main', 'master', 'develop']

export function getPullRequestUrl(remote, currentBranch, stderr) {
  const address = GitUrlParse(remote)
  let url = `https://${address.resource}/${address.owner}/${address.name}/`
  if (address.source === 'github.com') {
    url += `pull/new/${currentBranch}`
  } else if (address.source === 'bitbucket.org') {
    url += `pull-requests/new?source=${currentBranch}&t=1`
  } else if (address.source === 'gitlab.com') {
    url += `merge_requests/new?merge_request%5Bsource_branch%5D=${currentBranch}`
  } else {
    // If we don't encounter a repository hosted on the public GitHub, BitBucket or GitLab,
    // we try to fallback to the PR URL as outputted by the stderr of "git push".
    const prUrl = stderr.match(/https?:\/\/\S*/)
    if (prUrl) {
      url = prUrl[0].replace('\n', '')
    }
  }
  return url
}

async function gitPushPR(options) {
  // 1. Stop if Git is not installed
  if (!which('git')) {
    log(chalk.red('[git-push-pr]: sorry, this script requires git'))
    exit(1)
  }

  // 2. Get current branch name or stop if failed
  let currentBranch
  try {
    currentBranch = await branch()
  } catch (error) {
    log(chalk.red('[git-push-pr]: could not get current branch'))
    exit(1)
  }

  // 3. Stop if currently on protected branch (optional)
  if (!options.allowAll && PROTECTED_BRANCHES.includes(currentBranch)) {
    log(chalk.red('[git-push-pr]: cannot push protected (main|master|develop) branch'))
    exit(1)
  }

  // 4. Prepare git push command and options
  const silentFlag = options.silent ? '--quiet' : '--progress'
  const verifyFlag = options.verify ? '--verify' : '--no-verify'
  const forceFlag = options.force ? '--force' : ''
  const gitPushStr = `git push ${options.remote} --set-upstream ${currentBranch} ${silentFlag} ${verifyFlag} ${forceFlag}`

  // 5. Push to remote
  let spinner
  if (!options.silent) {
    spinner = ora('[git-push-pr]: pushing code to remote\n').start()
  }

  const child = exec(gitPushStr, { async: true, silent: true })

  // Accumulate stderr so we can parse a PR URL for unknown git hosts
  let stderrBuffer = ''

  // Gracefully handle user aborts (e.g., Ctrl+C)
  let aborted = false
  const handleAbort = () => {
    if (aborted) return
    aborted = true
    try {
      if (child && typeof child.kill === 'function') {
        child.kill('SIGINT')
      }
    } catch {
      // Best-effort kill; ignore errors here
    }
  }
  process.once('SIGINT', handleAbort)
  process.once('SIGTERM', handleAbort)
  process.once('SIGHUP', handleAbort)

  // Stream stdout in real-time
  child.stdout.on('data', (data) => {
    if (!options.silent && spinner) {
      spinner.clear()
      log(data.toString().trimEnd())
      spinner.render()
    }
  })

  // Stream stderr in real-time
  child.stderr.on('data', (data) => {
    stderrBuffer += data.toString()
    if (!options.silent && spinner) {
      spinner.clear()
      log(data.toString().trimEnd())
      spinner.render()
    }
  })

  child.on('exit', async (code) => {
    // Clean up listeners on any exit
    process.off('SIGINT', handleAbort)
    process.off('SIGTERM', handleAbort)
    process.off('SIGHUP', handleAbort)

    // If user aborted, show a friendly message and exit
    if (aborted) {
      if (!options.silent && spinner) {
        spinner.fail(chalk.yellow('[git-push-pr]: aborted by user'))
      } else {
        log(chalk.yellow('[git-push-pr]: aborted by user'))
      }
      // Do not forcefully exit; allow Node to exit naturally after cleanup
      return
    }

    // 6. Stop if git push failed for some reason
    if (code !== 0) {
      if (!options.silent && spinner) {
        spinner.fail(chalk.red('[git-push-pr]: git push failed'))
      } else if (options.silent) {
        // In silent mode, still output errors to help with debugging
        log(chalk.red('[git-push-pr]: git push failed'))
      }
      exit(1)
    }

    // 7. Mark push as successful
    if (!options.silent && spinner) {
      spinner.succeed(chalk.green('[git-push-pr]: pushed code to remote'))
    }

    // 8. Create a new spinner for PR creation
    let prSpinner
    if (!options.silent) {
      prSpinner = ora('[git-push-pr]: creating pull request\n').start()
    }

    // 9. Create a Pull Request
    const { stdout: remoteUrl } = exec(`git remote get-url ${options.remote}`, { silent: true })
    const pullRequestUrl = getPullRequestUrl(remoteUrl, currentBranch, stderrBuffer)
    await open(pullRequestUrl)

    // 10. Mark PR creation as successful
    if (!options.silent && prSpinner) {
      prSpinner.succeed(chalk.green(`[git-push-pr]: pull request ready at: ${pullRequestUrl}`))
    }
  })
}

export default gitPushPR
