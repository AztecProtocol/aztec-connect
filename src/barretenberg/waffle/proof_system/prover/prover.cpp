#include "./prover.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/g2.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../io/io.hpp"
#include "../../../polynomials/polynomial_arithmetic.hpp"

#include "../../reference_string/reference_string.hpp"

#include "../linearizer.hpp"
#include "../permutation.hpp"
#include "../transcript_helpers.hpp"
#include "../widgets/base_widget.hpp"

#include <chrono>
#include <iostream>

using namespace barretenberg;

namespace waffle {

Prover::Prover(std::shared_ptr<proving_key> input_key,
               std::shared_ptr<program_witness> input_witness,
               const transcript::Manifest& input_manifest,
               bool has_fourth_wire,
               bool use_quotient_mid)
    : n(input_key == nullptr ? 0 : input_key->n)
    , transcript(input_manifest)
    , __DEBUG_HAS_FOURTH_WIRE(has_fourth_wire)
    , key(input_key)
    , witness(input_witness)
    , uses_quotient_mid(use_quotient_mid)
{
}

Prover::Prover(Prover&& other)
    : n(other.n)
    , transcript(other.transcript)
    , __DEBUG_HAS_FOURTH_WIRE(other.__DEBUG_HAS_FOURTH_WIRE)
    , key(std::move(other.key))
    , witness(std::move(other.witness))
    , uses_quotient_mid(other.uses_quotient_mid)
{
    for (size_t i = 0; i < other.widgets.size(); ++i) {
        widgets.emplace_back(std::move(other.widgets[i]));
    }
}

Prover& Prover::operator=(Prover&& other)
{
    n = other.n;

    widgets.resize(0);
    for (size_t i = 0; i < other.widgets.size(); ++i) {
        widgets.emplace_back(std::move(other.widgets[i]));
    }

    transcript = other.transcript;
    __DEBUG_HAS_FOURTH_WIRE = other.__DEBUG_HAS_FOURTH_WIRE;
    key = std::move(other.key);
    witness = std::move(other.witness);
    uses_quotient_mid = other.uses_quotient_mid;
    return *this;
}

void Prover::compute_wire_commitments()
{

    g1::element W_L = scalar_multiplication::pippenger_unsafe(
        witness->wires.at("w_1").get_coefficients(), key->reference_string.monomials, n);
    g1::element W_R = scalar_multiplication::pippenger_unsafe(
        witness->wires.at("w_2").get_coefficients(), key->reference_string.monomials, n);
    g1::element W_O = scalar_multiplication::pippenger_unsafe(
        witness->wires.at("w_3").get_coefficients(), key->reference_string.monomials, n);

    if (__DEBUG_HAS_FOURTH_WIRE) {
        g1::element W_4 = scalar_multiplication::pippenger_unsafe(
            witness->wires.at("w_4").get_coefficients(), key->reference_string.monomials, n);
        g1::affine_element W_4_affine;
        g1::jacobian_to_affine(W_4, W_4_affine);
        transcript.add_element("W_4", transcript_helpers::convert_g1_element(W_4_affine));
    }
    // TODO: batch normalize
    g1::affine_element W_L_affine;
    g1::affine_element W_R_affine;
    g1::affine_element W_O_affine;

    g1::jacobian_to_affine(W_L, W_L_affine);
    g1::jacobian_to_affine(W_R, W_R_affine);
    g1::jacobian_to_affine(W_O, W_O_affine);

    transcript.add_element("W_1", transcript_helpers::convert_g1_element(W_L_affine));
    transcript.add_element("W_2", transcript_helpers::convert_g1_element(W_R_affine));
    transcript.add_element("W_3", transcript_helpers::convert_g1_element(W_O_affine));

    transcript.apply_fiat_shamir("beta");
    transcript.apply_fiat_shamir("gamma");
}

void Prover::compute_z_commitment()
{
    g1::element Z = scalar_multiplication::pippenger_unsafe(key->z.get_coefficients(), key->reference_string.monomials, n);
    g1::affine_element Z_affine;
    g1::jacobian_to_affine(Z, Z_affine);

    transcript.add_element("Z", transcript_helpers::convert_g1_element(Z_affine));
    transcript.apply_fiat_shamir("alpha");
}

void Prover::compute_quotient_commitment()
{
    g1::element T_LO = scalar_multiplication::pippenger_unsafe(
        &key->quotient_large.get_coefficients()[0], key->reference_string.monomials, n);
    g1::element T_MID = scalar_multiplication::pippenger_unsafe(
        &key->quotient_large.get_coefficients()[n], key->reference_string.monomials, n);
    g1::element T_HI = scalar_multiplication::pippenger_unsafe(
        &key->quotient_large.get_coefficients()[n + n], key->reference_string.monomials, n);

    if (__DEBUG_HAS_FOURTH_WIRE) {
        g1::element T_4 = scalar_multiplication::pippenger_unsafe(
            &key->quotient_large.get_coefficients()[n + n + n], key->reference_string.monomials, n);
        g1::affine_element T_4_affine;
        g1::jacobian_to_affine(T_4, T_4_affine);
        transcript.add_element("T_4", transcript_helpers::convert_g1_element(T_4_affine));
    }
    g1::affine_element T_LO_affine;
    g1::affine_element T_MID_affine;
    g1::affine_element T_HI_affine;

    g1::jacobian_to_affine(T_LO, T_LO_affine);
    g1::jacobian_to_affine(T_MID, T_MID_affine);
    g1::jacobian_to_affine(T_HI, T_HI_affine);

    transcript.add_element("T_1", transcript_helpers::convert_g1_element(T_LO_affine));
    transcript.add_element("T_2", transcript_helpers::convert_g1_element(T_MID_affine));
    transcript.add_element("T_3", transcript_helpers::convert_g1_element(T_HI_affine));

    transcript.apply_fiat_shamir("z"); // end of 3rd round
}

void Prover::compute_wire_coefficients()
{
    barretenberg::polynomial& w_l = witness->wires.at("w_1");
    barretenberg::polynomial& w_r = witness->wires.at("w_2");
    barretenberg::polynomial& w_o = witness->wires.at("w_3");

    polynomial& w_l_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_r_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_o_fft = key->wire_ffts.at("w_3_fft");

    polynomial_arithmetic::copy_polynomial(&w_l[0], &w_l_fft[0], n, n);
    polynomial_arithmetic::copy_polynomial(&w_r[0], &w_r_fft[0], n, n);
    polynomial_arithmetic::copy_polynomial(&w_o[0], &w_o_fft[0], n, n);

    w_l.ifft(key->small_domain);
    w_r.ifft(key->small_domain);
    w_o.ifft(key->small_domain);

    if (__DEBUG_HAS_FOURTH_WIRE) {
        barretenberg::polynomial& w_4 = witness->wires.at("w_4");
        polynomial w_4_fft = key->wire_ffts.at("w_4_fft");
        polynomial_arithmetic::copy_polynomial(&w_4[0], &w_4_fft[0], n, n);

        w_4.ifft(key->small_domain);
    }
}

void Prover::compute_z_coefficients()
{
    polynomial& z = key->z;

    polynomial& scratch_space = key->z_fft;
    fr::field_t* accumulators[6]{ &z[1],         &scratch_space[n],     &scratch_space[n + n],
                                  &scratch_space[n + n + n], &key->opening_poly[0], &key->shifted_opening_poly[0] };

    fr::field_t beta = fr::serialize_from_buffer(transcript.get_challenge("beta").begin());
    fr::field_t gamma = fr::serialize_from_buffer(transcript.get_challenge("gamma").begin());

    fr::field_t* w_l_lagrange_base = &key->wire_ffts.at("w_1_fft")[0];
    fr::field_t* w_r_lagrange_base = &key->wire_ffts.at("w_2_fft")[0];
    fr::field_t* w_o_lagrange_base = &key->wire_ffts.at("w_3_fft")[0];

    fr::field_t* sigma_1_lagrange_base = &key->permutation_selectors_lagrange_base.at("sigma_1")[0];
    fr::field_t* sigma_2_lagrange_base = &key->permutation_selectors_lagrange_base.at("sigma_2")[0];
    fr::field_t* sigma_3_lagrange_base = &key->permutation_selectors_lagrange_base.at("sigma_3")[0];


#ifndef NO_MULTITHREADING
#pragma omp parallel
#endif
    {
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t j = 0; j < key->small_domain.num_threads; ++j) {
            fr::field_t work_root;
            fr::field_t thread_root;
            fr::__pow_small(key->small_domain.root, j * key->small_domain.thread_size, thread_root);
            fr::__mul(thread_root, beta, work_root);
            fr::field_t k1 = fr::multiplicative_generator;
            fr::field_t k2 = fr::alternate_multiplicative_generator;
            fr::field_t T0;
            fr::field_t T1;
            fr::field_t T2;
            size_t start = j * key->small_domain.thread_size;
            size_t end = (j + 1) * key->small_domain.thread_size;
            for (size_t i = start; i < end; ++i) {
                fr::__add_without_reduction(work_root, gamma, T0);
                fr::__add_with_coarse_reduction(T0, w_l_lagrange_base[i], accumulators[0][i]);

                fr::__mul_with_coarse_reduction(work_root, k1, T1);
                fr::__add_without_reduction(T1, gamma, T1);
                fr::__add_with_coarse_reduction(T1, w_r_lagrange_base[i], accumulators[1][i]);

                fr::__mul_with_coarse_reduction(work_root, k2, T2);
                fr::__add_without_reduction(T2, gamma, T2);
                fr::__add_with_coarse_reduction(T2, w_o_lagrange_base[i], accumulators[2][i]);

                fr::__mul_with_coarse_reduction(sigma_1_lagrange_base[i], beta, T0);
                fr::__add_without_reduction(T0, gamma, T0);
                fr::__add_with_coarse_reduction(T0, w_l_lagrange_base[i], accumulators[3][i]);

                fr::__mul_with_coarse_reduction(sigma_2_lagrange_base[i], beta, T1);
                fr::__add_without_reduction(T1, gamma, T1);
                fr::__add_with_coarse_reduction(T1, w_r_lagrange_base[i], accumulators[4][i]);

                fr::__mul_with_coarse_reduction(sigma_3_lagrange_base[i], beta, T2);
                fr::__add_without_reduction(T2, gamma, T2);
                fr::__add_with_coarse_reduction(T2, w_o_lagrange_base[i], accumulators[5][i]);

                fr::__mul_with_coarse_reduction(work_root, key->small_domain.root, work_root);
            }
        }

        // step 2: compute the constituent components of Z(X). This is a small multithreading bottleneck, as we have
        // 6 non-parallelizable processes
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t i = 0; i < 6; ++i) {
            fr::field_t* coeffs = &accumulators[i][0];
            for (size_t j = 0; j < key->small_domain.size - 1; ++j) {
                fr::__mul_with_coarse_reduction(coeffs[j + 1], coeffs[j], coeffs[j + 1]);
            }
        }
    
