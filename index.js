'use strict'
const ora = require('ora')
const chalk = require('chalk')
const open = require('open')
const branch = require('git-branch')
const GitUrlParse = require('git-url-parse')
const { exec, which } = require('shelljs')
const { exit } = process
const { log } = console

const PROTECTED_BRANCHES = ['master', 'develop']

function getPullRequestUrl(remote, currentBranch, stderr) {
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
    log(chalk.red('[git-push-pr]: cannot push protected (master|develop) branch'))
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

  exec(gitPushStr, { silent: true }, async (code, stdout, stderr) => {
    // 6. Stop if git push failed for some reason
    if (code !== 0) {
      log(stdout)
      log(stderr)
      spinner.fail(chalk.red('[git-push-pr]: git push failed'))
      exit(1)
    }

    // 7. Set status to successful and log output
    if (!options.silent) {
      spinner.succeed(chalk.green('[git-push-pr]: pushed code to remote'))
      log(stdout)
      log(stderr)
    }

    // 8. Create a Pull Request
    const { stdout: remoteUrl } = exec(`git remote get-url ${options.remote}`, { silent: true })
    const pullRequestUrl = getPullRequestUrl(remoteUrl, currentBranch, stderr)
    await open(pullRequestUrl)
    if (!options.silent) {
      spinner.succeed(chalk.green(`[git-push-pr]: pull request ready at: ${pullRequestUrl}`))
    }
  })
}

module.exports = gitPushPR
