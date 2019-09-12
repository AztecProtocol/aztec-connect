#pragma once

#include "stddef.h"
#include "stdint.h"
#include "malloc.h"

#include "../groups/pairing.hpp"
#include "../groups/scalar_multiplication.hpp"
#include "../polynomials/fft.hpp"
#include "../types.hpp"

namespace waffle
{
// contains the state of a PLONK proof, including witness values, instance values
// and Kate polynomial commitments
struct circuit_state
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

    fr::field_t *w_l_lagrange_base;
    fr::field_t *w_r_lagrange_base;
    fr::field_t *w_o_lagrange_base;
    size_t n;
};

// Stores pointers to various polynomials required during proof construction
// Note: these pointers can overlap! We want to efficiently use available memory,
// and only a handful of these polynomials are required at any one time
struct fft_pointers
{
    fr::field_t* w_l_poly;
    fr::field_t* w_r_poly;
    fr::field_t* w_o_poly;
    fr::field_t* z_1_poly;
    fr::field_t* z_2_poly;

    fr::field_t* identity_poly;
    fr::field_t* gate_poly_mid;
    fr::field_t* gate_poly_long;

    fr::field_t* quotient_poly;

    fr::field_t* q_c_poly;
    fr::field_t* q_r_poly;
    fr::field_t* q_l_poly;

    fr::field_t* sigma_1_poly;
    fr::field_t* sigma_2_poly;
    fr::field_t* sigma_3_poly;
    fr::field_t* l_1_poly;
    fr::field_t* scratch_memory;
};

inline void compute_wire_coefficients(circuit_state &state, polynomials::evaluation_domain &domain, fft_pointers&)
{
    const size_t n = state.n;

    polynomials::copy_polynomial(state.w_l, state.w_l_lagrange_base, n, n);
    polynomials::copy_polynomial(state.w_r, state.w_r_lagrange_base, n, n);
    polynomials::copy_polynomial(state.w_o, state.w_o_lagrange_base, n, n);

    polynomials::ifft(state.w_l, domain.short_root_inverse, n);
    polynomials::ifft(state.w_r, domain.short_root_inverse, n);
    polynomials::ifft(state.w_o, domain.short_root_inverse, n);

    // compute [w_l], [w_r], [w_o]
    // scalar multiplication algorithm modifies scalars, which we want to preserve, so copy first
    // polynomials::copy_polynomial(state.w_l, &ffts.w_l_poly[0], n, n);
    // polynomials::copy_polynomial(state.w_r, &ffts.w_r_poly[0], n, n);
    // polynomials::copy_polynomial(state.w_o, &ffts.w_o_poly[0], n, n);
}


inline void compute_z_coefficients(circuit_state& state, polynomials::evaluation_domain &domain, fft_pointers&)
{
    const size_t n = state.n;
    // compute Z1, Z2
    fr::field_t T0;
    fr::field_t beta_n = { .data = { n, 0, 0, 0 } };
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, state.beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);

    // TODO: multithread this part!
    fr::field_t beta_identity = { .data = { 0, 0, 0, 0 } } ;
    // for the sigma permutation, as we compute each product term, store the intermediates in `product_1/2/3`.

    for (size_t i = 0; i < n; ++i)
    {
        fr::add(beta_identity, state.beta, beta_identity);
    
        fr::add(beta_identity, state.gamma, state.z_1[i+1]);
        fr::add(state.z_1[i+1], state.w_l_lagrange_base[i], state.z_1[i+1]);

        fr::add(beta_identity, state.gamma, T0);
        fr::add(beta_n, T0, T0);
        fr::add(T0, state.w_r_lagrange_base[i], T0);

        fr::mul(state.z_1[i+1], T0, state.z_1[i+1]);

        fr::add(beta_identity, state.gamma, T0);
        fr::add(beta_n_2, T0, T0);
        fr::add(T0, state.w_o_lagrange_base[i], T0);

        fr::mul(state.z_1[i+1], T0, state.z_1[i+1]);

        fr::mul(state.sigma_1[i], state.beta, T0);
        fr::add(T0, state.gamma, T0);
        fr::add(T0, state.w_l_lagrange_base[i], state.product_1[i]);

        fr::mul(state.sigma_2[i], state.beta, T0);
        fr::add(T0, state.gamma, T0);
        fr::add(T0, state.w_r_lagrange_base[i], state.product_2[i]);

        fr::mul(state.sigma_3[i], state.beta, T0);
        fr::add(T0, state.gamma, T0);
        fr::add(T0, state.w_o_lagrange_base[i], state.product_3[i]);

        fr::mul(state.product_1[i], state.product_2[i], state.z_2[i+1]);
        fr::mul(state.z_2[i+1], state.product_3[i], state.z_2[i+1]);
    }
    fr::one(state.z_1[0]);
    fr::one(state.z_2[0]);

    for (size_t i = 1; i < n; ++i)
    {
        fr::mul(state.z_1[i], state.z_1[i-1], state.z_1[i]);
        fr::mul(state.z_2[i], state.z_2[i-1], state.z_2[i]);
    }

    polynomials::ifft(state.z_1, domain.short_root_inverse, n);
    polynomials::ifft(state.z_2, domain.short_root_inverse, n);

    // compute [z_1], [z_2]
    // scalar multiplication algorithm modifies scalars, which we want to preserve, so copy first
    // polynomials::copy_polynomial(state.z_1, &ffts.z_1_poly[0], n, n);
    // polynomials::copy_polynomial(state.z_2, &ffts.z_2_poly[0], n, n);
}