    // step 3: concatenate together the accumulator elements into Z(X)
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
    for (size_t j = 0; j < key->small_domain.num_threads; ++j)
    {
        const size_t start = j * key->small_domain.thread_size;
        const size_t end = ((j + 1) * key->small_domain.thread_size) - ((j == key->small_domain.num_threads - 1) ? 1 : 0);
        fr::field_t inversion_accumulator = fr::one;
        for (size_t i = start; i < end; ++i)
        {
            fr::__mul_with_coarse_reduction(accumulators[0][i], accumulators[1][i], accumulators[0][i]);
            fr::__mul_with_coarse_reduction(accumulators[0][i], accumulators[2][i], accumulators[0][i]);
            fr::__mul_with_coarse_reduction(accumulators[3][i], accumulators[4][i], accumulators[3][i]);
            fr::__mul_with_coarse_reduction(accumulators[3][i], accumulators[5][i], accumulators[3][i]);
            fr::__mul_with_coarse_reduction(accumulators[0][i], inversion_accumulator, accumulators[1][i]);
            fr::__mul_with_coarse_reduction(inversion_accumulator, accumulators[3][i], inversion_accumulator);
        }
        fr::__invert(inversion_accumulator, inversion_accumulator);
        for (size_t i = end - 1; i != start - 1; --i)
        {
            // N.B. accumulators[0][i] = z[i + 1]
            // We can not fully reduce z[i + 1] as the inverse fft will take care of that for us
            fr::__mul_with_coarse_reduction(inversion_accumulator, accumulators[1][i], accumulators[0][i]);
            fr::__mul_with_coarse_reduction(inversion_accumulator, accumulators[3][i], inversion_accumulator);
        }
    }
    }
    z[0] = fr::one;
    z.ifft(key->small_domain);
}

