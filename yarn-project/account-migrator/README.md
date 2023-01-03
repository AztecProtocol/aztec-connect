# account_migrator

Utility for assisting in the migration of accounts across Aztec versions. It's purpose is to retrieve account notes from mainnet and store data from them in a file. The file (named 'accounts') is a stream of binary data. This data is the concatenation of all of the data related to an account:

```
{
  aliashHash
  grumpkinAddress
  latestNonce
  accountNote1
  accountNote2
  nullifier
  signingKey1
  signingKey2
}
```

When run in 'verify' mode, no accounts data is stored, it will simply extract the on-chain data and calculate the expected root values before validating them against that contained in barretenberg.js/src/environment/init/init_config.ts for the given chain id. This init_config.ts file contains the first and last rollup IDs used to extract the set of accounts so these same values should be used for filtering the rollups when verifying the state.

## Building

Simply running `yarn build` should be sufficient

## Running

Run 'yarn start migrate' with the required arguments:

Options:

`-d`, `--directory <dir>` : Directory to use for accounts file and other temporary data

`-a`, `--address <address>`: Address of rollup processor contract

`-u`, `--url <url>`: URL of RPC provider

`-f`, `--from <rollupIdFrom>`: Id of first required rollup (default: 0)

`-t`, `--to <rollupIdTo>`: Id of last required rollup

`-c`, `--confirmations <confirmations>`: Num confirmations required on rollups (default: 3)

`-l`, `--logDuplicates`: Log duplicate Public Key/Nonce/Signing Key combinations

`-z`, `--aztecConnect`: Connects to an aztec connect version of the rollup contract (if false, it expects Aztec 1 version of rollup contract)

`-v`, `--verify`: Doesn't generate output files, just calculates the roots and verifies them against those stored for the given chain id

`-h`, `--help`: display help for command

Examples:

## Generating account Data

1. `yarn start migrate -d /home/data -a 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba -u "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35"`

   Will extract account data from the Aztec 1 rollup contract at address 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba. It will look for rollups from id 0 to infinity with at least 3 confirmations and using provider at "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35". Will then store account data into file /home/data/accounts.

2. `yarn start migrate -d /home/data -a 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba -u "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35" -z`

   Will extract account data from the Aztec Connect rollup contract at address 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba. It will look for rollups from id 0 to infinity with at least 3 confirmations and using provider at "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35". Will then store account data into file /home/data/accounts.

3. `yarn start migrate -d /home/data -f 5 -t 2001 -c 2 -a 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba -u "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35" -z`

   Will extract account data from the Aztec Connect rollup contract at address 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba. It will look for rollups from id 5 to 2001 with at least 2 confirmations and using provider at "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35". Will then store account data into file /home/data/accounts.

## Verifying account data

1. `yarn start migrate -d /home/data -v 1 -f 5 -t 2001 -c 2 -a 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba -u "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35"`

   Will extract account data from the Aztec 1 rollup contract at address 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba. It will look for rollups from id 5 to 2001 with at least 2 confirmations and using provider at "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35". Account data won't be stored, instead the tree roots will be generated from the on-chain data and verified against those stored in barretenberg.js/src/environment/init/init_config.ts for chain id 1

The data directory is required for both modes of operation as temporary files are always required, this directory must be created prior to running the application

## Harden accounts

### Run local test

Run the script below to run a full local test of the account hardener. This script handles launching ganache, halloumi, falafel, and even an e2e test before running the account hardener.

```
./scripts/harden-accounts-local.sh
```

### Run full hardener sequence all at once

#### Launch halloumi

First, launch the halloumi instance that the hardener will use for proof generation. The command below will "background" halloumi and redirect all of its output to `log/halloumi.log` in the `account-migrator/` directory:
`(cd ../halloumi && PORT=9083 JOB_SERVER_URL="http://localhost:9082" yarn start:e2e > log/halloumi.log 2>&1) &`

> NOTE: To get more debug output, prefix the `yarn` command with `DEBUG=bb:*`

> NOTE: Insead of the above command (with automatic backgrounding and output redirection), you could just run the following command in _another console_: `PORT=9083 JOB_SERVER_URL="http://localhost:9082" yarn start:e2e`

#### Run hardener

Run the full sequence of hardener steps including `createHardener`, `genHardenProofs`, `hardenAccounts`, and `verifyHardened`:

```
yarn start harden fullSequence -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmations>
```

> NOTE omit `-t` to run for _all_ blocks and _all_ accounts.

Afterwards, you can verify that all accounts are hardened via:

```
yarn start harden verifyHardened -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmations>
```

### Run hardener step-by-step

#### Launch halloumi

First, launch the halloumi instance that the hardener will use for proof generation. The command below will "background" halloumi and redirect all of its output to `log/halloumi.log` in the `account-migrator/` directory:
`(cd ../halloumi && PORT=9083 JOB_SERVER_URL="http://localhost:9082" yarn start:e2e > log/halloumi.log 2>&1) &`

> NOTE: To get more debug output, prefix the `yarn` command with `DEBUG=bb:*`

> NOTE: Insead of the above command (with automatic backgrounding and output redirection), you could just run the following command in _another console_: `PORT=9083 JOB_SERVER_URL="http://localhost:9082" yarn start:e2e`

#### Create hardener account

Create the hardener account which will be migrated to each vulnerable account's inverted public key and in doing so "harden" each account:

```
yarn start harden createHardener -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmations>
```

> NOTE: You can set `DEBUG=am:*` to get more debug info from the account hardener for any subcommands

> NOTE: For all subcommands, be sure to replace `<rollup-address>` with the address of your rollup contract as displayed by falafel. Also be sure to set `<up-to-rollup-block>` and `<#confirmations>` appropriately.

> NOTE omit `-t` to run for _all_ blocks and _all_ accounts.

#### Generate account harden proofs

Next, generate the proofs that will harden the accounts:

```
yarn start genHardenProofs -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmations>
```

#### Harden accounts

Now perform the actual harden operation. This submits the previously generated account hardening proofs to falafel for inclusion in the rollup:

```
yarn start hardenAccounts -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmation>
```

#### Verify that accounts are hardened

Finally, verify that all accounts in the specified block range have been hardened:

```
yarn start verifyHardened -t <up-to-rollup-block> -a "<rollup-address>" --port 9082 -m true -c <#confirmation>`
```
