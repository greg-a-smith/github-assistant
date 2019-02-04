#! /bin/bash

git config --global user.email "greg.smith03@sap.com"
git config --global user.name "Greg Smith"

git checkout master
npm install

# delete tmp_branch_for_automated_release_do_not_use branch
git push "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" :do_not_use_release_branch

std_ver=$(npm run std-version)
release_tag=$(echo "$std_ver" | grep "tagging release" | awk '{print $4}')

echo "$std_ver"

git push --follow-tags "https://$GH_TOKEN@github.com/$TRAVIS_REPO_SLUG" master > /dev/null 2>&1;

npm run release:create -- --tag $release_tag --debug

npm publish