void Prover::compute_permutation_grand_product_coefficients()
{
    polynomial& z_fft = key->z_fft;

    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t neg_alpha = fr::neg(alpha);
    fr::field_t alpha_squared = fr::sqr(alpha);
    fr::field_t beta = fr::serialize_from_buffer(transcript.get_challenge("beta").begin());
    fr::field_t gamma = fr::serialize_from_buffer(transcript.get_challenge("gamma").begin());

    fr::field_t right_shift = fr::multiplicative_generator;
    fr::field_t output_shift = fr::alternate_multiplicative_generator;

    // Our permutation check boils down to two 'grand product' arguments,
    // that we represent with a single polynomial Z(X).
    // We want to test that Z(X) has been constructed correctly.
    // When evaluated at elements of w \in H, the numerator of Z(w) will equal the
    // identity permutation grand product, and the denominator will equal the copy permutation grand product.

    // The identity that we need to evaluate is: Z(X.w).(permutation grand product) = Z(X).(identity grand product)
    // i.e. The next element of Z is equal to the current element of Z, multiplied by (identity grand product) /
    // (permutation grand product)

    // This method computes `Z(X).(identity grand product).{alpha}`.
    // The random `alpha` is there to ensure our grand product polynomial identity is linearly independent from the
    // other polynomial identities that we are going to roll into the quotient polynomial T(X).

    // Specifically, we want to compute:
    // (w_l(X) + \beta.sigma1(X) + \gamma).(w_r(X) + \beta.sigma2(X) + \gamma).(w_o(X) + \beta.sigma3(X) +
    // \gamma).Z(X).alpha Once we divide by the vanishing polynomial, this will be a degree 3n polynomial.

    // Multiply Z(X) by \alpha^2 when performing fft transform - we get this for free if we roll \alpha^2 into the
    // multiplicative generator
    z_fft.coset_fft_with_constant(key->large_domain, alpha);

    // We actually want Z(X.w), not Z(X)! But that's easy to get. z_fft contains Z(X) evaluated at the 4n'th roots of
    // unity. So z_fft(i) = Z(w^{i/4}) i.e. z_fft(i + 4) = Z(w^{i/4}.w)
    // => if virtual term 'foo' contains a 4n fft of Z(X.w), then z_fft(i + 4) = foo(i)
    // So all we need to do, to get Z(X.w) is to offset indexes to z_fft by 4.
    // If `i >= 4n  4`, we need to wrap around to the start - so just append the 4 starting elements to the end of z_fft
    z_fft.add_lagrange_base_coefficient(z_fft[0]);
    z_fft.add_lagrange_base_coefficient(z_fft[1]);
    z_fft.add_lagrange_base_coefficient(z_fft[2]);
    z_fft.add_lagrange_base_coefficient(z_fft[3]);

    const polynomial& w_l_fft = key->wire_ffts.at("w_1_fft");
    const polynomial& w_r_fft = key->wire_ffts.at("w_2_fft");
    const polynomial& w_o_fft = key->wire_ffts.at("w_3_fft");

    const polynomial& sigma_1_fft = key->permutation_selector_ffts.at("sigma_1_fft");
    const polynomial& sigma_2_fft = key->permutation_selector_ffts.at("sigma_2_fft");
    const polynomial& sigma_3_fft = key->permutation_selector_ffts.at("sigma_3_fft");

    const polynomial& l_1 = key->lagrange_1;

    polynomial& quotient_large = key->quotient_large;
    // Step 4: Set the quotient polynomial to be equal to
    // (w_l(X) + \beta.sigma1(X) + \gamma).(w_r(X) + \beta.sigma2(X) + \gamma).(w_o(X) + \beta.sigma3(X) +
    // \gamma).Z(X).alpha
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < key->large_domain.num_threads; ++j) {
        const size_t start = j * key->large_domain.thread_size;
        const size_t end = (j + 1) * key->large_domain.thread_size;

        fr::field_t w_l_plus_gamma;
        fr::field_t w_r_plus_gamma;
        fr::field_t w_o_plus_gamma;

        fr::field_t work_root;
        fr::__pow_small(key->large_domain.root, j * key->large_domain.thread_size, work_root);
        fr::__mul(work_root, fr::multiplicative_generator, work_root);
        fr::__mul(work_root, beta, work_root);

        fr::field_t T0;
        fr::field_t T1;
        fr::field_t denominator;
        fr::field_t numerator;
        for (size_t i = start; i < end; ++i) {

            fr::__add_without_reduction(w_l_fft[i], gamma, w_l_plus_gamma);
            fr::__add_without_reduction(w_r_fft[i], gamma, w_r_plus_gamma);
            fr::__add_without_reduction(w_o_fft[i], gamma, w_o_plus_gamma);

            // Numerator computation
            // (w_l + b + gamma)(w_r + b.k1 + gamma)(w_o + b.k2 + gamma)Z(X)
            fr::__add_with_coarse_reduction(work_root, w_l_plus_gamma, numerator);
            fr::__mul_with_coarse_reduction(work_root, right_shift, T0);
            fr::__add_with_coarse_reduction(T0, w_r_plus_gamma, T0);
            fr::__mul_with_coarse_reduction(numerator, T0, numerator);
            fr::__mul_with_coarse_reduction(work_root, output_shift, T0);
            fr::__add_with_coarse_reduction(T0, w_o_plus_gamma, T0);
            fr::__mul_with_coarse_reduction(numerator, T0, numerator);
            fr::__mul_with_coarse_reduction(numerator, z_fft[i], numerator);

            // Denominator computation
            // (w_l + b.sig1 + gamma)(w_r + b.sig2 + gamma)(w_l + b.sig3 + gamma)Z(X.w)
            fr::__mul_with_coarse_reduction(sigma_1_fft[i], beta, denominator);
            fr::__add_with_coarse_reduction(denominator, w_l_plus_gamma, denominator);

            // (w_l + B.sigma_1 + \gamma).(w_r + B.sigma_2 + \gamma)
            fr::__mul_with_coarse_reduction(sigma_2_fft[i], beta, T0);
            fr::__add_with_coarse_reduction(T0, w_r_plus_gamma, T0);
            fr::__mul_with_coarse_reduction(denominator, T0, denominator);

            // (w_l + B.sigma_1 + \gamma).(w_r + B.sigma_2 + \gamma).(w_o + B.sigma_3 + \gamma)
            fr::__mul_with_coarse_reduction(sigma_3_fft[i], beta, T0);
            fr::__add_with_coarse_reduction(T0, w_o_plus_gamma, T0);
            fr::__mul_with_coarse_reduction(denominator, T0, denominator);

            fr::__mul_with_coarse_reduction(denominator, z_fft[i + 4], denominator);

            /**
             * Permutation bounds check
             * (Z(X.w) - 1).(\alpha^3).L{n-1}(X) = T(X)Z_H(X)
             **/
            // The \alpha^3 term is so that we can subsume this polynomial into the quotient polynomial,
            // whilst ensuring the term is linearly independent form the other terms in the quotient polynomial

            // We want to verify that Z(X) equals `1` when evaluated at `w_n`, the 'last' element of our multiplicative
            // subgroup H. But PLONK's 'vanishing polynomial', Z*_H(X), isn't the true vanishing polynomial of subgroup
            // H. We need to cut a root of unity out of Z*_H(X), specifically `w_n`, for our grand product argument.
            // When evaluating Z(X) has been constructed correctly, we verify that Z(X.w).(identity permutation product)
            // = Z(X).(sigma permutation product), for all X \in H. But this relationship breaks down for X = w_n,
            // because Z(X.w) will evaluate to the *first* element of our grand product argument. The last element of
            // Z(X) has a dependency on the first element, so the first element cannot have a dependency on the last
            // element.

            // TODO: With the reduction from 2 Z polynomials to a single Z(X), the above no longer applies
            // TODO: Fix this to remove the (Z(X.w) - 1).L_{n-1}(X) check

            // To summarise, we can't verify claims about Z(X) when evaluated at `w_n`.
            // But we can verify claims about Z(X.w) when evaluated at `w_{n-1}`, which is the same thing

            // To summarise the summary: If Z(w_n) = 1, then (Z(X.w) - 1).L_{n-1}(X) will be divisible by Z_H*(X)
            // => add linearly independent term (Z(X.w) - 1).(\alpha^3).L{n-1}(X) into the quotient polynomial to check
            // this

            // z_fft already contains evaluations of Z(X).(\alpha^2)
            // at the (2n)'th roots of unity
            // => to get Z(X.w) instead of Z(X), index element (i+2) instead of i
            fr::__add_without_reduction(z_fft[i + 4], neg_alpha, T0); // T0 = (Z(X.w) - 1).(\alpha^2)
            fr::__mul_with_coarse_reduction(T0, alpha, T0);           // T0 = (Z(X.w) - 1).(\alpha^3)
            fr::__mul_with_coarse_reduction(T0, l_1[i + 8], T0);      // T0 = (Z(X.w) - 1).(\alpha^3).L{n-1}(X)

            // Step 2: Compute (Z(X) - 1).(\alpha^4).L1(X)
            // We need to verify that Z(X) equals `1` when evaluated at the first element of our subgroup H
            // i.e. Z(X) starts at 1 and ends at 1
            // The `alpha^4` term is so that we can add this as a linearly independent term in our quotient polynomial
            fr::__add_without_reduction(z_fft[i], neg_alpha, T1);   // T1 = (Z(X) - 1).(\alpha^2)
            fr::__mul_with_coarse_reduction(T1, alpha_squared, T1); // T1 = (Z(X) - 1).(\alpha^4)
            fr::__mul_with_coarse_reduction(T1, l_1[i], T1);        // T1 = (Z(X) - 1).(\alpha^2).L1(X)

            // Combine into quotient polynomial
            fr::__add_with_coarse_reduction(T0, T1, T0);
            fr::__add_with_coarse_reduction(T0, numerator, T0);
            fr::__sub_with_coarse_reduction(T0, denominator, T0);
            fr::reduce_once(T0, quotient_large[i]);

            // Update our working root of unity
            fr::__mul_with_coarse_reduction(work_root, key->large_domain.root, work_root);
        }
    }
}

