#include "./waffle.hpp"
#include "./challenge.hpp"
#include "./linearizer.hpp"

#include "string.h"
#include "stddef.h"
#include "stdint.h"


namespace waffle
{
using namespace barretenberg;

void compute_wire_coefficients(circuit_state &state, fft_pointers &)
{
    const size_t n = state.n;

    polynomials::copy_polynomial(state.w_l, state.w_l_lagrange_base, n, n);
    polynomials::copy_polynomial(state.w_r, state.w_r_lagrange_base, n, n);
    polynomials::copy_polynomial(state.w_o, state.w_o_lagrange_base, n, n);

    polynomials::ifft(state.w_l, state.small_domain);
    polynomials::ifft(state.w_r, state.small_domain);
    polynomials::ifft(state.w_o, state.small_domain);
}

void compute_z_coefficients(circuit_state &state, fft_pointers &)
{
    const size_t n = state.n;
    // compute Z1, Z2
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t beta_n = {.data = {n, 0, 0, 0}};
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, state.challenges.beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);

    fr::field_t beta_identity = {.data = {0, 0, 0, 0}};
    // for the sigma permutation, as we compute each product term, store the intermediates in `product_1/2/3`.

    fr::one(state.z_1[0]);
    fr::one(state.z_2[0]);

    // TODO: try and multithread this.
    // Hard to do perfectly, but we can consume at least 6 cores by running grand products in parallel
    for (size_t i = 0; i < n - 1; ++i)
    {
        fr::add(beta_identity, state.challenges.beta, beta_identity);

        fr::add(beta_identity, state.challenges.gamma, T0);
        fr::add(T0, state.w_l_lagrange_base[i], T0);

        fr::add(beta_identity, state.challenges.gamma, T1);
        fr::add(T1, beta_n, T1);
        fr::add(T1, state.w_r_lagrange_base[i], T1);

        //  fr::mul(state.z_1[i+1], T0, state.z_1[i+1]);

        fr::add(beta_identity, state.challenges.gamma, T2);
        fr::add(T2, beta_n_2, T2);
        fr::add(T2, state.w_o_lagrange_base[i], T2);

        // fr::mul(state.z_1[i+1], T0, state.z_1[i+1]);
        fr::mul(T0, T1, T0);
        fr::mul(T0, T2, T0);
        fr::mul(T0, state.z_1[i], state.z_1[i + 1]);

        fr::mul(state.sigma_1[i], state.challenges.beta, T0);
        fr::add(T0, state.challenges.gamma, T0);
        fr::add(T0, state.w_l_lagrange_base[i], T0);

        fr::mul(state.sigma_2[i], state.challenges.beta, T1);
        fr::add(T1, state.challenges.gamma, T1);
        fr::add(T1, state.w_r_lagrange_base[i], T1);

        fr::mul(state.sigma_3[i], state.challenges.beta, T2);
        fr::add(T2, state.challenges.gamma, T2);
        fr::add(T2, state.w_o_lagrange_base[i], T2);

        fr::mul(T0, T1, T0);
        fr::mul(T0, T2, T0);
        fr::mul(T0, state.z_2[i], state.z_2[i + 1]);
    }

    polynomials::ifft(state.z_1, state.small_domain);
    polynomials::ifft(state.z_2, state.small_domain);
}

inline void compute_wire_commitments(circuit_state &state, plonk_proof &proof, srs::plonk_srs &srs)
{
    size_t n = state.n;

    scalar_multiplication::multiplication_state mul_state[3];
    mul_state[0].num_elements = n;
    mul_state[0].scalars = &state.w_l[0];
    mul_state[0].points = srs.monomials;
    mul_state[1].num_elements = n;
    mul_state[1].scalars = &state.w_r[0];
    mul_state[1].points = srs.monomials;
    mul_state[2].num_elements = n;
    mul_state[2].scalars = &state.w_o[0];
    mul_state[2].points = srs.monomials;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    // TODO: make a method for normal-to-affine copies :/
    fq::copy(mul_state[0].output.x, proof.W_L.x);
    fq::copy(mul_state[1].output.x, proof.W_R.x);
    fq::copy(mul_state[2].output.x, proof.W_O.x);
    fq::copy(mul_state[0].output.y, proof.W_L.y);
    fq::copy(mul_state[1].output.y, proof.W_R.y);
    fq::copy(mul_state[2].output.y, proof.W_O.y);

    // compute beta, gamma
    state.challenges.gamma = compute_gamma(proof);
    state.challenges.beta = compute_beta(proof, state.challenges.gamma);
}

