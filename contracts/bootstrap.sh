# Install Foundry if not yet installed
if [ ! -d ~/.foundry ]; then
  curl -L https://foundry.paradigm.xyz | bash
  ~/.foundry/bin/foundryup
fi


# Compile contracts
~/.foundry/bin/forge build