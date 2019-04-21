# git-push-pr

[![Build Status](https://img.shields.io/travis/tobiasbueschel/git-push-pr/master.svg?style=flat-square)](https://travis-ci.com/tobiasbueschel/git-push-pr)
[![version](https://img.shields.io/npm/v/git-push-pr.svg?style=flat-square)](http://npm.im/git-push-pr)
[![downloads](https://img.shields.io/npm/dm/git-push-pr.svg?style=flat-square)](http://npm-stat.com/charts.html?package=git-push-pr)
[![MIT License](https://img.shields.io/npm/l/git-push-pr.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release) [![Greenkeeper badge](https://badges.greenkeeper.io/tobiasbueschel/git-push-pr.svg)](https://greenkeeper.io/)

> Git push and open pull request

![demo](./demo.gif)

## Install

```
$ npm install --global git-push-pr
```

## Usage

```
$ gppr --help

	Usage
	  gppr [options]

	Options
	  --remote, -r Specify remote name [Default: origin]
	  --allow-all, -a Allow pushes to master and develop
	  --silent, -s Do not show any progress
	  --force, -f Push changes even if remote is newer, use with caution
	  --no-verify Bypass pre-push hooks

	Examples
	  $ gppr -f
```

## License

MIT © [Tobias Büschel](https://github.com/tobiasbueschel)