inline void compute_wire_commitments(circuit_state &state, srs::plonk_srs &srs)
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
    fq::copy(mul_state[0].output.x, state.W_L.x);
    fq::copy(mul_state[1].output.x, state.W_R.x);
    fq::copy(mul_state[2].output.x, state.W_O.x);
    fq::copy(mul_state[0].output.y, state.W_L.y);
    fq::copy(mul_state[1].output.y, state.W_R.y);
    fq::copy(mul_state[2].output.y, state.W_O.y);

    // compute beta, gamma
    // TODO: use keccak256
    fr::random_element(state.beta);
    fr::random_element(state.gamma);
}

inline void compute_z_commitments(circuit_state& state, srs::plonk_srs& srs)
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
    fq::copy(mul_state[0].output.x, state.Z_1.x);
    fq::copy(mul_state[1].output.x, state.Z_2.x);
    fq::copy(mul_state[0].output.y, state.Z_1.y);
    fq::copy(mul_state[1].output.y, state.Z_2.y);
    // compute alpha
    // TODO: use keccak256, this is just for testing
    // precompute some powers of alpha for later on
    fr::random_element(state.alpha);
    fr::mul(state.alpha, state.alpha, state.alpha_squared);
    fr::mul(state.alpha_squared, state.alpha, state.alpha_cubed);
}

inline void compute_identity_grand_product_coefficients(circuit_state& state, polynomials::evaluation_domain &domain, fft_pointers& ffts)
{
    size_t n = state.n;
    // 4 (4n) 'registers'
    // fr::field_t* w_l_poly = &scratch_space[0];
    // fr::field_t* w_r_poly = &scratch_space[4 * n];
    // fr::field_t* w_o_poly = &scratch_space[8 * n];
    // fr::field_t* identity_poly = &scratch_space[12 * n];

    // compute 4n fft transforms for w_l, w_r, w_o and the identity permutation
    polynomials::copy_polynomial(state.w_l, ffts.w_l_poly, n, 4 * n);
    polynomials::copy_polynomial(state.w_r, ffts.w_r_poly, n, 4 * n);
    polynomials::copy_polynomial(state.w_o, ffts.w_o_poly, n, 4 * n);

    // TODO: optimize this!
    fr::one(state.s_id[0]);
    fr::field_t one;
    fr::one(one);
    for (size_t i = 1; i < n; ++i)
    {
        fr::add(state.s_id[i-1], one, state.s_id[i]);
    }
    polynomials::ifft(state.s_id, domain.short_root_inverse, domain.short_domain);
    polynomials::copy_polynomial(state.s_id, ffts.identity_poly, domain.short_domain, domain.long_domain);
    
    polynomials::fft_with_coset_and_constant(ffts.identity_poly, domain.long_root, domain.generator, state.beta, domain.long_domain);
    polynomials::fft_with_coset(ffts.w_l_poly, domain.long_root, domain.generator, domain.long_domain);
    polynomials::fft_with_coset(ffts.w_r_poly, domain.long_root, domain.generator, domain.long_domain);
    polynomials::fft_with_coset(ffts.w_o_poly, domain.long_root, domain.generator, domain.long_domain);

    // compute partial identity grand product
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t beta_n = { .data = { n, 0, 0, 0 } };
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, state.beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);
    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::add(ffts.identity_poly[i], state.gamma, T0);
        fr::add(T0, ffts.w_l_poly[i], T1);
        fr::add(T0, ffts.w_r_poly[i], T2);
        fr::add(T0, ffts.w_o_poly[i], T3);
        fr::add(T2, beta_n, T2);
        fr::add(T3, beta_n_2, T3);
        fr::mul(T1, T2, ffts.identity_poly[i]);
        fr::mul(ffts.identity_poly[i], T3, ffts.identity_poly[i]);
    }
}

