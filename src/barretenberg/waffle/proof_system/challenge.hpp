#ifndef CHALLENGE_HPP
#define CHALLENGE_HPP

#include "stdint.h"

#include "../../fields/fr.hpp"
#include "../../fields/fq.hpp"

#include "../../types.hpp"
#include "../../keccak/keccak.h"

namespace waffle
{

inline void add_wire_commitments_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    barretenberg::fq::__from_montgomery_form(proof.W_L.x, *(barretenberg::fq::field_t *)&input_buffer[0]);
    barretenberg::fq::__from_montgomery_form(proof.W_L.y, *(barretenberg::fq::field_t *)&input_buffer[4]);
    barretenberg::fq::__from_montgomery_form(proof.W_R.x, *(barretenberg::fq::field_t *)&input_buffer[8]);
    barretenberg::fq::__from_montgomery_form(proof.W_R.y, *(barretenberg::fq::field_t *)&input_buffer[12]);
    barretenberg::fq::__from_montgomery_form(proof.W_O.x, *(barretenberg::fq::field_t *)&input_buffer[16]);
    barretenberg::fq::__from_montgomery_form(proof.W_O.y, *(barretenberg::fq::field_t *)&input_buffer[20]);
}

inline void add_grand_product_commitments_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    barretenberg::fq::__from_montgomery_form(proof.Z_1.x, *(barretenberg::fq::field_t *)&input_buffer[0]);
    barretenberg::fq::__from_montgomery_form(proof.Z_1.y, *(barretenberg::fq::field_t *)&input_buffer[4]);
}

inline void add_quotient_commitment_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    barretenberg::fq::__from_montgomery_form(proof.T_LO.x, *(barretenberg::fq::field_t *)&input_buffer[0]);
    barretenberg::fq::__from_montgomery_form(proof.T_LO.y, *(barretenberg::fq::field_t *)&input_buffer[4]);
    barretenberg::fq::__from_montgomery_form(proof.T_MID.x, *(barretenberg::fq::field_t *)&input_buffer[8]);
    barretenberg::fq::__from_montgomery_form(proof.T_MID.y, *(barretenberg::fq::field_t *)&input_buffer[12]);
    barretenberg::fq::__from_montgomery_form(proof.T_HI.x, *(barretenberg::fq::field_t *)&input_buffer[16]);
    barretenberg::fq::__from_montgomery_form(proof.T_HI.y, *(barretenberg::fq::field_t *)&input_buffer[20]);
}

inline void add_polynomial_evaluations_to_buffer(const plonk_proof &proof, const barretenberg::fr::field_t& t_eval, uint64_t* input_buffer)
{
    barretenberg::fr::__from_montgomery_form(proof.w_l_eval, *(barretenberg::fr::field_t*)&input_buffer[0]);
    barretenberg::fr::__from_montgomery_form(proof.w_r_eval, *(barretenberg::fr::field_t*)&input_buffer[4]);
    barretenberg::fr::__from_montgomery_form(proof.w_o_eval, *(barretenberg::fr::field_t*)&input_buffer[8]);
    barretenberg::fr::__from_montgomery_form(proof.sigma_1_eval, *(barretenberg::fr::field_t*)&input_buffer[12]);
    barretenberg::fr::__from_montgomery_form(proof.sigma_2_eval, *(barretenberg::fr::field_t*)&input_buffer[16]);
    barretenberg::fr::__from_montgomery_form(proof.z_1_shifted_eval, *(barretenberg::fr::field_t*)&input_buffer[20]);
    barretenberg::fr::__from_montgomery_form(proof.linear_eval, *(barretenberg::fr::field_t*)&input_buffer[24]);
    barretenberg::fr::__from_montgomery_form(t_eval, *(barretenberg::fr::field_t*)&input_buffer[28]);
}

inline void add_kate_elements_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    barretenberg::fq::__from_montgomery_form(proof.PI_Z.x, *(barretenberg::fq::field_t *)&input_buffer[0]);
    barretenberg::fq::__from_montgomery_form(proof.PI_Z.y, *(barretenberg::fq::field_t *)&input_buffer[4]);
    barretenberg::fq::__from_montgomery_form(proof.PI_Z_OMEGA.x, *(barretenberg::fq::field_t *)&input_buffer[8]);
    barretenberg::fq::__from_montgomery_form(proof.PI_Z_OMEGA.y, *(barretenberg::fq::field_t *)&input_buffer[12]);
}

inline barretenberg::fr::field_t compute_gamma(const plonk_proof &proof)
{
    barretenberg::fr::field_t gamma;
    uint64_t input_buffer[6 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    keccak256 hash = hash_field_elements(input_buffer, 6);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], gamma);
    barretenberg::fr::__to_montgomery_form(gamma, gamma);
    return gamma;
}

inline barretenberg::fr::field_t compute_beta(const plonk_proof &proof, const barretenberg::fr::field_t &alpha)
{
    barretenberg::fr::field_t beta;
    uint64_t input_buffer[7 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    barretenberg::fr::__from_montgomery_form(alpha, *(barretenberg::fr::field_t *)&input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 7);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], beta);
    barretenberg::fr::__to_montgomery_form(beta, beta);
    return beta;
}

inline barretenberg::fr::field_t compute_alpha(const plonk_proof &proof)
{
    barretenberg::fr::field_t alpha;
    uint64_t input_buffer[8 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 8);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], alpha);
    barretenberg::fr::__to_montgomery_form(alpha, alpha);
    return alpha;
}

inline barretenberg::fr::field_t compute_evaluation_challenge(const plonk_proof &proof)
{
    barretenberg::fr::field_t z;
    uint64_t input_buffer[14 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[32]);
    keccak256 hash = hash_field_elements(input_buffer, 14);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], z);
    barretenberg::fr::__to_montgomery_form(z, z);
    return z;
}

inline barretenberg::fr::field_t compute_linearisation_challenge(const plonk_proof &proof, const barretenberg::fr::field_t &t_eval)
{
    barretenberg::fr::field_t nu;
    uint64_t input_buffer[22 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[32]);
    add_polynomial_evaluations_to_buffer(proof, t_eval, &input_buffer[56]);
    keccak256 hash = hash_field_elements(input_buffer, 22);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], nu);
    barretenberg::fr::__to_montgomery_form(nu, nu);
    return nu;
}

inline barretenberg::fr::field_t compute_kate_separation_challenge(const plonk_proof &proof, const barretenberg::fr::field_t &t_eval)
{
    barretenberg::fr::field_t u;
    uint64_t input_buffer[26 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[32]);
    add_polynomial_evaluations_to_buffer(proof, t_eval, &input_buffer[56]);
    add_kate_elements_to_buffer(proof, &input_buffer[88]);
    keccak256 hash = hash_field_elements(input_buffer, 26);
    barretenberg::fr::copy(*(barretenberg::fr::field_t*)&hash.word64s[0], u);
    barretenberg::fr::__to_montgomery_form(u, u);
    return u;
}
}

#endif
