# git-push-pr

[![version](https://img.shields.io/npm/v/git-push-pr.svg?style=flat-square)](http://npm.im/git-push-pr)
[![downloads](https://img.shields.io/npm/dm/git-push-pr.svg?style=flat-square)](http://npm-stat.com/charts.html?package=git-push-pr)
[![MIT License](https://img.shields.io/npm/l/git-push-pr.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

> Git push and automatically open pull request in your default browser (works for GitHub, GitLab and Bitbucket)

![demo](./demo.gif)

## Install

```shell
npm install --global git-push-pr
```

## Usage

```shell
gppr --help

  Usage
    gppr [options]

  Options
    --remote, -r Specify remote name [Default: origin]
    --allow-all, -a Allow pushes to main, master and develop
    --silent, -s Do not show any progress
    --force, -f Push changes even if remote is newer, use with caution
    --no-verify Bypass pre-push hooks

  Examples
    $ gppr -f
```

## Related

- [git-is-branch-protected-cli](https://github.com/tobiasbueschel/git-is-branch-protected-cli) - CLI to check whether current Git branch is protected.

## License

MIT © [Tobias Büschel](https://github.com/tobiasbueschel)
