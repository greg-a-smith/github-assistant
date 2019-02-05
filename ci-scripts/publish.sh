#! /bin/bash

set -e

git config --global user.email "greg.smith03@sap.com"
git config --global user.name "Greg Smith"

git checkout master

# delete temp branch
git push "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" ":$TRAVIS_BRANCH"

std_ver=$(npm run std-version)
release_tag=$(echo "$std_ver" | grep "tagging release" | awk '{print $4}')

echo "$std_ver"

git push --follow-tags "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" master

npm run release:create -- --repo $TRAVIS_REPO_SLUG --tag $release_tag --branch master

npm publish
