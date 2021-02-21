#!/usr/bin/env node

import deployDir from './utils/deploy-dir';
import log from 'loglevel';
import { sync as remote } from 'remote-origin-url';

const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .option('source', {
        alias: 's',
        description: 'Name of the source directory to publish',
        type: 'string',
        'default': 'docs'
    })
    .option('destination', {
        alias: 'd',
        description: 'Name of the destination directory in the branch being published to',
        type: 'string',
        'default': 'latest'
    })
    .option('remote', {
        alias: 'r',
        description: 'The remote git repository to push to',
        type: 'string',
        'default': remote()
    })
    .option('branch', {
        alias: 'b',
        description: 'Name of the destination branch',
        type: 'string',
        'default': 'gh-pages'
    })
    .option('template', {
        description: 'The pug template to use to generate the index.hml file',
        type: 'string'
    })
    .option('directory-regex', {
        description: 'The regex pattern for matching directories to pass to the template',
        type: 'string',
        'default': '^\\w+'
    })
    .option('no-history', {
        description: 'Erase the history of the destination directory',
        type: 'boolean',
        'default': false
    })
    .option('sort-desc', {
        description: 'Sort the versions in descending order',
        type: 'boolean',
        'default': false
    })
    .option('dry-run', {
        description: 'Keep the cloned repository instead of cleaning it and do not push result to remote',
        type: 'boolean',
        'default': false
    })
    .option('debug', {
        description: 'Turn on console debug messages',
        type: 'boolean',
        'default': false
    })
    .demandOption(['template'], 'Please provide the template to use to generate the index.html document')
    .alias('help', 'h')
    .version(false)
    .help()
    .argv;

log.setLevel(argv.debug ? 'debug' : 'info');

log.debug('\nArguments:\n', argv, '\n');

deployDir(argv)
    .then(() => {
        log.info('\nDone.\n');
        process.exit(0);
    })
    .catch((e) => {
        log.error(e);
        process.exit(1);
    });
