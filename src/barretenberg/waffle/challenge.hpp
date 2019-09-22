#pragma once

#include "stdint.h"

#include "../fields/fr.hpp"
#include "../fields/fq.hpp"

#include "../types.hpp"
#include "../keccak/keccak.h"

namespace waffle
{
using namespace barretenberg;

inline void add_wire_commitments_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fq::from_montgomery_form(proof.W_L.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(proof.W_L.y, *(fq::field_t *)&input_buffer[4]);
    fq::from_montgomery_form(proof.W_R.x, *(fq::field_t *)&input_buffer[8]);
    fq::from_montgomery_form(proof.W_R.y, *(fq::field_t *)&input_buffer[12]);
    fq::from_montgomery_form(proof.W_O.x, *(fq::field_t *)&input_buffer[16]);
    fq::from_montgomery_form(proof.W_O.y, *(fq::field_t *)&input_buffer[20]);
}

inline void add_grand_product_commitments_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fq::from_montgomery_form(proof.Z_1.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(proof.Z_1.y, *(fq::field_t *)&input_buffer[4]);
    fq::from_montgomery_form(proof.Z_2.x, *(fq::field_t *)&input_buffer[8]);
    fq::from_montgomery_form(proof.Z_2.y, *(fq::field_t *)&input_buffer[12]);
}

inline void add_quotient_commitment_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fq::from_montgomery_form(proof.T.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(proof.T.y, *(fq::field_t *)&input_buffer[4]);
}

// one gate in 35.9 microseconds...

inline void add_polynomial_evaluations_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fr::from_montgomery_form(proof.w_l_eval, *(fr::field_t*)&input_buffer[0]);
    fr::from_montgomery_form(proof.w_r_eval, *(fr::field_t*)&input_buffer[4]);
    fr::from_montgomery_form(proof.w_o_eval, *(fr::field_t*)&input_buffer[8]);
    fr::from_montgomery_form(proof.s_id_eval, *(fr::field_t*)&input_buffer[12]);
    fr::from_montgomery_form(proof.sigma_1_eval, *(fr::field_t*)&input_buffer[16]);
    fr::from_montgomery_form(proof.sigma_2_eval, *(fr::field_t*)&input_buffer[20]);
    fr::from_montgomery_form(proof.sigma_3_eval, *(fr::field_t*)&input_buffer[24]);
    fr::from_montgomery_form(proof.z_1_shifted_eval, *(fr::field_t*)&input_buffer[28]);
    fr::from_montgomery_form(proof.z_2_shifted_eval, *(fr::field_t*)&input_buffer[32]);
    // fr::from_montgomery_form(proof.t_eval, *(fr::field_t*)&input_buffer[36]);
    fr::from_montgomery_form(proof.linear_eval, *(fr::field_t*)&input_buffer[40]);
}

inline fr::field_t compute_gamma(const plonk_proof &proof)
{
    fr::field_t gamma;
    uint64_t input_buffer[6 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    keccak256 hash = hash_field_elements(input_buffer, 6);
    fr::copy(*(fr::field_t*)&hash.word64s[0], gamma);
    fr::to_montgomery_form(gamma, gamma);
    return gamma;
}

inline fr::field_t compute_beta(const plonk_proof &proof, const fr::field_t &alpha)
{
    fr::field_t beta;
    uint64_t input_buffer[7 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    fr::from_montgomery_form(alpha, *(fr::field_t *)&input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 7);
    fr::copy(*(fr::field_t*)&hash.word64s[0], beta);
    fr::to_montgomery_form(beta, beta);
    return beta;
}

inline fr::field_t compute_alpha(const plonk_proof &proof)
{
    fr::field_t alpha;
    uint64_t input_buffer[10 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 10);
    fr::copy(*(fr::field_t*)&hash.word64s[0], alpha);
    fr::to_montgomery_form(alpha, alpha);
    return alpha;
    // fr::sqr(state.alpha, state.alpha_squared);
    // fr::mul(state.alpha, state.alpha_squared, state.alpha_cubed);
}

inline fr::field_t compute_evaluation_challenge(const plonk_proof &proof)
{
    fr::field_t z;
    uint64_t input_buffer[12 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[40]);
    keccak256 hash = hash_field_elements(input_buffer, 12);
    fr::copy(*(fr::field_t*)&hash.word64s[0], z);
    fr::to_montgomery_form(z, z);
    return z;
}

inline fr::field_t compute_linearisation_challenge(const plonk_proof &proof)
{
    fr::field_t nu;
    uint64_t input_buffer[23 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[40]);
    add_polynomial_evaluations_to_buffer(proof, &input_buffer[48]);
    keccak256 hash = hash_field_elements(input_buffer, 23);
    fr::copy(*(fr::field_t*)&hash.word64s[0], nu);
    fr::to_montgomery_form(nu, nu);
    return nu;
}
}