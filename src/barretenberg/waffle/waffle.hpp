#ifndef WAFFLE
#define WAFFLE

#include "../types.hpp"

namespace waffle
{
using namespace barretenberg;

// Stores pointers to various polynomials required during proof construction
// Note: these pointers can overlap! We want to efficiently use available memory,
// and only a handful of these polynomials are required at any one time


struct fft_pointers
{
    fr::field_t *w_l_poly;
    fr::field_t *w_r_poly;
    fr::field_t *w_o_poly;
    fr::field_t *z_1_poly;

    fr::field_t *w_l_poly_small;
    fr::field_t *w_r_poly_small;
    fr::field_t *w_o_poly_small;
    fr::field_t *z_1_poly_small;
    fr::field_t *gate_poly_mid;
    fr::field_t *gate_poly_long;

    fr::field_t *quotient_poly;

    fr::field_t *q_c_poly;
    fr::field_t *q_r_poly;
    fr::field_t *q_l_poly;
    fr::field_t *q_m_poly;
    fr::field_t *q_o_poly;
    fr::field_t *sigma_1_poly;
    fr::field_t *sigma_2_poly;
    fr::field_t *sigma_3_poly;
    fr::field_t *l_1_poly;
    fr::field_t *scratch_memory;
};

void compute_wire_coefficients(circuit_state &state, fft_pointers &);

void compute_z_coefficients(circuit_state &state, fft_pointers &);

void compute_wire_commitments(circuit_state &state, plonk_proof &proof, srs::plonk_srs &srs);

void compute_z_commitments(circuit_state &state, plonk_proof &proof, srs::plonk_srs &srs);

void compute_multiplication_gate_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_quotient_commitment(circuit_state &state, fr::field_t *coeffs, plonk_proof &proof, const srs::plonk_srs &srs);

void compute_permutation_grand_product_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_identity_grand_product_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_quotient_polynomial(circuit_state &state, fft_pointers &ffts, plonk_proof &proof, srs::plonk_srs &reference_string);

fr::field_t compute_linearisation_coefficients(circuit_state &state, fft_pointers &ffts, plonk_proof &proof);

plonk_proof construct_proof(circuit_state &state, srs::plonk_srs &reference_string);
} // namespace waffle

#endif