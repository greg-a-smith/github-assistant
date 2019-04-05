#!/usr/bin/env node

import GitHub from 'github-api';
import log from 'loglevel';
import releaseNotes from './utils/release-notes';

const argv = require('yargs')
    .usage('Usage: $0 [options]')
    .option('repo', {
        alias: 'r',
        description: 'Name of the repo in the format username/reponame',
        type: 'string'
    })
    .option('tag', {
        alias: 't',
        description: 'Version tag to use for the release',
        type: 'string'
    })
    .option('branch', {
        alias: 'b',
        description: 'Branch to use for the release',
        type: 'string'
    })
    .option('gh-token-env-var', {
        description: 'Environment variable name for GitHub access token',
        type: 'string',
        'default': 'GH_TOKEN'
    })
    .option('gh-api-base-url', {
        description: 'Base URL of the GitHub API',
        type: 'string',
        'default': 'https://api.github.com'
    })
    .option('prerelease', {
        alias: 'p',
        description: 'Mark as a pre-release',
        type: 'boolean',
        'default': false
    })
    .option('hide-docs', {
        description: 'Omit Documentation section from the release notes',
        type: 'boolean',
        'default': false
    })
    .option('dry-run', {
        description: 'Skip the creation of the release on GitHub, but do everything else',
        type: 'boolean',
        'default': false
    })
    .option('debug', {
        alias: 'd',
        description: 'Turn on console messages',
        type: 'boolean',
        'default': false
    })
    .demandOption(['repo', 'tag', 'branch'], 'Please provide the repo, version tag and branch to create this release')
    .alias('help', 'h')
    .version(false)
    .help()
    .argv;

const gh = new GitHub({
    token: process.env[argv['gh-token-env-var']]
}, argv['gh-api-base-url']);

const repoName = argv.repo.split('/');
const ghRepo = gh.getRepo(repoName[0], repoName[1]);

releaseNotes(ghRepo, argv)
    .then(notes => {
        log.info('\nRelease Notes:\n', notes);
        if (!argv['dry-run']) {
            ghRepo.createRelease({
                'tag_name': argv.tag,
                'target_commitish': argv.branch,
                'name': `Release ${argv.tag}`,
                'body': notes,
                'prerelease': argv.prerelease
            })
                .then(resp => {
                    log.info('\nCreated release:', resp.data.id, resp.data.name, '\n\n');
                })
                .catch(e => {
                    log.error(e);
                });
        }
    })
    .catch(e => {
        log.error(e);
    });
