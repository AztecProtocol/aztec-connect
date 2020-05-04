# Hummus README

`Hummus` is our rollup front-end. It currently uses the webassembly build of `Barretenberg`, through `barretenberg.js`, to construct proofs.

# Getting started

You will need to compile `Barretenberg`, link it with `barretenberg.js`, and install and build `Hummus`. You can do this simply by calling `./bootstrap.sh` at the root of the repo.

Once bootstrapped, you are ready to launch the front-end:

`yarn start`

Once that process is finished, you can open your browser to `http://localhost:8080/` to start building proofs. The UI should be self-explanatory.