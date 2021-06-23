---
tags: process-guidelines
---
[edit](https://hackmd.io/oX51LHehRCm5xE2xmbHlEw)
# Procedures for pull requests

## To make sure tests pass:

- If your PR touches circuit code you should make an additional commit that recomputes the root rollup fixtures:
     - delete the directory `src/aztec/rollup/proofs/root_rollup/fixtures` 
    - run (in the build directory) `src/aztec/rollup/proofs/rollup_proofs_tests --gtest_filter=*root_rollup*`
    - Run `./blockchain/yarn generate:dev`  to regenerate verification keys in the smart contracts


## Additional guidelines:

- A PR should include at (at least) a (brief) text description of what it is doing.


- If a PR changes one of our circuits or the logic of one our smart contracts, it should include a change of the relevant specs in [this repo](https://github.com/AztecProtocol/AZTEC-Specifications). This part of the PR should be reviewed and approved by someone in the crypto team - currently Ariel,Suyash,Zac.



- Similarly, if a PR contains a new circuit/contract add a hackmd with the tag Specs describing it and link to the [specifications repo](https://github.com/AztecProtocol/AZTEC-Specifications).

*Note that you can do the editting both in hackmd or directly in the repo/github. Just make sure in the end you sync them by using hackmd's versions and github sync option. (Ask Ariel about this if you're not sure how to do it.)*

