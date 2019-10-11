#ifndef CHALLENGE
#define CHALLENGE

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
    fq::__from_montgomery_form(proof.W_L.x, *(fq::field_t *)&input_buffer[0]);
    fq::__from_montgomery_form(proof.W_L.y, *(fq::field_t *)&input_buffer[4]);
    fq::__from_montgomery_form(proof.W_R.x, *(fq::field_t *)&input_buffer[8]);
    fq::__from_montgomery_form(proof.W_R.y, *(fq::field_t *)&input_buffer[12]);
    fq::__from_montgomery_form(proof.W_O.x, *(fq::field_t *)&input_buffer[16]);
    fq::__from_montgomery_form(proof.W_O.y, *(fq::field_t *)&input_buffer[20]);
}

inline void add_grand_product_commitments_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fq::__from_montgomery_form(proof.Z_1.x, *(fq::field_t *)&input_buffer[0]);
    fq::__from_montgomery_form(proof.Z_1.y, *(fq::field_t *)&input_buffer[4]);
}

inline void add_quotient_commitment_to_buffer(const plonk_proof &proof, uint64_t* input_buffer)
{
    fq::__from_montgomery_form(proof.T_LO.x, *(fq::field_t *)&input_buffer[0]);
    fq::__from_montgomery_form(proof.T_LO.y, *(fq::field_t *)&input_buffer[4]);
    fq::__from_montgomery_form(proof.T_MID.x, *(fq::field_t *)&input_buffer[8]);
    fq::__from_montgomery_form(proof.T_MID.y, *(fq::field_t *)&input_buffer[12]);
    fq::__from_montgomery_form(proof.T_HI.x, *(fq::field_t *)&input_buffer[16]);
    fq::__from_montgomery_form(proof.T_HI.y, *(fq::field_t *)&input_buffer[20]);
}

inline void add_polynomial_evaluations_to_buffer(const plonk_proof &proof, const fr::field_t& t_eval, uint64_t* input_buffer)
{
    fr::__from_montgomery_form(proof.w_l_eval, *(fr::field_t*)&input_buffer[0]);
    fr::__from_montgomery_form(proof.w_r_eval, *(fr::field_t*)&input_buffer[4]);
    fr::__from_montgomery_form(proof.w_o_eval, *(fr::field_t*)&input_buffer[8]);
    fr::__from_montgomery_form(proof.sigma_1_eval, *(fr::field_t*)&input_buffer[12]);
    fr::__from_montgomery_form(proof.sigma_2_eval, *(fr::field_t*)&input_buffer[16]);
    fr::__from_montgomery_form(proof.z_1_shifted_eval, *(fr::field_t*)&input_buffer[20]);
    fr::__from_montgomery_form(proof.linear_eval, *(fr::field_t*)&input_buffer[24]);
    fr::__from_montgomery_form(t_eval, *(fr::field_t*)&input_buffer[28]);
}

inline fr::field_t compute_gamma(const plonk_proof &proof)
{
    fr::field_t gamma;
    uint64_t input_buffer[6 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    keccak256 hash = hash_field_elements(input_buffer, 6);
    fr::copy(*(fr::field_t*)&hash.word64s[0], gamma);
    fr::__to_montgomery_form(gamma, gamma);
    return gamma;
}

inline fr::field_t compute_beta(const plonk_proof &proof, const fr::field_t &alpha)
{
    fr::field_t beta;
    uint64_t input_buffer[7 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    fr::__from_montgomery_form(alpha, *(fr::field_t *)&input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 7);
    fr::copy(*(fr::field_t*)&hash.word64s[0], beta);
    fr::__to_montgomery_form(beta, beta);
    return beta;
}

inline fr::field_t compute_alpha(const plonk_proof &proof)
{
    fr::field_t alpha;
    uint64_t input_buffer[8 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 8);
    fr::copy(*(fr::field_t*)&hash.word64s[0], alpha);
    fr::__to_montgomery_form(alpha, alpha);
    return alpha;
}

inline fr::field_t compute_evaluation_challenge(const plonk_proof &proof)
{
    fr::field_t z;
    uint64_t input_buffer[14 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[32]);
    keccak256 hash = hash_field_elements(input_buffer, 14);
    fr::copy(*(fr::field_t*)&hash.word64s[0], z);
    fr::__to_montgomery_form(z, z);
    return z;
}

inline fr::field_t compute_linearisation_challenge(const plonk_proof &proof, const fr::field_t &t_eval)
{
    fr::field_t nu;
    uint64_t input_buffer[22 * 4];
    add_wire_commitments_to_buffer(proof, input_buffer);
    add_grand_product_commitments_to_buffer(proof, &input_buffer[24]);
    add_quotient_commitment_to_buffer(proof, &input_buffer[32]);
    add_polynomial_evaluations_to_buffer(proof, t_eval, &input_buffer[56]);
    keccak256 hash = hash_field_elements(input_buffer, 22);
    fr::copy(*(fr::field_t*)&hash.word64s[0], nu);
    fr::__to_montgomery_form(nu, nu);
    return nu;
}
}

#endif