inline void compute_arithmetisation_coefficients(circuit_state& state, polynomials::evaluation_domain &domain, fft_pointers& ffts)
{
    size_t n = state.n;
    // compute q.o * w.o
    polynomials::ifft(state.q_o, domain.short_root_inverse, domain.short_domain);
    polynomials::copy_polynomial(state.q_o, ffts.gate_poly_mid, n, 2 * n);
    polynomials::fft_with_coset(ffts.gate_poly_mid, domain.mid_root, domain.generator, domain.mid_domain);

    // the fft transform on q.o is half that of w.o - access every other index of w.o
    for (size_t i = 0; i < domain.mid_domain; ++i)
    {
        fr::mul(ffts.w_o_poly[i * 2], ffts.gate_poly_mid[i], ffts.gate_poly_mid[i]);
    }

    // great! we've freed up w_o now
    // we can use that scratch space to compute q.l*w.l and q.r*w.r and q.c

    // compute q_c_poly and add into accumulator
    polynomials::ifft(state.q_c, domain.short_root_inverse, domain.short_domain);
    polynomials::copy_polynomial(state.q_c, ffts.q_c_poly, n, 2 * n);
    polynomials::fft_with_coset(ffts.q_c_poly, domain.mid_root, domain.generator, domain.mid_domain);
    for (size_t i = 0; i < domain.mid_domain; ++i)
    {
        fr::add(ffts.gate_poly_mid[i], ffts.q_c_poly[i], ffts.gate_poly_mid[i]);
    }
    // compute q.r * w.r
    polynomials::ifft(state.q_r, domain.short_root_inverse, domain.short_domain);
    polynomials::ifft(state.q_l, domain.short_root_inverse, domain.short_domain);

    polynomials::copy_polynomial(state.q_r, ffts.q_r_poly, n, 2 * n);
    polynomials::copy_polynomial(state.q_l, ffts.q_l_poly, n, 2 * n);
    polynomials::fft_with_coset(ffts.q_r_poly, domain.mid_root, domain.generator, domain.mid_domain);
    polynomials::fft_with_coset(ffts.q_l_poly, domain.mid_root, domain.generator, domain.mid_domain);

    // the fft transform on q.o is half that of w.o - access every other index of w.o
    fr::field_t T0;
    fr::field_t T1;
    for (size_t i = 0; i < domain.mid_domain; ++i)
    {
        fr::mul(ffts.w_r_poly[i * 2], ffts.q_r_poly[i], T0);
        fr::mul(ffts.w_l_poly[i * 2], ffts.q_l_poly[i], T1);
        fr::add(T1, T0, T1);
        fr::add(ffts.gate_poly_mid[i], T1, ffts.gate_poly_mid[i]);
        fr::mul(ffts.gate_poly_mid[i], state.alpha, ffts.gate_poly_mid[i]);
    }

    // The next step is to compute q_m.w_l.w_r - we need a 4n fft for this
    // requisition the memory that w_o was using
    polynomials::ifft(state.q_m, domain.short_root_inverse, domain.short_domain);
    polynomials::copy_polynomial(state.q_m, ffts.gate_poly_long, n, 4 * n);
    polynomials::fft_with_coset_and_constant(ffts.gate_poly_long, domain.long_root, domain.generator, state.alpha, domain.long_domain);
    // polynomials::fft_with_coset(ffts.gate_poly_long, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::mul(ffts.w_l_poly[i], ffts.w_r_poly[i], T0);
        fr::mul(ffts.gate_poly_long[i], T0, ffts.gate_poly_long[i]);
    }
}

