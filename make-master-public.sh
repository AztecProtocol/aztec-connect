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

rsync -av --progress ../aztec2-internal/barretenberg/ ./barretenberg --exclude /build --exclude /build-vks --exclude /build-wasm 
rsync -av --progress ../aztec2-internal/sdk/ ./sdk --exclude /dest --exclude /dest-es --exclude /node_modules
rsync -av --progress ../aztec2-internal/barretenberg.js/ ./barretenberg.js --exclude /dest --exclude /dest-es --exclude /node_modules
rsync -av --progress ../aztec2-internal/blockchain/ ./blockchain --exclude /dest --exclude /dest-es  --exclude /node_modules --exclude /terraform
rsync -av --progress ../aztec2-internal/falafel/ ./falafel --exclude /dest --exclude /dest-es  --exclude /node_modules --exclude /terraform
rsync -av --progress ../aztec2-internal/halloumi/ ./halloumi --exclude /dest --exclude /dest-es  --exclude /node_modules --exclude /terraform
mkdir specs
rsync -av --progress ../aztec2-internal/markdown/specs/aztec-connect/ ./specs/aztec-connect 
cp ../aztec2-internal/README-publicversion.md README.md
cp ../aztec2-internal/LICENSE LICENSE
cp ../bootstrap-publicversion.sh bootstrap.sh
chmod +x boostrap.sh
git add -A
git commit -m "update public repo"
git push public master