void Prover::init_quotient_polynomials()
{
    n = key->n;
}

void Prover::execute_preamble_round()
{
    std::vector<uint8_t> size_bytes(4);

    transcript.add_element("circuit_size",
                           { static_cast<uint8_t>(n),
                             static_cast<uint8_t>(n >> 8),
                             static_cast<uint8_t>(n >> 16),
                             static_cast<uint8_t>(n >> 24) });
    transcript.apply_fiat_shamir("init");
}

void Prover::execute_first_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    init_quotient_polynomials();
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "init quotient polys: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    compute_wire_coefficients();
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute wire coefficients: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    compute_wire_commitments();
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute wire commitments: " << diff.count() << "ms" << std::endl;
#endif
}

void Prover::execute_second_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    compute_z_coefficients();
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute z coefficients: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    compute_z_commitment();
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute z commitment: " << diff.count() << "ms" << std::endl;
#endif
}

void Prover::execute_third_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    polynomial& w_l_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_r_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_o_fft = key->wire_ffts.at("w_3_fft");

    polynomial& w_l = witness->wires.at("w_1");
    polynomial& w_r = witness->wires.at("w_2");
    polynomial& w_o = witness->wires.at("w_3");

    polynomial_arithmetic::copy_polynomial(&w_l[0], &w_l_fft[0], n, 4 * n + 4);
    polynomial_arithmetic::copy_polynomial(&w_r[0], &w_r_fft[0], n, 4 * n + 4);
    polynomial_arithmetic::copy_polynomial(&w_o[0], &w_o_fft[0], n, 4 * n + 4);
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "wire copy into fft poly time: " << diff.count() << "ms" << std::endl;
#endif