inline void concatenate_arithmetic_and_identity_coefficients(circuit_state& state, polynomials::evaluation_domain &domain, fft_pointers& ffts)
{
    // we've now freed up use of w_l and w_r, but w_o is occupied with q_m.q_l.q_r

    // we can free up this memory by combining the grand-product term with q_m.q_l.q_r
    size_t n = state.n;

    // We assume that state.z_1 has had an inverse fourier transform performed on it, and is in coefficient form
    polynomials::copy_polynomial(state.z_1, ffts.z_1_poly, n, 4 * n);

    // when we transform z_1 into point-evaluation form, scale up by `alpha_squared` - saves us a mul later on
    polynomials::fft_with_coset_and_constant(ffts.z_1_poly, domain.long_root, domain.generator, state.alpha_squared, domain.long_domain);
    // polynomials::fft_with_coset(ffts.z_1_poly, domain.long_root, domain.generator, domain.long_domain);

    // we have the 4n component of the arithmetistion polynomial in `gate_poly_long`
    // and the identity grand product polynomial in `identity_poly` = I(X)
    // to finish the identity grand product, we need I(X).Z_1(X) - Z_1(X \omega^{-1})
    // the FFT of Z_1(X \omega^{-1}) is the same as Z_1(X), just shifted by 4 indices

    // instead of mapping indices, we just graft the first 4 array elements of Z_1, onto the end of Z_1,
    // and create a pointer to the shifted poly
    for (size_t i = 0; i < 4; ++i)
    {
        fr::copy(ffts.z_1_poly[i], ffts.z_1_poly[4 * n + i]);
    }
    fr::field_t* shifted_z_1_poly = &ffts.z_1_poly[4]; // tadaa
    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        // multiply identity evaluation by normal z_1 evaluation
        fr::mul(ffts.identity_poly[i], ffts.z_1_poly[i], ffts.quotient_poly[i]);
    
        // subtract the shifted evaluation from result
        fr::sub(ffts.quotient_poly[i], shifted_z_1_poly[i], ffts.quotient_poly[i]);

        // and add the gate poly evaluation into the result
        fr::add(ffts.quotient_poly[i], ffts.gate_poly_long[i], ffts.quotient_poly[i]);
    }
}

