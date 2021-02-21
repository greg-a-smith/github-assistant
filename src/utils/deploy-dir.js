import 'regenerator-runtime/runtime';
import { dir } from 'tmp-promise';
import { exec as execFunc } from 'child_process';
import fs from 'fs';
import gitUrlParse from 'git-url-parse';
import log from 'loglevel';
import ncp from 'ncp';
import path from 'path';
import pug from 'pug';
import rimraf from 'rimraf';
import semverSort from './semver-sort';
import util from 'util';

const execPromise = util.promisify(execFunc);
const ncpPromise = util.promisify(ncp);
const rimrafPromise = util.promisify(rimraf);

export default async(options) => {
    const {
        source,
        destination,
        remote,
        branch,
        template,
        directoryRegex,
        noHistory,
        sortDesc,
        dryRun,
        debug
    } = options;

    log.setLevel(debug ? 'debug' : 'info');

    log.info(`\nDeploy ${source} to ${remote}:${branch}/${destination}\n`);

    const tmpDir = (await dir({ keep: dryRun })).path;
    log.debug(`tmpDir = ${tmpDir}`);

    async function exec(cmd) {
        const res = await execPromise(cmd, { cwd: tmpDir });
        if (res.stdout && res.stdout.length) {
            log.debug(`exec output=${res.stdout}`);
        }
        return res.stdout;
    }

    // Is the destination branch new or already created?
    const lsOut = await exec(`git ls-remote --heads ${remote} ${branch}`);
    const branchExists = lsOut.indexOf(`refs/heads/${branch}`) !== -1;
    if (branchExists) {
        log.info(`\nThe branch ${branch} exists, clone it\n`);
        await exec(`git clone --single-branch -b ${branch} ${remote} ${tmpDir}`);
    } else {
        log.info(`\nThe branch ${branch} doesn't exist, create it\n`);
        // Create empty new branch
        await exec(`git clone ${remote} ${tmpDir}`);
        await exec(`git checkout --orphan ${branch}`);
        await exec('git rm -rf .');
    }

    let destinationExists;
    try {
        fs.accessSync(path.resolve(tmpDir, destination), fs.constants.F_OK);
        destinationExists = true;
    } catch (err) {
        log.debug(`${destination} does not exist yet`);
        destinationExists = false;
    }
    if (destinationExists) {
        if (noHistory) {
            log.debug(`remove all references to ${destination} in git history`);
            await exec(`git filter-branch --tree-filter 'rm -rf ${destination}' --prune-empty HEAD`);
        }

        log.debug(`remove previous directory ${destination}`);
        await rimrafPromise(path.resolve(tmpDir, destination));
    }

    log.info(`\nReplace the directory ${destination} with new content from ${source}\n`);
    await ncpPromise(path.resolve(process.cwd(), source), path.resolve(tmpDir, destination));

    // read package.json file to get version information
    const packageJsonContents = fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8');
    const packageJson = JSON.parse(packageJsonContents);
    const versionPath = path.resolve(tmpDir, destination, 'version.txt');
    fs.writeFileSync(versionPath, packageJson?.version);
    log.debug(`written ${versionPath}`);

    log.debug(`create index.html file that lists the directories in branch ${branch} from template ${template}`);
    const regex = new RegExp(directoryRegex);
    // const dirs = (await readdir(tmpDir)).filter((directory) => directory.indexOf('.') !== 0 && directory !== 'index.html').sort();
    const dirs = fs.readdirSync(tmpDir, { withFileTypes: true })
        .filter((f) => f.isDirectory() && f.name?.match(regex));
    log.debug(`\ndirs = ${JSON.stringify(dirs)}\n`);

    // loop through dirs and grab version information for each
    dirs.forEach((d) => {
        try {
            const versionFile = path.resolve(tmpDir, d.name, 'version.txt');
            fs.accessSync(versionFile, fs.constants.F_OK);
            d.version = fs.readFileSync(versionFile, 'utf8');
        } catch (e) {
            d.version = '';
        }
    });
    log.debug(`sorted dirs = ${JSON.stringify(semverSort(dirs, sortDesc))}\n`);

    const compiledTemplate = pug.compile(fs.readFileSync(template, 'utf8'));
    const fullTemplatePath = path.resolve(tmpDir, 'index.html');
    fs.writeFileSync(fullTemplatePath, compiledTemplate({ dirs }));
    log.debug(`written ${fullTemplatePath}`);

    const noJekyllPath = path.resolve(tmpDir, '.nojekyll');
    fs.writeFileSync(noJekyllPath, '');
    log.debug(`written ${noJekyllPath}`);

    if (dryRun) {
        log.info('\nDry run option activated, do not push anything\n');
    } else {
        await exec('git add -A');
        const diffOut = await exec('git diff --staged --name-only');
        if (diffOut.length === 0) {
            return log.info('No modification to validate');
        }

        await exec(`git commit -m "Pushed ${destination}"`);
        if (noHistory) {
            await exec(`git push --force -u origin ${branch}`);
        } else {
            await exec(`git push -u origin ${branch}`);
        }
        log.debug(`pushed modifications to ${remote}:${branch}`);
        const gitInfo = gitUrlParse(remote);
        if (gitInfo && gitInfo.source === 'github.com') {
            log.info(`\nResult should be available here soon: https://${gitInfo.owner}.github.io/${gitInfo.name}/\n`);
        } else {
            log.info(`\nDirectory ${source} was pushed to ${remote}:${branch}/${destination}\n`);
        }
    }
};