void compute_z_commitments(circuit_state &state, plonk_proof &proof, srs::plonk_srs &srs)
{
    size_t n = state.n;
    scalar_multiplication::multiplication_state mul_state[3];

    mul_state[0].num_elements = n;
    mul_state[0].scalars = &state.z_1[0];
    mul_state[0].points = srs.monomials;
    mul_state[1].num_elements = n;
    mul_state[1].scalars = &state.z_2[0];
    mul_state[1].points = srs.monomials;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);

    // TODO: make a method for normal-to-affine copies :/
    fq::copy(mul_state[0].output.x, proof.Z_1.x);
    fq::copy(mul_state[1].output.x, proof.Z_2.x);
    fq::copy(mul_state[0].output.y, proof.Z_1.y);
    fq::copy(mul_state[1].output.y, proof.Z_2.y);

    // compute alpha
    // TODO: does this really belong here?
    state.challenges.alpha = compute_alpha(proof);
    fr::mul(state.challenges.alpha, state.challenges.alpha, state.alpha_squared);
    fr::mul(state.alpha_squared, state.challenges.alpha, state.alpha_cubed);
}

void compute_multiplication_gate_coefficients(circuit_state &state, fft_pointers &ffts)
{
    // The next step is to compute q_m.w_l.w_r - we need a 4n fft for this
    // requisition the memory that w_o was using
    polynomials::ifft(state.q_m, state.small_domain);
    polynomials::copy_polynomial(state.q_m, ffts.q_m_poly, state.small_domain.size, state.large_domain.size);
    polynomials::fft_with_coset_and_constant(ffts.q_m_poly, state.large_domain, state.challenges.alpha);

    ITERATE_OVER_DOMAIN_START(state.large_domain);
    fr::field_t T0;
    fr::mul(ffts.w_l_poly[i], ffts.w_r_poly[i], T0);
    fr::mul(T0, ffts.q_m_poly[i], T0);
    fr::add(ffts.quotient_poly[i], T0, ffts.quotient_poly[i]);
    ITERATE_OVER_DOMAIN_END;
}

void compute_quotient_commitment(circuit_state &state, fr::field_t *coeffs, plonk_proof &proof, const srs::plonk_srs &srs)
{
    size_t n = state.n;
    scalar_multiplication::multiplication_state mul_state[3];

    mul_state[0].scalars = coeffs;
    mul_state[1].scalars = &coeffs[n];
    mul_state[2].scalars = &coeffs[2 * n];

    mul_state[0].points = srs.monomials;
    mul_state[1].points = srs.monomials;
    mul_state[2].points = srs.monomials;

    mul_state[0].num_elements = n;
    mul_state[1].num_elements = n;
    mul_state[2].num_elements = n;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    g1::jacobian_to_affine(mul_state[0].output, proof.T_LO);
    g1::jacobian_to_affine(mul_state[1].output, proof.T_MID);
    g1::jacobian_to_affine(mul_state[2].output, proof.T_HI);

    state.challenges.z = compute_evaluation_challenge(proof);
}