inline void compute_permutation_grand_product_coefficients(circuit_state& state, polynomials::evaluation_domain& domain, fft_pointers& ffts)
{
    // The final steps are:
    // 1: Compute the permutation grand product
    // 2: Compute permutation check coefficients
    size_t n = state.n;
    // // free memory: w_r, w_o
    // fr::field_t* l_1_poly = w_r_poly;
    // fr::field_t* l_n_poly = w_r_poly + domain.mid_domain;

    // we've computed the fft evaluation of z_1(X) * l_1(X)
    // and can use a shift to get to z_1(X.w^{-1}) * l_{n-1}(X)
    // z_1 is now free
    // => w_o, w_l are now free

    // fr::field_t* sigma_1_poly = w_l_poly;
    // fr::field_t* sigma_2_poly = w_o_poly;
    polynomials::ifft(state.product_1, domain.short_root_inverse, domain.short_domain);
    polynomials::ifft(state.product_2, domain.short_root_inverse, domain.short_domain);
    polynomials::ifft(state.product_3, domain.short_root_inverse, domain.short_domain);

    polynomials::copy_polynomial(state.product_1, ffts.sigma_1_poly, n, 4 * n);
    polynomials::copy_polynomial(state.product_2, ffts.sigma_2_poly, n, 4 * n);

    polynomials::fft_with_coset(ffts.sigma_1_poly, domain.long_root, domain.generator, domain.long_domain);
    polynomials::fft_with_coset(ffts.sigma_2_poly, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::mul(ffts.sigma_1_poly[i], ffts.sigma_2_poly[i], ffts.sigma_1_poly[i]);
    }

    polynomials::copy_polynomial(state.product_3, ffts.sigma_3_poly, n, 4 * n);
    polynomials::fft_with_coset(ffts.sigma_3_poly, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::mul(ffts.sigma_1_poly[i], ffts.sigma_3_poly[i], ffts.sigma_1_poly[i]);
    }

    // z_1_poly shares mem with w_o_poly
    polynomials::copy_polynomial(state.z_2, ffts.z_2_poly, n, 4 * n);
    polynomials::fft_with_coset_and_constant(ffts.z_2_poly, domain.long_root, domain.generator, state.alpha_cubed, domain.long_domain);
    fr::copy(ffts.z_2_poly[0], ffts.z_2_poly[domain.long_domain]);
    fr::copy(ffts.z_2_poly[1], ffts.z_2_poly[domain.long_domain + 1]);
    fr::copy(ffts.z_2_poly[2], ffts.z_2_poly[domain.long_domain + 2]);
    fr::copy(ffts.z_2_poly[3], ffts.z_2_poly[domain.long_domain + 3]);
    fr::field_t* shifted_z_2_poly = &ffts.z_2_poly[4];
    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::mul(ffts.sigma_1_poly[i], ffts.z_2_poly[i], ffts.sigma_1_poly[i]);
        fr::sub(ffts.sigma_1_poly[i], shifted_z_2_poly[i], ffts.sigma_1_poly[i]);

        // combine product term into quotient poly
        fr::add(ffts.quotient_poly[i], ffts.sigma_1_poly[i], ffts.quotient_poly[i]);
    }

    polynomials::compute_lagrange_polynomial_fft(ffts.l_1_poly, domain, ffts.l_1_poly + domain.mid_domain);

    fr::copy(ffts.l_1_poly[0], ffts.l_1_poly[domain.mid_domain]);
    fr::copy(ffts.l_1_poly[1], ffts.l_1_poly[domain.mid_domain + 1]);
    fr::copy(ffts.l_1_poly[2], ffts.l_1_poly[domain.mid_domain + 2]);
    fr::copy(ffts.l_1_poly[3], ffts.l_1_poly[domain.mid_domain + 3]);
    fr::copy(ffts.z_1_poly[0], ffts.z_1_poly[domain.long_domain]);
    fr::copy(ffts.z_1_poly[1], ffts.z_1_poly[domain.long_domain + 1]);
    fr::copy(ffts.z_1_poly[2], ffts.z_1_poly[domain.long_domain + 2]);
    fr::copy(ffts.z_1_poly[3], ffts.z_1_poly[domain.long_domain + 3]);
    fr::field_t* l_n_minus_1_poly = &ffts.l_1_poly[4];
    fr::field_t* shifted_z_1_poly = &ffts.z_1_poly[4];

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    // accumulate degree-2n terms into gate_poly_mid
    for (size_t i = 0; i < domain.mid_domain; ++i)
    {
        fr::mul(ffts.z_1_poly[i * 2], state.alpha_squared, T0);
        fr::mul(ffts.z_2_poly[i * 2], state.alpha, T1);
        fr::sub(T0, T1, T0);
        fr::mul(ffts.l_1_poly[i], T0, T2);

        fr::mul(shifted_z_1_poly[i * 2], state.alpha_cubed, T0);
        fr::mul(shifted_z_2_poly[i * 2], state.alpha_squared, T1);
        fr::sub(T0, T1, T0);
        fr::mul(l_n_minus_1_poly[i], T0, T1);
        fr::add(T1, T2, T0);
        fr::add(ffts.gate_poly_mid[i], T0, ffts.gate_poly_mid[i]);
    }

    polynomials::ifft_with_coset(ffts.gate_poly_mid, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);
    memset((void *)(ffts.gate_poly_mid + domain.mid_domain), 0, (domain.mid_domain) * sizeof(fr::field_t));

    polynomials::fft_with_coset(ffts.gate_poly_mid, domain.long_root, domain.generator, domain.long_domain);

    for (size_t i = 0; i < domain.long_domain; ++i)
    {
        fr::add(ffts.quotient_poly[i], ffts.gate_poly_mid[i], ffts.quotient_poly[i]);
    }
}