#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    w_l_fft.coset_fft(key->large_domain);
    w_r_fft.coset_fft(key->large_domain);
    w_o_fft.coset_fft(key->large_domain);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "3 wire ffts: " << diff.count() << "ms" << std::endl;
#endif
    w_l_fft.add_lagrange_base_coefficient(w_l_fft[0]);
    w_l_fft.add_lagrange_base_coefficient(w_l_fft[1]);
    w_l_fft.add_lagrange_base_coefficient(w_l_fft[2]);
    w_l_fft.add_lagrange_base_coefficient(w_l_fft[3]);
    w_r_fft.add_lagrange_base_coefficient(w_r_fft[0]);
    w_r_fft.add_lagrange_base_coefficient(w_r_fft[1]);
    w_r_fft.add_lagrange_base_coefficient(w_r_fft[2]);
    w_r_fft.add_lagrange_base_coefficient(w_r_fft[3]);
    w_o_fft.add_lagrange_base_coefficient(w_o_fft[0]);
    w_o_fft.add_lagrange_base_coefficient(w_o_fft[1]);
    w_o_fft.add_lagrange_base_coefficient(w_o_fft[2]);
    w_o_fft.add_lagrange_base_coefficient(w_o_fft[3]);
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    if (__DEBUG_HAS_FOURTH_WIRE) {
        polynomial& w_4_fft = key->wire_ffts.at("w_4_fft");
        polynomial& w_4 = witness->wires.at("w_4");
        polynomial_arithmetic::copy_polynomial(&w_4[0], &w_4_fft[0], n, 4 * n + 4);

        w_4_fft.coset_fft(key->large_domain);
        w_4_fft.add_lagrange_base_coefficient(w_4_fft[0]);
        w_4_fft.add_lagrange_base_coefficient(w_4_fft[1]);
        w_4_fft.add_lagrange_base_coefficient(w_4_fft[2]);
        w_4_fft.add_lagrange_base_coefficient(w_4_fft[3]);
    }
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute fourth wire computation: " << diff.count() << "ms" << std::endl;
#endif