void compute_permutation_grand_product_coefficients(circuit_state &state, fft_pointers &ffts)
{
    // The final steps are:
    // 1: Compute the permutation grand product
    // 2: Compute permutation check coefficients
    size_t n = state.n;

    polynomials::copy_polynomial(state.w_l, &ffts.w_l_poly[0], state.small_domain.size, state.large_domain.size);
    polynomials::copy_polynomial(state.w_r, &ffts.w_r_poly[0], state.small_domain.size, state.large_domain.size);
    polynomials::copy_polynomial(state.w_o, &ffts.w_o_poly[0], state.small_domain.size, state.large_domain.size);
    polynomials::fft_with_coset(ffts.w_l_poly, state.large_domain);
    polynomials::fft_with_coset(ffts.w_r_poly, state.large_domain);
    polynomials::fft_with_coset(ffts.w_o_poly, state.large_domain);

    // when computing coefficients of sigma_1, sigma_2, sigma_3, scale the polynomial by \beta to save a mul
    polynomials::ifft_with_constant(state.sigma_1, state.small_domain, state.challenges.beta);
    polynomials::ifft_with_constant(state.sigma_2, state.small_domain, state.challenges.beta);
    polynomials::ifft_with_constant(state.sigma_3, state.small_domain, state.challenges.beta);

    polynomials::copy_polynomial(state.sigma_1, ffts.sigma_1_poly, n, 4 * n);
    // add `gamma/beta` to sigma_1(X), so that we don't have to add it into each evaluation
    // and add w_l(X) as well for good measure

    fr::add(ffts.sigma_1_poly[0], state.challenges.gamma, ffts.sigma_1_poly[0]);

    polynomials::add(ffts.sigma_1_poly, state.w_l, ffts.sigma_1_poly, state.small_domain);

    polynomials::fft_with_coset(ffts.sigma_1_poly, state.large_domain);

    // repeat for sigma_2, sigma_3, multiplying each term into sigma_1
    polynomials::copy_polynomial(state.sigma_2, ffts.sigma_2_poly, n, 4 * n);
    fr::add(ffts.sigma_2_poly[0], state.challenges.gamma, ffts.sigma_2_poly[0]);

    polynomials::add(ffts.sigma_2_poly, state.w_r, ffts.sigma_2_poly, state.small_domain);

    polynomials::fft_with_coset(ffts.sigma_2_poly, state.large_domain);

    polynomials::mul(ffts.sigma_1_poly, ffts.sigma_2_poly, ffts.sigma_1_poly, state.large_domain);

    polynomials::copy_polynomial(state.sigma_3, ffts.sigma_3_poly, n, 4 * n);
    fr::add(ffts.sigma_3_poly[0], state.challenges.gamma, ffts.sigma_3_poly[0]);

    polynomials::add(ffts.sigma_3_poly, state.w_o, ffts.sigma_3_poly, state.small_domain);

    polynomials::fft_with_coset(ffts.sigma_3_poly, state.large_domain);

    polynomials::mul(ffts.sigma_1_poly, ffts.sigma_3_poly, ffts.sigma_1_poly, state.large_domain);

    polynomials::copy_polynomial(state.z_2, ffts.z_2_poly, state.small_domain.size, state.large_domain.size);
    polynomials::fft_with_coset_and_constant(ffts.z_2_poly, state.large_domain, state.alpha_cubed);
    fr::copy(ffts.z_2_poly[0], ffts.z_2_poly[state.large_domain.size]);
    fr::copy(ffts.z_2_poly[1], ffts.z_2_poly[state.large_domain.size + 1]);
    fr::copy(ffts.z_2_poly[2], ffts.z_2_poly[state.large_domain.size + 2]);
    fr::copy(ffts.z_2_poly[3], ffts.z_2_poly[state.large_domain.size + 3]);
    fr::field_t *shifted_z_2_poly = &ffts.z_2_poly[4];

    ITERATE_OVER_DOMAIN_START(state.large_domain);
        fr::mul(ffts.sigma_1_poly[i], ffts.z_2_poly[i], ffts.sigma_1_poly[i]);
        fr::sub(ffts.sigma_1_poly[i], shifted_z_2_poly[i], ffts.quotient_poly[i]);
    ITERATE_OVER_DOMAIN_END;

    polynomials::compress_fft(ffts.z_2_poly, ffts.z_2_poly_small, state.large_domain.size + 4, 2);
}