inline void compute_quotient_commitment(circuit_state& state, fr::field_t* coeffs, const srs::plonk_srs& srs)
{
    size_t n = state.n;
    scalar_multiplication::multiplication_state mul_state[3];

    mul_state[0].scalars = coeffs;
    mul_state[1].scalars = &coeffs[n];
    mul_state[2].scalars = &coeffs[2 * n];

    mul_state[0].points = srs.monomials;
    mul_state[1].points = &srs.monomials[2 * n];
    mul_state[2].points = &srs.monomials[4 * n];

    mul_state[0].num_elements = n;
    mul_state[1].num_elements = n;
    mul_state[2].num_elements = n;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    g1::element res;
    g1::add(mul_state[0].output, mul_state[1].output, res);
    g1::add(res, mul_state[2].output, res);

    g1::copy_to_affine(res, state.T);

    // TODO: replace with keccak256
    fr::random_element(state.z);
}

inline void compute_quotient_polynomial(circuit_state& state, polynomials::evaluation_domain& domain, fft_pointers& ffts, srs::plonk_srs& reference_string)
{
    size_t n = domain.short_domain;

    // Set up initial pointers for phase 1
    ffts.gate_poly_mid = &ffts.scratch_memory[0];
    ffts.w_l_poly = &ffts.scratch_memory[2 * n];
    ffts.w_r_poly = &ffts.scratch_memory[6 * n];
    ffts.w_o_poly = &ffts.scratch_memory[10 * n];

    // store lagrange base temporaries in t (not used for now...)    
    state.w_l_lagrange_base = &state.t[0];
    state.w_r_lagrange_base = &state.t[n];
    state.w_o_lagrange_base = &state.t[2 * n];
    // can store product terms in same location as lagrange base temporaries
    state.product_1 = &state.t[0];
    state.product_2 = &state.t[n];
    state.product_3 = &state.t[2 * n];

    // compute wire coefficients
    waffle::compute_wire_coefficients(state, domain, ffts);
    // compute wire commitments
    waffle::compute_wire_commitments(state, reference_string);
    // compute_wire_commitments
    waffle::compute_z_coefficients(state, domain, ffts);
    // compute z commitments
    waffle::compute_z_commitments(state, reference_string);
    // Set up phase 2 pointers
    // allocate memory for identity poly
    // Offset by 8 elements, as we're going to be storing Z1 in W_l_poly, Z2 in w_o_poly
    ffts.identity_poly = &ffts.scratch_memory[14 * n + 8];

    waffle::compute_identity_grand_product_coefficients(state, domain, ffts);

    // Set up pointers to gate constant ffts
    // Can overwrite memory assigned to output wires
    ffts.q_c_poly = ffts.w_o_poly;
    ffts.q_r_poly = ffts.w_o_poly;
    ffts.q_l_poly = &ffts.w_o_poly[2 * n];
    ffts.gate_poly_long = ffts.w_o_poly;
    waffle::compute_arithmetisation_coefficients(state, domain, ffts);

    ffts.z_1_poly = ffts.w_l_poly;
    ffts.quotient_poly = ffts.identity_poly;
    waffle::concatenate_arithmetic_and_identity_coefficients(state, domain, ffts);

    // offset these pointers by 4 elements (as we have extende z_1 poly by 4)    
    ffts.sigma_1_poly = &ffts.w_r_poly[4];
    ffts.sigma_2_poly = &ffts.w_o_poly[4];
    ffts.sigma_3_poly = &ffts.w_o_poly[4];
    ffts.z_2_poly = &ffts.w_o_poly[4];
    ffts.l_1_poly = &ffts.w_r_poly[4];
    waffle::compute_permutation_grand_product_coefficients(state, domain, ffts);

    polynomials::divide_by_pseudo_vanishing_polynomial_long(ffts.quotient_poly, domain);

    polynomials::ifft_with_coset(ffts.quotient_poly, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
}

inline void compute_linearisation_coefficients(circuit_state& state, polynomials::evaluation_domain& domain, fft_pointers& ffts)
{
    polynomials::ifft(state.sigma_1, domain.short_root_inverse, domain.short_domain);
    polynomials::ifft(state.sigma_2, domain.short_root_inverse, domain.short_domain);
    polynomials::ifft(state.sigma_3, domain.short_root_inverse, domain.short_domain);

    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t shifted_z;
    fr::mul(state.z, domain.short_root, shifted_z);
    polynomials::eval(state.w_l, state.z, state.n, state.w_l_eval);
    polynomials::eval(state.w_r, state.z, state.n, state.w_r_eval);
    polynomials::eval(state.w_o, state.z, state.n, state.w_o_eval);
    polynomials::eval(state.s_id, state.z, state.n, state.s_id_eval);
    polynomials::eval(state.sigma_1, state.z, state.n, state.sigma_1_eval);
    polynomials::eval(state.sigma_2, state.z, state.n, state.sigma_2_eval);
    polynomials::eval(state.sigma_3, state.z, state.n, state.sigma_3_eval);
    polynomials::eval(ffts.quotient_poly, state.z, (state.n * 3), state.t_eval);
    polynomials::eval(state.z_1, shifted_z, state.n, state.z_1_shifted_eval);
    polynomials::eval(state.z_2, shifted_z, state.n, state.z_2_shifted_eval);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T6;
    fr::field_t r_z_1_term;
    fr::field_t r_z_2_term;
    fr::field_t r_q_m_term;
    fr::field_t r_q_l_term;
    fr::field_t r_q_r_term;
    fr::field_t r_q_o_term;
    fr::field_t r_q_c_term;

    fr::field_t beta_n = { .data = { state.n, 0, 0, 0 } };
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, state.beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);

    fr::mul(state.s_id_eval, state.beta, T0);
    fr::add(T0, state.w_l_eval, T0);
    fr::add(T0, state.gamma, T0);

    fr::mul(state.s_id_eval, state.beta, T1);
    fr::add(T1, state.w_r_eval, T1);
    fr::add(T1, state.gamma, T1);
    fr::add(T1, beta_n, T1);

    fr::mul(state.s_id_eval, state.beta, T2);
    fr::add(T2, state.w_o_eval, T2);
    fr::add(T2, state.gamma, T2);
    fr::add(T2, beta_n_2, T2);
    
    fr::mul(T2, T1, T1);
    fr::mul(T1, T0, T0);
    fr::mul(T0, state.alpha_squared, r_z_1_term);

    fr::mul(state.sigma_1_eval, state.beta, T0);
    fr::add(T0, state.w_l_eval, T0);
    fr::add(T0, state.gamma, T0);

    fr::mul(state.sigma_2_eval, state.beta, T1);
    fr::add(T1, state.w_r_eval, T1);
    fr::add(T1, state.gamma, T1);

    fr::mul(state.sigma_3_eval, state.beta, T2);
    fr::add(T2, state.w_o_eval, T2);
    fr::add(T2, state.gamma, T2);

    fr::mul(T2, T1, T1);
    fr::mul(T1, T0, T0);
    fr::mul(T0, state.alpha_cubed, r_z_2_term);

    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(state.z, domain);
    
    fr::field_t alpha_pow_4;
    fr::mul(state.alpha_squared, state.alpha_squared, alpha_pow_4);

    fr::mul(lagrange_evals.l_1, alpha_pow_4, T0);
    fr::add(r_z_1_term, T0, r_z_1_term);
    fr::neg(T0, T0);
    fr::add(r_z_2_term, T0, r_z_2_term);

    fr::copy(state.alpha, r_q_c_term);

    fr::mul(state.w_o_eval, state.alpha, r_q_o_term);
    fr::mul(state.w_r_eval, state.alpha, r_q_r_term);
    fr::mul(state.w_l_eval, state.alpha, r_q_l_term);

    fr::mul(state.w_l_eval, state.w_r_eval, r_q_m_term);
    fr::mul(r_q_m_term, state.alpha, r_q_m_term);

    for (size_t i = 0; i < domain.short_domain; ++i)
    {
        fr::mul(state.z_1[i], r_z_1_term, T0);
        fr::mul(state.z_2[i], r_z_2_term, T1);
        fr::mul(state.q_c[i], r_q_c_term, T2);
        fr::mul(state.q_o[i], r_q_o_term, T3);
        fr::mul(state.q_r[i], r_q_r_term, T4);
        fr::mul(state.q_l[i], r_q_l_term, T5);
        fr::mul(state.q_m[i], r_q_m_term, T6);
        fr::add(T6, T5, T5);
        fr::add(T4, T3, T3);
        fr::add(T2, T1, T1);
        fr::add(T5, T3, T3);
        fr::add(T1, T0, T0);
        fr::add(T3, T0, state.linear_poly[i]);
    }

    polynomials::eval(state.linear_poly, state.z, domain.short_domain, state.linear_eval);
}

