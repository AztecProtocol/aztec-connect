# Release Cycle and Branching Strategy

Releases are deployed every other Monday. The changes to be released are isolated on the prior Thursday for a period of QA and to fix any bugs related to the changes.

## Long-lived branches

Under Aztec connect the long lived branches are:

| Name                  | Role           | Env                               |
| --------------------- | -------------- | --------------------------------- |
| `defi-bridge-project` | Development    | `aztec-connect-dev-*` (anvil)     |
| `stage`               | Staging        | `aztec-connect-stage-*` (anvil)   |
| `v2.1-testnet`        | Public Testnet | `aztec-connect-testnet-*` (anvil) |
| `v2.1`                | Release        | `aztec-connect-prod-*` (mainnet)  |

Changes between long-lived branches are propagated with regular merges. Changes applied to long-lived branches from other branches, such as feature branches, are squashed and merged. E.g.:

- Merge `defi-bridge-project` -> `stage`
- Merge `stage` -> `v2-1-testnet`
- Merge `v2.1-testnet` -> `defi-bridge-project`
- Squash and merge `some-hotfix` -> `v2.1`
- Squash and merge `some-feature` -> `defi-bridge-project`

## Release branch

At the time of writing `v2.1` is the active release branch &ndash; under the ultra plonk project this will likely be `v2.2`. The release branch exists to reflect the state of the code that has been deployed to production, and is thus branch from which production deployments are triggered.

## Staging (stage) branch

The staging branch and its counterpart environment exist to isolate and QA changes in the run up to a release. The active development branch should be merged into the staging branch as required. Any bug fixes required in this period are merged both to the staging branch and the active development branch.

## Public Testnet (v2.1-testnet)

The staging branch and its counterpart environment exist to isolate and QA changes in the run up to a release. The active development branch should be merged into the staging branch on the Thursday prior to release. Any bug fixes required in this period are merged both to the staging branch and the active development branch.

## Hotfix branches

Hotfixes should be branched from the current release branch. When a hotfix is ready for deployment, it is merged into the release branch, which should then be tagged to trigger a build and deploy. The hotfix branch should also be merged into the staging branch and active development branch.

Unfortunately there is no reliable environment for testing hotfix changes as the staging branch may contain changes primed for release. If local environment testing is insufficient, and staged testing is required, it's technically an option to first merge your hotfix into the staging branch, triggering a testnet deployment. However if you opt to do this, make sure any further adjustments are committed to the same hotfix branch and re-merged, otherwise reflecting the same merge changes on the release branch and active development branch will be cumbersome.