void compute_identity_grand_product_coefficients(circuit_state &state, fft_pointers &ffts)
{
    // TODO: optimize this!
    fr::one(state.s_id[0]);
    fr::field_t one;
    fr::one(one);
    for (size_t i = 1; i < state.n - 1; ++i)
    {
        fr::add(state.s_id[i - 1], one, state.s_id[i]);
    }
    fr::zero(state.s_id[state.n - 1]);
    polynomials::ifft_with_constant(state.s_id, state.small_domain, state.challenges.beta);
    polynomials::copy_polynomial(state.s_id, ffts.identity_poly, state.small_domain.size, state.large_domain.size);

    fr::add(ffts.identity_poly[0], state.challenges.gamma, ffts.identity_poly[0]);
    polynomials::fft_with_coset(ffts.identity_poly, state.large_domain);

    // compute partial identity grand product
    fr::field_t beta_n = {.data = {state.n, 0, 0, 0}};
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, state.challenges.beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);

    ITERATE_OVER_DOMAIN_START(state.large_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::add(ffts.identity_poly[i], ffts.w_l_poly[i], T0);
        fr::add(ffts.identity_poly[i], ffts.w_r_poly[i], T1);
        fr::add(ffts.identity_poly[i], ffts.w_o_poly[i], T2);
        fr::add(T1, beta_n, T1);
        fr::add(T2, beta_n_2, T2);

        // combine three identity product terms, with z_1_poly evaluation
        fr::mul(T0, T1, T0);
        fr::mul(T0, T2, ffts.identity_poly[i]);
    ITERATE_OVER_DOMAIN_END;


    // We can shrink the evaluation domain by 2 for the wire polynomials, to save on memory
    polynomials::compress_fft(ffts.w_l_poly, ffts.w_l_poly_small, state.large_domain.size, 2);
    polynomials::compress_fft(ffts.w_r_poly, ffts.w_r_poly_small, state.large_domain.size, 2);
    polynomials::compress_fft(ffts.w_o_poly, ffts.w_o_poly_small, state.large_domain.size, 2);

    polynomials::copy_polynomial(state.z_1, ffts.z_1_poly, state.small_domain.size, state.large_domain.size);
    polynomials::fft_with_coset_and_constant(ffts.z_1_poly, state.large_domain, state.alpha_squared);
    for (size_t i = 0; i < 4; ++i)
    {
        fr::copy(ffts.z_1_poly[i], ffts.z_1_poly[state.large_domain.size + i]);
    }
    fr::field_t *shifted_z_1_poly = &ffts.z_1_poly[4]; // tadaa

    ITERATE_OVER_DOMAIN_START(state.large_domain);
        fr::mul(ffts.identity_poly[i], ffts.z_1_poly[i], ffts.identity_poly[i]);
        fr::sub(ffts.identity_poly[i], shifted_z_1_poly[i], ffts.identity_poly[i]);
        fr::add(ffts.quotient_poly[i], ffts.identity_poly[i], ffts.quotient_poly[i]);
    ITERATE_OVER_DOMAIN_END;

    polynomials::compress_fft(ffts.z_1_poly, ffts.z_1_poly_small, state.large_domain.size + 4, 2);

    polynomials::compute_lagrange_polynomial_fft(ffts.l_1_poly, state.small_domain, state.mid_domain, ffts.l_1_poly + state.mid_domain.size);
    fr::copy(ffts.l_1_poly[0], ffts.l_1_poly[state.mid_domain.size]);
    fr::copy(ffts.l_1_poly[1], ffts.l_1_poly[state.mid_domain.size + 1]);
    fr::copy(ffts.l_1_poly[2], ffts.l_1_poly[state.mid_domain.size + 2]);
    fr::copy(ffts.l_1_poly[3], ffts.l_1_poly[state.mid_domain.size + 3]);
    fr::field_t *l_n_minus_1_poly = &ffts.l_1_poly[4];
    shifted_z_1_poly = &ffts.z_1_poly_small[2];
    fr::field_t *shifted_z_2_poly = &ffts.z_2_poly_small[2];

    // accumulate degree-2n terms into gate_poly_mid
    ITERATE_OVER_DOMAIN_START(state.mid_domain);
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T6;
        fr::mul(ffts.z_1_poly_small[i], state.alpha_squared, T6);
        fr::mul(ffts.z_2_poly_small[i], state.challenges.alpha, T4);
        fr::sub(T6, T4, T6);
        fr::mul(ffts.l_1_poly[i], T6, T5);

        fr::mul(shifted_z_1_poly[i], state.alpha_cubed, T6);
        fr::mul(shifted_z_2_poly[i], state.alpha_squared, T4);
        fr::sub(T6, T4, T6);
        fr::mul(l_n_minus_1_poly[i], T6, T4);
        fr::add(T4, T5, ffts.gate_poly_mid[i]);
    ITERATE_OVER_DOMAIN_END;
}