inline void construct_proof(circuit_state& state, polynomials::evaluation_domain& domain, fft_pointers& ffts, srs::plonk_srs& reference_string)
{
    compute_quotient_polynomial(state, domain, ffts, reference_string);

    compute_quotient_commitment(state, ffts.quotient_poly, reference_string);

    compute_linearisation_coefficients(state, domain, ffts);

    // TODO: replace with keccak256
    fr::random_element(state.nu);

    fr::field_t nu_powers[10];
    fr::copy(state.nu, nu_powers[0]);
    for (size_t i = 1; i < 10; ++i)
    {
        fr::mul(nu_powers[i - 1], nu_powers[0], nu_powers[i]);
    }

    fr::sub(ffts.quotient_poly[0], state.t_eval, ffts.quotient_poly[0]);
    fr::sub(state.linear_poly[0], state.linear_eval, state.linear_poly[0]);
    fr::sub(state.w_l[0], state.w_l_eval, state.w_l[0]);
    fr::sub(state.w_r[0], state.w_r_eval, state.w_r[0]);
    fr::sub(state.w_o[0], state.w_o_eval, state.w_o[0]);
    fr::sub(state.s_id[0], state.s_id_eval, state.s_id[0]);
    fr::sub(state.sigma_1[0], state.sigma_1_eval, state.sigma_1[0]);
    fr::sub(state.sigma_2[0], state.sigma_2_eval, state.sigma_2[0]);
    fr::sub(state.sigma_3[0], state.sigma_3_eval, state.sigma_3[0]);
    fr::sub(state.z_1[0], state.z_1_shifted_eval, state.z_1[0]);
    fr::sub(state.z_2[0], state.z_2_shifted_eval, state.z_2[0]);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T6;
    fr::field_t T7;
    fr::field_t T8;
    fr::field_t* opening_poly = ffts.quotient_poly;
    fr::field_t* shifted_opening_poly = state.z_2;
    for (size_t i = 0; i < domain.short_domain; ++i)
    {
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
        fr::add(T7, T6, T7);
        fr::add(T5, T4, T5);
        fr::add(T3, T2, T3);
        fr::add(T1, T0, T1);
        fr::add(T7, T5, T7);
        fr::add(T3, T1, T3);
        fr::add(T7, T3, T7);
        fr::add(shifted_opening_poly[i], T8, shifted_opening_poly[i]);
        fr::add(ffts.quotient_poly[i], T7, opening_poly[i]);
    }

    fr::field_t shifted_z;
    fr::mul(state.z, domain.short_root, shifted_z);
    polynomials::compute_kate_opening_coefficients(opening_poly, state.z, domain.short_domain * 3);
    polynomials::compute_kate_opening_coefficients(shifted_opening_poly, shifted_z, domain.short_domain);

    scalar_multiplication::multiplication_state mul_state[4];

    mul_state[0].scalars = opening_poly;
    mul_state[1].scalars = &opening_poly[domain.short_domain];
    mul_state[2].scalars = &opening_poly[2 * domain.short_domain];
    mul_state[3].scalars = shifted_opening_poly;

    mul_state[0].points = reference_string.monomials;
    mul_state[1].points = &reference_string.monomials[2 * domain.short_domain];
    mul_state[2].points = &reference_string.monomials[4 * domain.short_domain];
    mul_state[3].points = reference_string.monomials;

    mul_state[0].num_elements = domain.short_domain;
    mul_state[1].num_elements = domain.short_domain;
    mul_state[2].num_elements = domain.short_domain;
    mul_state[3].num_elements = domain.short_domain;

    scalar_multiplication::batched_scalar_multiplications(mul_state, 4);

    g1::element res;
    g1::add(mul_state[0].output, mul_state[1].output, res);
    g1::add(res, mul_state[2].output, res);

    g1::copy_to_affine(res, state.PI_Z);
    g1::copy_to_affine(mul_state[3].output, state.PI_Z_OMEGA);
}
} // namespace waffle