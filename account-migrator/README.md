# account_migrator

Utility for assisting in the migration of accounts across Aztec versions. It's purpose is to retrieve account notes from mainnet and store data from them in a file. The file (named 'accounts') is a stream of binary data. This data is the concatenation of all of the data related to an account:

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

## Building

Simply running `yarn build` should be sufficient

## Running

Running the app should simply be a case of running 'yarn start' with the required arguments:

Options:
-d, --directory <dir> Directory to output files
-a, --address <address> Address of rollup processor contract
-u, --url <url> Infura URL
-r, --rollupId <rollupId> Id of first required rollup (default: 0)
-c, --confirmations <confirmations> Num confirmations required on rollups (default: 0)
-l, --logDuplicates Log duplicate Public Key/Nonce/Signing Key combinations
-z, --aztecConnect Connects to an aztec connect version of the rollup contract
-h, --help display help for command

e.g. yarn start -d /mnt/user-data/phil -a 0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba -u "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35"

The output directory must be created prior to running the application
