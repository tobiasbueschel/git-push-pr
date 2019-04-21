#!/usr/bin/env node
'use strict'
const meow = require('meow')
const gitPushPR = require('.')

const cli = meow(
  `
	Usage
	  $ gppr [options]

	Options
	  --remote, -r Specify remote name [Default: origin]
	  --allow-all, -a Allow pushes to master and develop
	  --silent, -s Do not show any progress
	  --force, -f Push changes even if remote is newer, use with caution
	  --no-verify Bypass pre-push hooks

	Examples
	  $ gppr -f
`,
  {
    flags: {
      remote: {
        type: 'string',
        alias: 'r',
        default: 'origin'
      },
      allowAll: {
        type: 'boolean',
        default: false,
        alias: 'a'
      },
      silent: {
        type: 'boolean',
        default: false,
        alias: 's'
      },
      force: {
        type: 'boolean',
        default: false,
        alias: 'f'
      },
      verify: {
        type: 'boolean',
        default: true
      }
    }
  }
)

gitPushPR(cli.flags)
