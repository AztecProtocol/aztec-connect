# Install Foundry if not yet installed
if [ ! -d ~/.foundry ]; then
  curl -L https://foundry.paradigm.xyz | bash
  ~/.foundry/bin/foundryup
fi

# Install 
~/.foundry/bin/forge install --no-commit

# Update
~/.foundry/bin/forge update

# Compile contracts
~/.foundry/bin/forge build