#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    polynomial& z = key->z;
    polynomial& z_fft = key->z_fft;
    polynomial_arithmetic::copy_polynomial(&z[0], &z_fft[0], n, 4 * n + 4);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "copy z: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    compute_permutation_grand_product_coefficients();
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute permutation grand product coeffs: " << diff.count() << "ms" << std::endl;
#endif
// #ifdef DEBUG_TIMING
//     start = std::chrono::steady_clock::now();
// #endif
//     compute_identity_grand_product_coefficients();
// #ifdef DEBUG_TIMING
//     end = std::chrono::steady_clock::now();
//     diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
//     std::cout << "compute identity grand product coeffs: " << diff.count() << "ms" << std::endl;
// #endif
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t alpha_base = fr::sqr(fr::sqr(alpha));
    fr::mul(alpha, alpha_base);
    for (size_t i = 0; i < widgets.size(); ++i) {
#ifdef DEBUG_TIMING
        std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
        alpha_base = widgets[i]->compute_quotient_contribution(alpha_base, transcript);
#ifdef DEBUG_TIMING
        std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
        std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        std::cout << "widget " << i << " quotient compute time: " << diff.count() << "ms" << std::endl;
#endif
    }
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    if (uses_quotient_mid) {
        polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(
            key->quotient_mid.get_coefficients(), key->small_domain, key->mid_domain);
    }
    polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(
        key->quotient_large.get_coefficients(), key->small_domain, key->large_domain);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "divide by vanishing polynomial: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    if (uses_quotient_mid) {
        key->quotient_mid.coset_ifft(key->mid_domain);
    }
    key->quotient_large.coset_ifft(key->large_domain);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "final inverse fourier transforms: " << diff.count() << "ms" << std::endl;
#endif
    if (uses_quotient_mid) {
        fr::field_t* q_mid = &key->quotient_mid[0];
        fr::field_t* q_large = &key->quotient_large[0];
        ITERATE_OVER_DOMAIN_START(key->mid_domain);
        fr::__add(q_large[i], q_mid[i], q_large[i]);
        ITERATE_OVER_DOMAIN_END;
    }
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    compute_quotient_commitment();
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute quotient commitment: " << diff.count() << "ms" << std::endl;
#endif
}

void Prover::execute_fourth_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    compute_linearisation_coefficients();
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute linearisation coefficients: " << diff.count() << "ms" << std::endl;
#endif
    transcript.apply_fiat_shamir("nu");
}

