#pragma once

#include "../groups/pairing.hpp"
#include "../groups/scalar_multiplication.hpp"
#include "../polynomials/polynomials.hpp"
#include "../types.hpp"

namespace waffle
{
struct circuit_vectors
{
    fr::field_t *w_l;
    fr::field_t *w_r;
    fr::field_t *w_o;

    fr::field_t *sigma_1;
    fr::field_t *sigma_2;
    fr::field_t *sigma_3;
    fr::field_t *q_m;
    fr::field_t *q_l;
    fr::field_t *q_r;
    fr::field_t *q_o;
    fr::field_t *q_c;
};

struct plonk_proof
{
    // Kate polynomial commitments required for a proof of knowledge
    g1::affine_element W_L;
    g1::affine_element W_R;
    g1::affine_element W_O;
    g1::affine_element Z_1;
    g1::affine_element Z_2;
    g1::affine_element T;
    g1::affine_element PI_Z;
    g1::affine_element PI_Z_OMEGA;

    fr::field_t w_l_eval;
    fr::field_t w_r_eval;
    fr::field_t w_o_eval;
    fr::field_t s_id_eval;
    fr::field_t sigma_1_eval;
    fr::field_t sigma_2_eval;
    fr::field_t sigma_3_eval;
    fr::field_t t_eval;
    fr::field_t z_1_shifted_eval;
    fr::field_t z_2_shifted_eval;
    fr::field_t linear_eval;
};

struct runtime_state
{
    polynomials::evaluation_domain small_domain;
    polynomials::evaluation_domain mid_domain;
    polynomials::evaluation_domain large_domain;

    // random challenges
    fr::field_t gamma;
    fr::field_t beta;
    fr::field_t alpha;
    fr::field_t alpha_squared;
    fr::field_t alpha_cubed;
    fr::field_t z;
    fr::field_t nu;

    fr::field_t *w_l_poly;
    fr::field_t *w_r_poly;
    fr::field_t *w_o_poly;

    fr::field_t *s_id_poly;
    fr::field_t *sigma_1_poly;
    fr::field_t *sigma_2_poly;
    fr::field_t *sigma_3_poly;
    fr::field_t *q_m_poly;
    fr::field_t *q_l_poly;
    fr::field_t *q_r_poly;
    fr::field_t *q_o_poly;

    fr::field_t *l_1_poly;
};
// contains the state of a PLONK proof, including witness values, instance values
// and Kate polynomial commitments
struct circuit_state
{
    g1::affine_element W_L;
    g1::affine_element W_R;
    g1::affine_element W_O;
    g1::affine_element Z_1;
    g1::affine_element Z_2;
    g1::affine_element T;
    g1::affine_element PI_Z;
    g1::affine_element PI_Z_OMEGA;

    fr::field_t w_l_eval;
    fr::field_t w_r_eval;
    fr::field_t w_o_eval;
    fr::field_t s_id_eval;
    fr::field_t sigma_1_eval;
    fr::field_t sigma_2_eval;
    fr::field_t sigma_3_eval;
    fr::field_t t_eval;
    fr::field_t z_1_shifted_eval;
    fr::field_t z_2_shifted_eval;
    fr::field_t linear_eval;

    // random challenges
    fr::field_t gamma;
    fr::field_t beta;
    fr::field_t alpha;
    fr::field_t alpha_squared;
    fr::field_t alpha_cubed;
    fr::field_t z;
    fr::field_t nu;

    // pointers to witness vectors. Originally these are in Lagrange-base form,
    // during the course of proof construction, are replaced by their coefficient form
    fr::field_t *w_l;
    fr::field_t *w_r;
    fr::field_t *w_o;
    fr::field_t *z_1;
    fr::field_t *z_2;
    fr::field_t *t;
    fr::field_t *linear_poly;

    // pointers to instance vectors. Originally in Lagrange-base form,
    // will be converted into coefficient form
    fr::field_t *q_c;
    fr::field_t *q_m;
    fr::field_t *q_l;
    fr::field_t *q_r;
    fr::field_t *q_o;
    fr::field_t *sigma_1;
    fr::field_t *sigma_2;
    fr::field_t *sigma_3;
    fr::field_t *s_id;

    fr::field_t *product_1;
    fr::field_t *product_2;
    fr::field_t *product_3;
    fr::field_t *permutation_product;

    fr::field_t *w_l_lagrange_base;
    fr::field_t *w_r_lagrange_base;
    fr::field_t *w_o_lagrange_base;
    size_t n;

    polynomials::evaluation_domain small_domain;
    polynomials::evaluation_domain mid_domain;
    polynomials::evaluation_domain large_domain;
};

// Stores pointers to various polynomials required during proof construction
// Note: these pointers can overlap! We want to efficiently use available memory,
// and only a handful of these polynomials are required at any one time
struct fft_pointers
{
    fr::field_t *w_l_poly;
    fr::field_t *w_r_poly;
    fr::field_t *w_o_poly;
    fr::field_t *z_1_poly;
    fr::field_t *z_2_poly;

    fr::field_t *w_l_poly_small;
    fr::field_t *w_r_poly_small;
    fr::field_t *w_o_poly_small;
    fr::field_t *z_1_poly_small;
    fr::field_t *z_2_poly_small;
    fr::field_t *identity_poly;
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

void compute_wire_commitments(circuit_state &state, srs::plonk_srs &srs);

void compute_z_commitments(circuit_state &state, srs::plonk_srs &srs);

void compute_multiplication_gate_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_quotient_commitment(circuit_state &state, fr::field_t *coeffs, const srs::plonk_srs &srs);

void compute_permutation_grand_product_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_identity_grand_product_coefficients(circuit_state &state, fft_pointers &ffts);

void compute_quotient_polynomial(circuit_state &state, fft_pointers &ffts, srs::plonk_srs &reference_string);

void compute_linearisation_coefficients(circuit_state &state, fft_pointers &ffts);

void construct_proof(circuit_state &state, fft_pointers &ffts, srs::plonk_srs &reference_string);
} // namespace waffle