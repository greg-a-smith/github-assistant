#!/usr/bin/env node

/* eslint-disable no-console */

import GitHub from 'github-api';
import releaseNotes from './utils/release-notes';

const argv = require('yargs')
    .usage('Usage: $0 [options]')
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
    .option('prerelease', {
        alias: 'p',
        description: 'Mark as a pre-release',
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
    .demandOption(['tag', 'branch'], 'Please provide the version tag and branch to create this release')
    .alias('help', 'h')
    .version(false)
    .help()
    .argv;

const gh = new GitHub({
    token: process.env.GITHUB_PA_TOKEN
}, 'https://github.concur.com/api/v3');

const ghRepo = gh.getRepo(process.env.CIRCLE_PROJECT_USERNAME, process.env.CIRCLE_PROJECT_REPONAME);

releaseNotes(ghRepo, argv)
    .then(notes => {
        console.log('\nRelease Notes:\n', notes);
        if (!argv['dry-run']) {
            ghRepo.createRelease({
                'tag_name': argv.tag,
                'target_commitish': argv.branch,
                'name': `Release ${argv.tag}`,
                'body': notes,
                'prerelease': argv.prerelease
            })
                .then(resp => {
                    console.log('\nCreated release', resp.data.id, resp.data.name, '\n\n');
                })
                .catch(e => {
                    console.error(e);
                });
        }
    })
    .catch(e => {
        console.error(e);
    });
