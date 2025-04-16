#!/usr/bin/env node
import meow from 'meow'
import gitPushPR from './index.js'

const cli = meow(
  `
	Usage
	  $ gppr [options]

	Options
	  --remote, -r Specify remote name [Default: origin]
	  --allow-all, -a Allow pushes to main, master and develop
	  --silent, -s Do not show any progress
	  --force, -f Push changes even if remote is newer, use with caution
	  --no-verify, -n Bypass pre-push hooks

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
        default: true,
        alias: 'n'
      }
    }
  }
)

gitPushPR(cli.flags)
