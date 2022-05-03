# Code Freeze Fall 2021: Schnorr signatures

###### tags: `project-notes`

The code is templated in such a way that the primes $q$ and $r$ are defined relative to the group `G1`, which is unfortunate, since $r$ is chosen as a fixed, definite value in our specs. An alternative would be to have the templates in schnorr.tcc refer to `F_nat` and `F_em`  (for 'native' and 'emulated') or something like this. The easier and probably better alternative for now is to just rename our primes in the Yellow Paper as $p_{\text{B}}$ and $p_{\text{G}}$.

For Aztec's current uses cases, `G1` is a cyclic subgroup of an elliptic curve defined over a field $\mathbb{F}_q$ (implemented as a class `Fq`), and `Fr` (aka `field_t`) is the a field of size equal to the size of `G1`, so `Fr` is the field acting on `G1` by scalar multiplication. 

# Role:
Yellow paper only mentions them here: _The Blake2s hash is utilized for computing nullifiers and for generating pseudorandom challenges, when verifying Schnorr signatures and when recursively verifying Plonk proofs_.

They are used by the account circuit and the join-split circuit.

# Data types
`crypto::schnorr::signature` is a pair $(s, e)$ of two 256-bit integers represented as length-32 `std::array`'s of `uint32_t`'s. 

`crypto::schnorr::signature_b` is a pair $(s, r)$ of the same type.

`wnaf_record<C>` is a vector of `bool_t<C>`'s along with a skew.

`signature_bits<C>` is four `field_t`'s, representing a signature $(s, e)$ by splitting component into two.

# Formulas
## Elliptic curve addition.

We restrict in this code to working with curves described by Weierstrass equations of the form $y^2 = x^3 + B$ defined over a $\mathbb{F}_r$ with $r$ prime. Consider two non-identity points $P_1 = (x_1, y_1)$, $P_2 = (x_2, y_2)$. If $x_1 = x_2$, then $y_1 = \pm y_2$, so the two points are equal or one is the inverse of the other. If $y_1 = y_2$, then one has $x_1 = \zeta x_2$ with $\zeta^3=1$. In the case of Grumpkin, the equation $X^3-1$ splits over $\mathbb{F}_r$, there are indeed distinct pairs of points satisfying this relation (for an example of how we handle this elsewhere in the code base, see https://github.com/AztecProtocol/aztec2-internal/issues/437).

Suppose $P_1 \neq - P_2$. Then $P_1 + P_2 = (x_3, y_3)$ with
$$ x_3 = \lambda^2 - (x_1 + x_2), \quad y_3 = \lambda.(x_1 - x_3) - y_1 $$
where $\lambda = \dfrac{y_2 - y_1}{x_2 - x_1}$ if $P_1 \neq P_2$ and $\lambda = \dfrac{3x_1^2}{2y_1}$ if $P_1 = P_2$.
# Algorithms

Let $g$ be a generator of $\mathbb{G}_1$.

## Sign

We use signatures with compression as described in Section 19.2.3 of [BS], in the sense that the signature contains the hash, meaning that the signature contains a hash and a field element, rather than a group element and a field element. 

The algorithm: Given a message $m$, an account $(\text{priv}, \text{pub})\in \mathbb{F}_r \times \mathbb{G}_1$ produces the signature 
$$\text{Sig} = (s, e) = (k - \text{priv} \cdot h(r, m), h(r, m)) \in \mathbb{F}_r \times \mathbb{F}_r, $$ 
where:
  - $k \leftarrow \mathbb{F}_r$;
  - $r$ is the $x$-coordinate of the scalar multiplication $k\cdot g$;
  - $h$ is a hash function modeling a random oracle.

## Verify
Given $\text{Sig} = (s, e)\in \mathbb{F}_r^2$, purported to be the signature of a messages $m$ by an account $(\text{priv}, \text{pub})\in \mathbb{F}_r \times \mathbb{G}_1$ with respect to a random oracle hash function $h$, compute
  - $r = $ the $x$-coordinate of $e\cdot \text{pub} + s\cdot g$;
  - $e' = h(r, m)$.

The signature is verified if and only if $e'== e$.

Imprecise rationale: The verification equation is $e = h((e.pub + s.g).x, m)$ for a generic element $e\in \mathbb{F_r}$. VERIFIER has seen that SIGNER can produce a preimage for a given $e$ which is outside of SIGNER's control by chosing a particular value of $s$. The difficulty of this assumption is documented, in the case where $\mathbb{G}_1$ is the units group of a finite field, in Schnorr's original paper [Sch] (cf especially pages 10-11).

## Variable base multiplication
### scalar presented as `bit_array`
### scalar presented as a `wnaf_record`, provided along with a `current_accumulator`

# Code Paths

## `verify_signature`
 - There is an aborted state reached if $s\cdot g$ and $e\cdot pub$ have the same x-coordinate. 
 - Normal signature verification path.

## `variable_base_mul(pub_key, current_accumulator, wnaf)`
  - This function is only called inside of `variable_base_mul(pub_key, low_bits, high_bits)`. There is an `init` predicate given by: "`current_accumulator` and `pub_key` have the same x-coordinate". This is intended as a stand-in for the more general check that these two points are equal. This condition distinguishes between two modes in which the function is used in the implementation of the function `variable_base_mul(pub_key, low_bits, high_bits)`: on the second call, the condition `init` is espected to be false, so that the results of the first call, recorded in `current_accumulator`, are incorporated in the output.
  - There is branching depending on whether on the parity of the scalar represented by `wnaf`.

## `variable_base_mul(pub_key, low_bits, high_bits)`
  - There is an aborted state that is reached when either of the field elements is zero.

## `convert_signature(scontext, signature)`
There is no branching here.

## `convert_message(context, message_string)`
This function has not been investigated since I propose it be removed. It is not used or tested.

## `convert_field_into_wnaf(context, limb)`
- When accumulating a `field_t` element using the proposed wnaf representaiton, there is branching at each bit position depending on the 32nd digit of the current `uint64_t` element `wnaf_entries[i+1]`. 

# References

WNAF representation: https://github.com/bitcoin-core/secp256k1/blob/master/src/ecmult_impl.h, circa line 151

NOTE: the original NAF paper Morain, Olivos, "Speeding up the computations...", 1990 has a sign error in displayed equation (7). This is not present in our `variable_base_mul` function.

[BS20] Boneh, D., Shoup, V "A Graduate Course in Applied Cryptography" Version 0.5, January 2020.

[Sch] Schnorr, C. "Efficient Identification and Signatures for Smart Cards", 1990.