void compute_arithmetisation_coefficients(circuit_state &state, fft_pointers &ffts)
{
    polynomials::ifft(state.q_l, state.small_domain);
    polynomials::ifft(state.q_r, state.small_domain);
    polynomials::ifft(state.q_o, state.small_domain);
    polynomials::copy_polynomial(state.q_l, ffts.q_l_poly, state.small_domain.size, state.mid_domain.size);
    polynomials::copy_polynomial(state.q_r, ffts.q_r_poly, state.small_domain.size, state.mid_domain.size);
    polynomials::copy_polynomial(state.q_o, ffts.q_o_poly, state.small_domain.size, state.mid_domain.size);
    polynomials::fft_with_coset_and_constant(ffts.q_o_poly, state.mid_domain, state.challenges.alpha);
    polynomials::fft_with_coset_and_constant(ffts.q_r_poly, state.mid_domain, state.challenges.alpha);
    polynomials::fft_with_coset_and_constant(ffts.q_l_poly, state.mid_domain, state.challenges.alpha);

    // the fft transform on q.o is half that of w.o - access every other index of w.o
    ITERATE_OVER_DOMAIN_START(state.mid_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::mul(ffts.w_r_poly_small[i], ffts.q_r_poly[i], T0);
        fr::mul(ffts.w_l_poly_small[i], ffts.q_l_poly[i], T1);
        fr::mul(ffts.w_o_poly_small[i], ffts.q_o_poly[i], T2);
        fr::add(T0, T1, T0);
        fr::add(T0, T2, T0);
        fr::add(ffts.gate_poly_mid[i], T0, ffts.gate_poly_mid[i]);
    ITERATE_OVER_DOMAIN_END;
}

void compute_quotient_polynomial(circuit_state &state, fft_pointers &ffts, plonk_proof &proof, srs::plonk_srs &reference_string)
{
    size_t n = state.small_domain.size;

    // Set up initial pointers for phase 1
    ffts.quotient_poly = &ffts.scratch_memory[0];
    ffts.sigma_1_poly = &ffts.scratch_memory[0];

    ffts.w_l_poly = &ffts.scratch_memory[4 * n];
    ffts.w_r_poly = &ffts.scratch_memory[8 * n];
    ffts.w_o_poly = &ffts.scratch_memory[12 * n];

    ffts.sigma_2_poly = &ffts.scratch_memory[16 * n];
    ffts.sigma_3_poly = &ffts.scratch_memory[16 * n];

    ffts.z_2_poly = &ffts.scratch_memory[16 * n];
    ffts.z_2_poly_small = &ffts.scratch_memory[16 * n];

    // the z polynomial coefficients will bleed over by 2 field elements, need to keep track of that...
    ffts.q_m_poly = &ffts.scratch_memory[18 * n + 2];

    ffts.identity_poly = &ffts.scratch_memory[18 * n + 2];

    ffts.w_l_poly_small = &ffts.scratch_memory[4 * n];
    ffts.w_r_poly_small = &ffts.scratch_memory[6 * n];
    ffts.w_o_poly_small = &ffts.scratch_memory[8 * n];

    ffts.z_1_poly = &ffts.scratch_memory[10 * n];
    ffts.z_1_poly_small = &ffts.scratch_memory[10 * n];

    ffts.l_1_poly = &ffts.scratch_memory[18 * n + 2];
    ffts.gate_poly_mid = &ffts.scratch_memory[14 * n];

    ffts.q_l_poly = &ffts.scratch_memory[12 * n];
    ffts.q_r_poly = &ffts.scratch_memory[10 * n];
    ffts.q_o_poly = &ffts.scratch_memory[16 * n];

    // store lagrange base temporaries in t (not used for now...)
    state.w_l_lagrange_base = &state.t[0];
    state.w_r_lagrange_base = &state.t[n];
    state.w_o_lagrange_base = &state.t[2 * n];

    // compute wire coefficients
    waffle::compute_wire_coefficients(state, ffts);
    // compute wire commitments
    waffle::compute_wire_commitments(state, proof, reference_string);
    // compute_wire_commitments
    waffle::compute_z_coefficients(state, ffts);
    // compute z commitments
    waffle::compute_z_commitments(state, proof, reference_string);

    // Set up phase 2 pointers
    // allocate memory for identity poly
    // Offset by 8 elements, as we're going to be storing Z1 in W_l_poly, Z2 in w_o_poly
    waffle::compute_permutation_grand_product_coefficients(state, ffts);

    waffle::compute_multiplication_gate_coefficients(state, ffts);

    waffle::compute_identity_grand_product_coefficients(state, ffts);

    waffle::compute_arithmetisation_coefficients(state, ffts);

    polynomials::ifft_with_coset(ffts.gate_poly_mid, state.mid_domain);
    
    // we need to perform an fft transform on gate_poly_mid, to double the evaluation domain.
    // zero out the high-order coefficients
    memset((void *)(ffts.gate_poly_mid + state.mid_domain.size), 0, (state.mid_domain.size) * sizeof(fr::field_t));

    // add state.q_c into accumulator
    polynomials::ifft_with_constant(state.q_c, state.small_domain, state.challenges.alpha);

    polynomials::add(ffts.gate_poly_mid, state.q_c, ffts.gate_poly_mid, state.small_domain);

    polynomials::fft_with_coset(ffts.gate_poly_mid, state.large_domain);

    polynomials::add(ffts.quotient_poly, ffts.gate_poly_mid, ffts.quotient_poly, state.large_domain);

    polynomials::divide_by_pseudo_vanishing_polynomial(ffts.quotient_poly, state.small_domain, state.large_domain);

    polynomials::ifft_with_coset(ffts.quotient_poly, state.large_domain);
}

void compute_linearisation_coefficients(circuit_state &state, fft_pointers & ffts, plonk_proof &proof)
{
    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t beta_inv;
    fr::invert(state.challenges.beta, beta_inv);
    fr::field_t shifted_z;
    fr::mul(state.challenges.z, state.small_domain.root, shifted_z);

    // evaluate the prover and instance polynomials.
    // (we don't need to evaluate the quotient polynomial, that can be derived by the verifier)
    proof.w_l_eval = polynomials::evaluate(state.w_l, state.challenges.z, state.n);
    proof.w_r_eval = polynomials::evaluate(state.w_r, state.challenges.z, state.n);
    proof.w_o_eval = polynomials::evaluate(state.w_o, state.challenges.z, state.n);
    proof.s_id_eval = polynomials::evaluate(state.s_id, state.challenges.z, state.n);
    proof.sigma_1_eval = polynomials::evaluate(state.sigma_1, state.challenges.z, state.n);
    proof.sigma_2_eval = polynomials::evaluate(state.sigma_2, state.challenges.z, state.n);
    proof.sigma_3_eval = polynomials::evaluate(state.sigma_3, state.challenges.z, state.n);
    proof.z_1_shifted_eval = polynomials::evaluate(state.z_1, shifted_z, state.n);
    proof.z_2_shifted_eval = polynomials::evaluate(state.z_2, shifted_z, state.n);
    proof.t_mid_eval = polynomials::evaluate(&ffts.quotient_poly[state.n], state.challenges.z, state.n);
    proof.t_hi_eval = polynomials::evaluate(&ffts.quotient_poly[state.n + state.n], state.challenges.z, state.n);

    // we scaled the sigma polynomials up by beta, so scale back down
    fr::mul(proof.sigma_1_eval, beta_inv, proof.sigma_1_eval);
    fr::mul(proof.sigma_2_eval, beta_inv, proof.sigma_2_eval);
    fr::mul(proof.sigma_3_eval, beta_inv, proof.sigma_3_eval);
    fr::mul(proof.s_id_eval, beta_inv, proof.s_id_eval);

    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(state.challenges.z, state.small_domain);
    plonk_linear_terms linear_terms = compute_linear_terms(proof, state.challenges, lagrange_evals.l_1, state.n);

    ITERATE_OVER_DOMAIN_START(state.small_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T6;
        fr::mul(state.z_1[i], linear_terms.z_1, T0);
        fr::mul(state.z_2[i], linear_terms.z_2, T1);
        fr::copy(state.q_c[i], T2);
        fr::mul(state.q_o[i], linear_terms.q_o, T3);
        fr::mul(state.q_r[i], linear_terms.q_r, T4);
        fr::mul(state.q_l[i], linear_terms.q_l, T5);
        fr::mul(state.q_m[i], linear_terms.q_m, T6);
        fr::add(T6, T5, T5);
        fr::add(T4, T3, T3);
        fr::add(T2, T1, T1);
        fr::add(T5, T3, T3);
        fr::add(T1, T0, T0);
        fr::add(T3, T0, state.linear_poly[i]);
    ITERATE_OVER_DOMAIN_END;

    proof.linear_eval = polynomials::evaluate(state.linear_poly, state.challenges.z, state.small_domain.size);
}

plonk_proof construct_proof(circuit_state &state, srs::plonk_srs &reference_string)
{
    fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (22 * state.n + 8)));
    waffle::fft_pointers ffts;
    ffts.scratch_memory = scratch_space;

    plonk_proof proof;
    state.linear_poly = &ffts.scratch_memory[4 * state.n]; // TODO: this should probably be somewhere else...
    compute_quotient_polynomial(state, ffts, proof, reference_string);
    compute_quotient_commitment(state, ffts.quotient_poly, proof, reference_string);
    compute_linearisation_coefficients(state, ffts, proof);
    state.challenges.nu = compute_linearisation_challenge(proof);
    fr::field_t nu_powers[12];
    fr::copy(state.challenges.nu, nu_powers[0]);
    for (size_t i = 1; i < 12; ++i)
    {
        fr::mul(nu_powers[i - 1], nu_powers[0], nu_powers[i]);
    }

    fr::field_t beta_inv;
    fr::invert(state.challenges.beta, beta_inv);

    // Next step: compute the two Kate polynomial commitments, and associated opening proofs
    // We have two evaluation points: z and z.omega
    // We need to create random linear combinations of each individual polynomial and combine them
    fr::field_t *opening_poly = ffts.quotient_poly;
    fr::field_t *shifted_opening_poly = state.z_2;

    ITERATE_OVER_DOMAIN_START(state.small_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T6;
        fr::field_t T7;
        fr::field_t T8;
        fr::field_t T9;
        fr::field_t T10;
        fr::mul(state.linear_poly[i], nu_powers[0], T0);
        fr::mul(state.w_l[i], nu_powers[1], T1);
        fr::mul(state.w_r[i], nu_powers[2], T2);
        fr::mul(state.w_o[i], nu_powers[3], T3);
        fr::mul(state.s_id[i], nu_powers[4], T4);
        fr::mul(state.sigma_1[i], nu_powers[5], T5);
        fr::mul(state.sigma_2[i], nu_powers[6], T6);
        fr::mul(state.sigma_3[i], nu_powers[7], T7);
        fr::mul(state.z_1[i], nu_powers[8], T8);
        fr::mul(state.z_2[i], nu_powers[9], shifted_opening_poly[i]);
        fr::mul(ffts.quotient_poly[i + state.n], nu_powers[10], T9);
        fr::mul(ffts.quotient_poly[i + state.n + state.n], nu_powers[11], T10);
        fr::add(T9, T10, T9);
        fr::add(T7, T6, T7);
        fr::add(T5, T4, T5);
        fr::add(T3, T2, T3);
        fr::add(T1, T0, T1);
        fr::add(T7, T5, T7);
        // we added a \beta multiplier to sigma_1(X), sigma_2(X), sigma_3(X), s_id(X) - need to undo that here
        fr::mul(T7, beta_inv, T7);
        fr::add(T3, T1, T3);
        fr::add(T7, T3, T7);
        fr::add(T7, T9, T7);
        fr::add(shifted_opening_poly[i], T8, shifted_opening_poly[i]);
        fr::add(ffts.quotient_poly[i], T7, opening_poly[i]);
    ITERATE_OVER_DOMAIN_END;


    fr::field_t shifted_z;
    fr::mul(state.challenges.z, state.small_domain.root, shifted_z);

    polynomials::compute_kate_opening_coefficients(opening_poly, state.challenges.z, state.small_domain.size /* * 3 ADD BACK IN  */);
    polynomials::compute_kate_opening_coefficients(shifted_opening_poly, shifted_z, state.small_domain.size);

    // Compute PI_Z(X) and PI_Z_OMEGA(X)
    scalar_multiplication::multiplication_state mul_state[2];

    mul_state[0].scalars = opening_poly;
    mul_state[1].scalars = shifted_opening_poly;

    mul_state[0].points = reference_string.monomials;
    mul_state[1].points = reference_string.monomials;

    mul_state[0].num_elements = state.small_domain.size;
    mul_state[1].num_elements = state.small_domain.size;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);

    g1::jacobian_to_affine(mul_state[0].output, proof.PI_Z);
    g1::jacobian_to_affine(mul_state[1].output, proof.PI_Z_OMEGA);

    free(scratch_space);
    return proof;
}
} // namespace waffle