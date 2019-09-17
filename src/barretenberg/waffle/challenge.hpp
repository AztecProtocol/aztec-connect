#pragma once

#include "stdint.h"

#include "../fields/fr.hpp"
#include "../fields/fq.hpp"

#include "../types.hpp"
#include "../keccak/keccak.h"

namespace waffle
{
void add_wire_commitments_to_buffer(circuit_state &state, uint64_t* input_buffer)
{
    fq::from_montgomery_form(state.W_L.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(state.W_L.y, *(fq::field_t *)&input_buffer[4]);
    fq::from_montgomery_form(state.W_R.x, *(fq::field_t *)&input_buffer[8]);
    fq::from_montgomery_form(state.W_R.y, *(fq::field_t *)&input_buffer[12]);
    fq::from_montgomery_form(state.W_O.x, *(fq::field_t *)&input_buffer[16]);
    fq::from_montgomery_form(state.W_O.y, *(fq::field_t *)&input_buffer[20]);
}

void add_grand_product_commitments_to_buffer(circuit_state &state, uint64_t* input_buffer)
{
    fq::from_montgomery_form(state.Z_1.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(state.Z_1.y, *(fq::field_t *)&input_buffer[4]);
    fq::from_montgomery_form(state.Z_2.x, *(fq::field_t *)&input_buffer[8]);
    fq::from_montgomery_form(state.Z_2.y, *(fq::field_t *)&input_buffer[12]);
}

void add_quotient_commitment_to_buffer(circuit_state &state, uint64_t* input_buffer)
{
    fq::from_montgomery_form(state.T.x, *(fq::field_t *)&input_buffer[0]);
    fq::from_montgomery_form(state.T.y, *(fq::field_t *)&input_buffer[4]);
}

void add_polynomial_evaluations_to_buffer(circuit_state &state, uint64_t* input_buffer)
{
    fr::from_montgomery_form(state.w_l_eval, *(fr::field_t*)input_buffer[0]);
    fr::from_montgomery_form(state.w_r_eval, *(fr::field_t*)input_buffer[8]);
    fr::from_montgomery_form(state.w_o_eval, *(fr::field_t*)input_buffer[16]);
    fr::from_montgomery_form(state.s_id_eval, *(fr::field_t*)input_buffer[24]);
    fr::from_montgomery_form(state.sigma_1_eval, *(fr::field_t*)input_buffer[32]);
    fr::from_montgomery_form(state.sigma_2_eval, *(fr::field_t*)input_buffer[40]);
    fr::from_montgomery_form(state.sigma_3_eval, *(fr::field_t*)input_buffer[48]);
    fr::from_montgomery_form(state.z_1_shifted_eval, *(fr::field_t*)input_buffer[56]);
    fr::from_montgomery_form(state.z_2_shifted_eval, *(fr::field_t*)input_buffer[64]);
    fr::from_montgomery_form(state.t_eval, *(fr::field_t*)input_buffer[72]);
    fr::from_montgomery_form(state.linear_eval, *(fr::field_t*)input_buffer[80]);
}

void compute_gamma(circuit_state &state)
{
    uint64_t input_buffer[6 * 4];
    add_wire_commitments_to_buffer(state, input_buffer);
    keccak256 hash = hash_field_elements(input_buffer, 6);
    fr::copy(*(fr::field_t*)&hash.word64s[0], state.gamma);
    fr::to_montgomery_form(state.gamma, state.gamma);
}

void compute_beta(circuit_state &state)
{
    uint64_t input_buffer[7 * 4];
    add_wire_commitments_to_buffer(state, input_buffer);
    fr::from_montgomery_form(state.alpha, *(fr::field_t *)&input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 7);
    fr::copy(*(fr::field_t*)&hash.word64s[0], state.beta);
    fr::to_montgomery_form(state.beta, state.beta);
}

void compute_alpha(circuit_state &state)
{
    uint64_t input_buffer[10 * 4];
    add_wire_commitments_to_buffer(state, input_buffer);
    add_grand_product_commitments_to_buffer(state, &input_buffer[24]);
    keccak256 hash = hash_field_elements(input_buffer, 10);
    fr::copy(*(fr::field_t*)&hash.word64s[0], state.alpha);
    fr::to_montgomery_form(state.alpha, state.alpha);
    fr::sqr(state.alpha, state.alpha_squared);
    fr::mul(state.alpha, state.alpha_squared, state.alpha_cubed);
}

void compute_evaluation_challenge(circuit_state &state)
{
    uint64_t input_buffer[12 * 4];
    add_wire_commitments_to_buffer(state, input_buffer);
    add_grand_product_commitments_to_buffer(state, &input_buffer[24]);
    add_quotient_commitment_to_buffer(state, &input_buffer[40]);
    keccak256 hash = hash_field_elements(input_buffer, 12);
    fr::copy(*(fr::field_t*)&hash.word64s[0], state.z);
    fr::to_montgomery_form(state.z, state.z);
}

void compute_linearisation_challenge(circuit_state &state)
{
    uint64_t input_buffer[23 * 4];
    add_wire_commitments_to_buffer(state, input_buffer);
    add_grand_product_commitments_to_buffer(state, &input_buffer[24]);
    add_quotient_commitment_to_buffer(state, &input_buffer[40]);
    add_polynomial_evaluations_to_buffer(state, &input_buffer[48]);
    keccak256 hash = hash_field_elements(input_buffer, 23);
    fr::copy(*(fr::field_t*)&hash.word64s[0], state.nu);
    fr::to_montgomery_form(state.nu, state.nu);
}
}