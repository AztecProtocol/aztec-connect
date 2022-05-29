# Frequently Asked Questions

## Join Split Circuit

Q: Why do we need to verify a signature in the circuit? Why doesn't it suffice to simply compute the public key from its secret key, as a way of showing willingness to spend the notes?

A: By passing a signature to the circuit, the 'signing private key' doesn't need to be passed to the proof construction software. This is useful for multisigs, offline signing, etc., so that the proof construction software (or machine) doesn't have access to the signing private key.

Q: Why does having no input notes imply a deposit, but being a deposit, doesn't imply having no input notes?

A: It maybe desirable to allow a user to deposit funds into the system, while at the same time merging those funds with an existing input note, to reduce note fragmentation.