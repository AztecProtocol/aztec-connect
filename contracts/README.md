# Running the docker for tests locally:

```bash
# In root run
docker build -f ./contracts/DockerFile --no-cache .
```
# Generating new verification keys
It is possible to generate new verification keys by running the `generate_vks.sh` script that is put in `verification-keys`. This generates the keys and their matching solidity contracts. Also to be used for generating the large 28x32 key.

# Generating "fresh" proofs for the verifier tests
In the case where the verification key have been updated, the proofs in `verification-keys` needs to be updated. As this need `barretenberg.js` it can be a bit clunky to have in here, instead there is a command in `yarn-project/blockchain` that can be used to generate these (generated will be in blockchain can be moved over). To generate, go to the `yarn-project/blockchain` and run `yarn build:vk:fixtures`, it will build the proofs and encoded versions that are used here.