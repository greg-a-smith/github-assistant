#! /bin/bash

set -e

git config --global user.email "greg.smith03@sap.com"
git config --global user.name "Greg Smith"

# update the package verion and commit to the git repository
npm run std-version -- --prerelease rc --no-verify

# pushes changes to master
git push --follow-tags "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" "$TRAVIS_BRANCH"

npm publish --tag prerelease
