# Running the docker for tests locally:

```bash
# In root run
docker build -f ./contracts/DockerFile --no-cache .
```
# Generating new verification keys
It is possible to generate new verification keys by running the `generate_vks.sh` script that is put in `verification-keys`. This generates the keys and their matching solidity contracts. Also to be used for generating the large 28x32 key.

# Verifier test
The verifier test is available in `yarn-project/contracts-verifier-test`.