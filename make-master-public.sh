cd ..
rm -rf ./aztec-public
mkdir aztec-public && cd aztec-public

git init
git remote add public  git@github.com:AztecProtocol/aztec-connect.git
git pull public master
rm -rf ./barretenberg
rm -rf ./sdk
rm -rf ./barretenberg.js
rm -rf ./blockchain
rm -rf ./falafel
rm -rf ./halloumi
rm -rf ./specs

EXCLUDES="--exclude /dest --exclude /dest-es  --exclude /node_modules --exclude /terraform --exclude /.yarn"

rsync -av --progress ../aztec2-internal/barretenberg/ ./barretenberg --exclude /build --exclude /build-vks --exclude /build-wasm
rsync -av --progress ../aztec2-internal/yarn-project/sdk/ ./sdk $EXCLUDES
rsync -av --progress ../aztec2-internal/yarn-project/barretenberg.js/ ./barretenberg.js $EXCLUDES
rsync -av --progress ../aztec2-internal/yarn-project/blockchain/ ./blockchain $EXCLUDES
rsync -av --progress ../aztec2-internal/yarn-project/falafel/ ./falafel $EXCLUDES
rsync -av --progress ../aztec2-internal/yarn-project/halloumi/ ./halloumi $EXCLUDES
mkdir specs
rsync -av --progress ../aztec2-internal/markdown/specs/aztec-connect/ ./specs/aztec-connect
cp ../aztec2-internal/README-publicversion.md README.md
cp ../aztec2-internal/LICENSE LICENSE
cp ../bootstrap-publicversion.sh bootstrap.sh
chmod +x boostrap.sh
git add -A
git commit -m "update public repo"
git push public master
