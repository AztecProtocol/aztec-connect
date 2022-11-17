# Running the docker for tests locally:
To run these tests, the contracts docker need to have been built with the latest keys to have up to date keys.

```bash
# In yarn-project
docker build -f contracts-verifier-test/Dockerfile --no-cache .
```