void Prover::execute_fifth_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    fr::field_t nu = fr::serialize_from_buffer(transcript.get_challenge("nu").begin());
    fr::field_t z_challenge = fr::serialize_from_buffer(transcript.get_challenge("z").begin());
    // fr::field_t beta = fr::serialize_from_buffer(transcript.get_challenge("beta").begin());
    fr::field_t* r = key->linear_poly.get_coefficients();
    fr::field_t* w_l = witness->wires.at("w_1").get_coefficients();
    fr::field_t* w_r = witness->wires.at("w_2").get_coefficients();
    fr::field_t* w_o = witness->wires.at("w_3").get_coefficients();
    fr::field_t* w_4 = nullptr;
    if (__DEBUG_HAS_FOURTH_WIRE) {
        w_4 = witness->wires.at("w_4").get_coefficients();
    }
    fr::field_t* sigma_1 = key->permutation_selectors.at("sigma_1").get_coefficients();
    fr::field_t* sigma_2 = key->permutation_selectors.at("sigma_2").get_coefficients();

    fr::field_t nu_powers[9];
    fr::__copy(nu, nu_powers[0]);
    for (size_t i = 1; i < 9; ++i) {
        fr::__mul(nu_powers[i - 1], nu_powers[0], nu_powers[i]);
    }

    // fr::field_t beta_inv;
    // fr::__invert(beta, beta_inv);
    polynomial& z = key->z;
    // Next step: compute the two Kate polynomial commitments, and associated opening proofs
    // We have two evaluation points: z and z.omega
    // We need to create random linear combinations of each individual polynomial and combine them

    polynomial& opening_poly = key->opening_poly;
    polynomial& shifted_opening_poly = key->shifted_opening_poly;
    fr::field_t z_pow_n;
    fr::field_t z_pow_2_n;
    fr::field_t z_pow_3_n;

    fr::__pow_small(z_challenge, n, z_pow_n);
    fr::__pow_small(z_challenge, 2 * n, z_pow_2_n);
    fr::__pow_small(z_challenge, 3 * n, z_pow_3_n);

    polynomial& quotient_large = key->quotient_large;

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T8;
    fr::field_t T9;
    fr::field_t T11;
    fr::__mul_with_coarse_reduction(quotient_large[i + n], z_pow_n, T8);
    fr::__mul_with_coarse_reduction(quotient_large[i + n + n], z_pow_2_n, T9);
    fr::__mul_with_coarse_reduction(quotient_large[i + n + n + n], z_pow_3_n, T11);

    fr::__mul_with_coarse_reduction(r[i], nu_powers[0], T0);
    fr::__mul_with_coarse_reduction(w_l[i], nu_powers[1], T1);
    fr::__mul_with_coarse_reduction(w_r[i], nu_powers[2], T2);
    fr::__mul_with_coarse_reduction(w_o[i], nu_powers[3], T3);
    fr::__mul_with_coarse_reduction(sigma_1[i], nu_powers[4], T4);
    fr::__mul_with_coarse_reduction(sigma_2[i], nu_powers[5], T5);
    fr::__mul(z[i], nu_powers[6], shifted_opening_poly[i]);
    if (__DEBUG_HAS_FOURTH_WIRE) {
        fr::field_t T10;
        fr::__mul_with_coarse_reduction(w_4[i], nu_powers[7], T10);
        fr::__add(T0, T10, T0);
    }
    fr::__add_with_coarse_reduction(T9, T11, T9);
    fr::__add_with_coarse_reduction(T8, T9, T8);
    fr::__add_with_coarse_reduction(T4, T5, T4);
    fr::__add_with_coarse_reduction(T3, T2, T3);
    fr::__add_with_coarse_reduction(T1, T0, T1);
    fr::__add_with_coarse_reduction(T3, T1, T3);
    fr::__add_with_coarse_reduction(T4, T3, T4);
    fr::__add_with_coarse_reduction(T4, T8, T4);
    fr::reduce_once(T4, T4);
    fr::__add(quotient_large[i], T4, opening_poly[i]);
    ITERATE_OVER_DOMAIN_END;

    fr::field_t nu_base = nu_powers[8];

    // TODO compute 'needs_blah_shifted' in constructor
    bool needs_w_l_shifted = false;
    bool needs_w_r_shifted = false;
    bool needs_w_o_shifted = false;
    bool needs_w_4_shifted = false;

    for (size_t i = 0; i < widgets.size(); ++i) {
        needs_w_l_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
        needs_w_r_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
        needs_w_o_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
        needs_w_4_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_4_SHIFTED);
    }
    if (needs_w_l_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_l[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_r_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_r[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_o_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_o[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_4_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_4[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute base opening poly contribution: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    for (size_t i = 0; i < widgets.size(); ++i) {
        nu_base = widgets[i]->compute_opening_poly_contribution(
            nu_base, transcript, &opening_poly[0], &shifted_opening_poly[0]);
    }
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute widget opening poly contributions: " << diff.count() << "ms" << std::endl;
#endif
    fr::field_t shifted_z;
    fr::__mul(z_challenge, key->small_domain.root, shifted_z);
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    opening_poly.compute_kate_opening_coefficients(z_challenge);

    shifted_opening_poly.compute_kate_opening_coefficients(shifted_z);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute kate opening poly coefficients: " << diff.count() << "ms" << std::endl;
#endif
#ifdef DEBUG_TIMING
    start = std::chrono::steady_clock::now();
#endif
    g1::element PI_Z =
        scalar_multiplication::pippenger_unsafe(opening_poly.get_coefficients(), key->reference_string.monomials, n);

    g1::element PI_Z_OMEGA =
        scalar_multiplication::pippenger_unsafe(shifted_opening_poly.get_coefficients(), key->reference_string.monomials, n);

    g1::affine_element PI_Z_affine;
    g1::affine_element PI_Z_OMEGA_affine;

    g1::jacobian_to_affine(PI_Z, PI_Z_affine);
    g1::jacobian_to_affine(PI_Z_OMEGA, PI_Z_OMEGA_affine);
#ifdef DEBUG_TIMING
    end = std::chrono::steady_clock::now();
    diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute opening commitment: " << diff.count() << "ms" << std::endl;
#endif
    transcript.add_element("PI_Z", transcript_helpers::convert_g1_element(PI_Z_affine));
    transcript.add_element("PI_Z_OMEGA", transcript_helpers::convert_g1_element(PI_Z_OMEGA_affine));
}

fr::field_t Prover::compute_linearisation_coefficients()
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t z_challenge = fr::serialize_from_buffer(transcript.get_challenge("z").begin());

    polynomial& r = key->linear_poly;
    polynomial& z = key->z;
    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t shifted_z;
    fr::__mul(z_challenge, key->small_domain.root, shifted_z);

    barretenberg::polynomial& sigma_1 = key->permutation_selectors.at("sigma_1");
    barretenberg::polynomial& sigma_2 = key->permutation_selectors.at("sigma_2");
    barretenberg::polynomial& sigma_3 = key->permutation_selectors.at("sigma_3");

    barretenberg::polynomial& w_l = witness->wires.at("w_1");
    barretenberg::polynomial& w_r = witness->wires.at("w_2");
    barretenberg::polynomial& w_o = witness->wires.at("w_3");

    barretenberg::polynomial* w_4 = __DEBUG_HAS_FOURTH_WIRE ? &witness->wires.at("w_4") : nullptr;
    // evaluate the prover and instance polynomials.
    // (we don't need to evaluate the quotient polynomial, that can be derived by the verifier)
    fr::field_t w_l_eval = w_l.evaluate(z_challenge, n);
    fr::field_t w_r_eval = w_r.evaluate(z_challenge, n);
    fr::field_t w_o_eval = w_o.evaluate(z_challenge, n);

    if (__DEBUG_HAS_FOURTH_WIRE) {
        fr::field_t w_4_eval = w_4->evaluate(z_challenge, n);
        transcript.add_element("w_4", transcript_helpers::convert_field_element(w_4_eval));
    }
    transcript.add_element("w_1", transcript_helpers::convert_field_element(w_l_eval));
    transcript.add_element("w_2", transcript_helpers::convert_field_element(w_r_eval));
    transcript.add_element("w_3", transcript_helpers::convert_field_element(w_o_eval));
    bool needs_w_l_shifted = false;
    bool needs_w_r_shifted = false;
    bool needs_w_o_shifted = false;
    bool needs_w_4_shifted = false;
    for (size_t i = 0; i < widgets.size(); ++i) {
        needs_w_l_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
        needs_w_r_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
        needs_w_o_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
        needs_w_4_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_4_SHIFTED);
    }
    if (needs_w_l_shifted) {
        transcript.add_element("w_1_omega", transcript_helpers::convert_field_element(w_l.evaluate(shifted_z, n)));
    }
    if (needs_w_r_shifted) {
        transcript.add_element("w_2_omega", transcript_helpers::convert_field_element(w_r.evaluate(shifted_z, n)));
    }
    if (needs_w_o_shifted) {
        transcript.add_element("w_3_omega", transcript_helpers::convert_field_element(w_o.evaluate(shifted_z, n)));
    }
    if (needs_w_4_shifted) {
        transcript.add_element("w_4_omega", transcript_helpers::convert_field_element(w_4->evaluate(shifted_z, n)));
    }
    fr::field_t sigma_1_eval = sigma_1.evaluate(z_challenge, n);
    fr::field_t sigma_2_eval = sigma_2.evaluate(z_challenge, n);
    fr::field_t z_1_shifted_eval = z.evaluate(shifted_z, n);
    transcript.add_element("z_omega", transcript_helpers::convert_field_element(z_1_shifted_eval));

    for (size_t i = 0; i < widgets.size(); ++i) {
        widgets[i]->compute_transcript_elements(transcript);
    }
    fr::field_t t_eval = key->quotient_large.evaluate(z_challenge, 4 * n);
    transcript.add_element("sigma_1", transcript_helpers::convert_field_element(sigma_1_eval));
    transcript.add_element("sigma_2", transcript_helpers::convert_field_element(sigma_2_eval));

    polynomial_arithmetic::lagrange_evaluations lagrange_evals =
        polynomial_arithmetic::get_lagrange_evaluations(z_challenge, key->small_domain);
    plonk_linear_terms linear_terms = compute_linear_terms(transcript, lagrange_evals.l_1);

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::__mul_with_coarse_reduction(z[i], linear_terms.z_1, T0);
    fr::__mul_with_coarse_reduction(sigma_3[i], linear_terms.sigma_3, T1);
    fr::__add_with_coarse_reduction(T0, T1, T0);
    fr::reduce_once(T0, r[i]);
    ITERATE_OVER_DOMAIN_END;

    fr::field_t alpha_base = fr::sqr(fr::sqr(alpha));
    for (size_t i = 0; i < widgets.size(); ++i) {
        alpha_base = widgets[i]->compute_linear_contribution(alpha_base, transcript, r);
    }

    fr::field_t linear_eval = r.evaluate(z_challenge, n);
    transcript.add_element("r", transcript_helpers::convert_field_element(linear_eval));
    transcript.add_element("t", transcript_helpers::convert_field_element(t_eval));

    return t_eval;
}

waffle::plonk_proof Prover::construct_proof()
{
    execute_preamble_round();
    execute_first_round();
    execute_second_round();
    execute_third_round();
    execute_fourth_round();
    execute_fifth_round();

    waffle::plonk_proof result;
    result.proof_data = transcript.export_transcript();
    return result;
}

void Prover::reset()
{
    for (size_t i = 0; i < widgets.size(); ++i) {
        widgets[i]->reset();
    }
}
} // namespace waffle