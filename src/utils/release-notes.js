import log from 'loglevel';

const buildCommitMessage = (commit, pullRequests) => {
    const template = (msg, sha, url, prNumber, prUrl) => {
        log.debug('\nTemplate\n', msg, sha, url, prNumber, prUrl);
        return `${msg}${prNumber ? ` ([#${prNumber}](${prUrl}))` : ''} ([${sha}](${url}))`;
    };

    let message = commit.message;
    log.debug('\nRaw Message\n', message);
    let pos = message.indexOf(':');
    if (pos !== -1) {
        message = message.substring(pos + 1).trim();
    }

    if (message.match(/BREAKING CHANGE\:/)) {
        message = `**BREAKING CHANGE:** ${message}`;
    }

    pos = message.indexOf(commit.prNumber ? '(#' : '\n\n');
    if (pos !== -1) {
        message = message.substring(0, pos).trim();
    }

    return template(
        message,
        commit.sha.substring(0, 7),
        commit.url,
        commit.prNumber,
        pullRequests[`pr_${commit.prNumber}`]
    );
};

const buildMessages = (commits, pullRequests) => {
    let messages = {
        features: [],
        fixes: []
    };

    commits.forEach(commit => {
        if (commit.message.match(/^fix/)) {
            messages.fixes.push(buildCommitMessage(commit, pullRequests));
        }

        if (commit.message.match(/^feat/)) {
            messages.features.push(buildCommitMessage(commit, pullRequests));
        }
    });

    log.debug('\nMessages\n', messages);
    return messages;
};

const buildReleaseNotes = (messages) => {
    let notes = [];

    if (messages.features.length > 0) {
        notes.push('\n### Features\n');
        notes = notes.concat(messages.features.map(msg => `* ${msg}`));
    }

    if (messages.fixes.length > 0) {
        notes.push('\n### Bug Fixes\n');
        notes = notes.concat(messages.fixes.map(msg => `* ${msg}`));
    }

    return notes.join('\n');
};

const getVerionCommitRegEx = (prerelease) => {
    return (
        prerelease
            ? /^chore\(release\):\sversion\s\d+\.\d+\.\d+(\s|\-\w+\.\d+)/
            : /^chore\(release\):\sversion\s\d+\.\d+\.\d+\s/
    );
};

const getCommits = (ghRepo, tag, prerelease) =>
    ghRepo.listCommits({ sha: tag })
        .then(resp => {
            const commits = (!Array.isArray(resp.data) ? [resp.data] : resp.data);
            let filteredCommits = [];
            let foundPreviousVersionCommit = false;
            let sha;

            // the list of commits started with the commit for this tag so let's start at index 1
            for (let i = 1; i < commits.length; i++) {
                sha = commits[i].sha;
                const message = commits[i].commit.message;
                log.debug('\nRaw Commit Message\n', message);

                // continue gathering commit messages until the previous version commit is found
                if (message.match(getVerionCommitRegEx(prerelease))) {
                    foundPreviousVersionCommit = true;
                    break;
                }

                // skip over system-generated commits
                if (message.match(/\[ci skip\]$/)) {
                    continue;
                }

                let prMatch = message.match(/\(\#\d+\)/);
                if (prMatch) {
                    prMatch = prMatch[0].match(/\d+/);
                }

                filteredCommits.push({
                    sha: sha,
                    url: commits[i].html_url,
                    message: message,
                    prNumber: (prMatch ? parseInt(prMatch[0], 10) : null)
                });
            }

            // if the number of commits is 0 or 1, we have exhausted ALL commits
            // so it's time to return regardless of whether we found a match or not
            if (!foundPreviousVersionCommit && commits.length > 1) {
                log.debug('Making recursive call - filtered commits count:', filteredCommits.length);
                return getCommits(ghRepo, sha, prerelease)
                    .then(moreCommits => filteredCommits.concat(moreCommits));
            }

            return filteredCommits;
        })
        .catch(e => {
            log.error(e);
        });

const getPullRequest = (ghRepo, prNumber) =>
    ghRepo.getPullRequest(prNumber)
        .then(resp => {
            return { [`pr_${resp.data.number}`]: resp.data.html_url };
        })
        .catch(e => {
            log.error(e);
        });

export default (ghRepo, { tag, prerelease = false, debug = false }) => {
    log.setLevel(debug ? 'debug' : 'info');
    log.debug('Arguments:', tag, prerelease, debug);

    return getCommits(ghRepo, tag, prerelease)
        .then(commits => {
            log.debug('\nCommits\n', commits);
            return Promise.all(commits.filter(commit => !!commit.prNumber).map(commit =>  // eslint-disable-line
                getPullRequest(ghRepo, commit.prNumber)
            ))
                .then(pullRequests => {
                    log.debug('\nPull Requests\n', pullRequests);
                    let pullRequestLookup = {};
                    pullRequests.forEach(pullRequest => {
                        Object.assign(pullRequestLookup, pullRequest);
                    });

                    log.debug('\nPull Request Object\n', pullRequestLookup);
                    return buildReleaseNotes(buildMessages(commits, pullRequestLookup));
                });
        })
        .catch(e => {
            log.error(e);
        });
};
