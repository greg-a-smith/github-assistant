#! /bin/bash

set -e

git config --global user.email "greg.smith03@sap.com"
git config --global user.name "Greg Smith"

npm run std-version -- --prerelease rc --no-verify

git push --follow-tags "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" "$TRAVIS_BRANCH"

npm publish --tag prerelease
