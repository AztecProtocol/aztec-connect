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

template <size_t program_width>
ProverBase<program_width>::ProverBase(std::shared_ptr<proving_key> input_key,
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
{}

template <size_t program_width>
ProverBase<program_width>::ProverBase(ProverBase<program_width>&& other)
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

template <size_t program_width>
ProverBase<program_width>& ProverBase<program_width>::operator=(ProverBase<program_width>&& other)
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

template <size_t program_width> void ProverBase<program_width>::compute_wire_commitments()
{
    std::array<g1::element, program_width> W;
    for (size_t i = 0; i < program_width; ++i)
    {
        std::string wire_tag = "w_" + std::to_string(i + 1);
        W[i] = scalar_multiplication::pippenger_unsafe(
            witness->wires.at(wire_tag).get_coefficients(), key->reference_string.monomials, n);
    }

    g1::batch_normalize(&W[0], program_width);

    for (size_t i = 0; i < program_width; ++i)
    {
        g1::affine_element W_affine;
        W_affine.x = W[i].x;
        W_affine.y = W[i].y;
        std::string tag = "W_" + std::to_string(i + 1);
        transcript.add_element(tag, transcript_helpers::convert_g1_element(W_affine));
    }

    transcript.apply_fiat_shamir("beta");
    transcript.apply_fiat_shamir("gamma");
}

template <size_t program_width> void ProverBase<program_width>::compute_z_commitment()
{
    g1::element Z =
        scalar_multiplication::pippenger_unsafe(key->z.get_coefficients(), key->reference_string.monomials, n);
    g1::affine_element Z_affine;
    g1::jacobian_to_affine(Z, Z_affine);

    transcript.add_element("Z", transcript_helpers::convert_g1_element(Z_affine));
    transcript.apply_fiat_shamir("alpha");
}

template <size_t program_width> void ProverBase<program_width>::compute_quotient_commitment()
{
    std::array<g1::element, program_width> T;
    for (size_t i = 0; i < program_width; ++i) {
        const size_t offset = n * i;
        T[i] = scalar_multiplication::pippenger_unsafe(
            &key->quotient_large.get_coefficients()[offset], key->reference_string.monomials, n);
    }

    g1::batch_normalize(&T[0], program_width);

    for (size_t i = 0; i < program_width; ++i) {
        g1::affine_element T_affine;
        T_affine.x = T[i].x;
        T_affine.y = T[i].y;
        std::string tag = "T_" + std::to_string(i + 1);
        transcript.add_element(tag, transcript_helpers::convert_g1_element(T_affine));
    }

    transcript.apply_fiat_shamir("z"); // end of 3rd round
}

template <size_t program_width> void ProverBase<program_width>::compute_wire_coefficients()
{
    for (size_t i = 0; i < program_width; ++i) {
        std::string wire_tag = "w_" + std::to_string(i + 1);
        barretenberg::polynomial& wire = witness->wires.at(wire_tag);
        barretenberg::polynomial& wire_fft = key->wire_ffts.at(wire_tag + "_fft");
        polynomial_arithmetic::copy_polynomial(&wire[0], &wire_fft[0], n, n);
        wire.ifft(key->small_domain);
    }
}

template <size_t program_width> void ProverBase<program_width>::compute_z_coefficients()
{
    constexpr size_t temp_width = 3;
    polynomial& z = key->z;

    fr::field_t* accumulators[(temp_width == 1) ? 3 : temp_width * 2];
    accumulators[0] = &z[1];
    accumulators[1] = &key->z_fft[0];
    accumulators[2] = &key->z_fft[n];

    if constexpr (temp_width * 2 > 2) {
        accumulators[3] = &key->z_fft[n + n];
    }
    if constexpr (temp_width > 2) {
        accumulators[4] = &key->z_fft[n + n + n];
        accumulators[5] = &key->opening_poly[0];
    }
    if constexpr (temp_width > 3) {
        accumulators[6] = &key->shifted_opening_poly[0];
        accumulators[7] = &key->linear_poly[0];
    }
    if constexpr (temp_width > 4) {
        accumulators[8] = &key->quotient_large[0];
        accumulators[9] = &key->quotient_large[n];
    }
    if constexpr (temp_width > 5) {
        accumulators[10] = &key->quotient_large[n + n];
        accumulators[11] = &key->quotient_large[n + n + n];
    }
    for (size_t k = 7; k < temp_width; ++k) {
        // we're out of temporary memory!
        accumulators[(k - 1) * 2] = static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * n));
        accumulators[(k - 1) * 2 + 1] = static_cast<fr::field_t*>(aligned_alloc(64, sizeof(fr::field_t) * n));
    }

    fr::field_t beta = fr::serialize_from_buffer(transcript.get_challenge("beta").begin());
    fr::field_t gamma = fr::serialize_from_buffer(transcript.get_challenge("gamma").begin());

    std::array<fr::field_t*, temp_width> lagrange_base_wires;
    std::array<fr::field_t*, temp_width> lagrange_base_sigmas;

    for (size_t i = 0; i < temp_width; ++i) {
        lagrange_base_wires[i] = &key->wire_ffts.at("w_" + std::to_string(i + 1) + "_fft")[0];
        lagrange_base_sigmas[i] = &key->permutation_selectors_lagrange_base.at("sigma_" + std::to_string(i + 1))[0];
    }

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
            fr::field_t T0;
            fr::field_t wire_plus_gamma;
            size_t start = j * key->small_domain.thread_size;
            size_t end = (j + 1) * key->small_domain.thread_size;
            for (size_t i = start; i < end; ++i) {
                fr::__add_without_reduction(gamma, lagrange_base_wires[0][i], wire_plus_gamma);
                fr::__add_with_coarse_reduction(wire_plus_gamma, work_root, accumulators[0][i]);

                fr::__mul_with_coarse_reduction(lagrange_base_sigmas[0][i], beta, T0);
                fr::__add_with_coarse_reduction(T0, wire_plus_gamma, accumulators[3][i]);

                for (size_t k = 1; k < temp_width; ++k) {
                    fr::__add_without_reduction(gamma, lagrange_base_wires[k][i], wire_plus_gamma);

                    fr::__mul_with_coarse_reduction(work_root, fr::coset_generators[k - 1], T0);
                    fr::__add_with_coarse_reduction(T0, wire_plus_gamma, accumulators[k][i]);

                    fr::__mul_with_coarse_reduction(lagrange_base_sigmas[k][i], beta, T0);
                    fr::__add_with_coarse_reduction(T0, wire_plus_gamma, accumulators[k + temp_width][i]);
                }

                fr::__mul_with_coarse_reduction(work_root, key->small_domain.root, work_root);
            }
        }

        // step 2: compute the constituent components of Z(X). This is a small multithreading bottleneck, as we have
        // program_width * 2 non-parallelizable processes
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t i = 0; i < temp_width * 2; ++i) {
            fr::field_t* coeffs = &accumulators[i][0];
            for (size_t j = 0; j < key->small_domain.size - 1; ++j) {
                fr::__mul_with_coarse_reduction(coeffs[j + 1], coeffs[j], coeffs[j + 1]);
            }
        }

        // step 3: concatenate together the accumulator elements into Z(X)
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t j = 0; j < key->small_domain.num_threads; ++j) {
            const size_t start = j * key->small_domain.thread_size;
            const size_t end =
                ((j + 1) * key->small_domain.thread_size) - ((j == key->small_domain.num_threads - 1) ? 1 : 0);
            fr::field_t inversion_accumulator = fr::one;
            constexpr size_t inversion_index = (temp_width == 1) ? 2 : temp_width * 2 - 1;
            fr::field_t* inversion_coefficients = &accumulators[inversion_index][0];
            for (size_t i = start; i < end; ++i) {

                for (size_t k = 1; k < temp_width; ++k) {
                    fr::__mul_with_coarse_reduction(accumulators[0][i], accumulators[k][i], accumulators[0][i]);
                    fr::__mul_with_coarse_reduction(
                        accumulators[temp_width][i], accumulators[temp_width + k][i], accumulators[temp_width][i]);
                }
                fr::__mul_with_coarse_reduction(accumulators[0][i], inversion_accumulator, inversion_coefficients[i]);
                fr::__mul_with_coarse_reduction(
                    inversion_accumulator, accumulators[temp_width][i], inversion_accumulator);
            }
            fr::__invert(inversion_accumulator, inversion_accumulator);
            for (size_t i = end - 1; i != start - 1; --i) {

                // N.B. accumulators[0][i] = z[i + 1]
                // We can avoid fully reducing z[i + 1] as the inverse fft will take care of that for us
                fr::__mul_with_coarse_reduction(inversion_accumulator, inversion_coefficients[i], accumulators[0][i]);
                fr::__mul_with_coarse_reduction(
                    inversion_accumulator, accumulators[temp_width][i], inversion_accumulator);
            }
        }
    }
    z[0] = fr::one;
    z.ifft(key->small_domain);

    for (size_t k = 7; k < temp_width; ++k) {
        aligned_free(accumulators[(k - 1) * 2]);
        aligned_free(accumulators[(k - 1) * 2 + 1]);
    }
}

template <size_t program_width> void ProverBase<program_width>::compute_permutation_grand_product_coefficients()
{
    constexpr size_t temp_width = 3;
    polynomial& z_fft = key->z_fft;

    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t neg_alpha = fr::neg(alpha);
    fr::field_t alpha_squared = fr::sqr(alpha);
    fr::field_t beta = fr::serialize_from_buffer(transcript.get_challenge("beta").begin());
    fr::field_t gamma = fr::serialize_from_buffer(transcript.get_challenge("gamma").begin());

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

    // We actually want Z(X.w) as well as Z(X)! But that's easy to get. z_fft contains Z(X) evaluated at the 4n'th roots of
    // unity. So z_fft(i) = Z(w^{i/4}) i.e. z_fft(i + 4) = Z(w^{i/4}.w)
    // => if virtual term 'foo' contains a 4n fft of Z(X.w), then z_fft(i + 4) = foo(i)
    // So all we need to do, to get Z(X.w) is to offset indexes to z_fft by 4.
    // If `i >= 4n  4`, we need to wrap around to the start - so just append the 4 starting elements to the end of z_fft
    z_fft.add_lagrange_base_coefficient(z_fft[0]);
    z_fft.add_lagrange_base_coefficient(z_fft[1]);
    z_fft.add_lagrange_base_coefficient(z_fft[2]);
    z_fft.add_lagrange_base_coefficient(z_fft[3]);

    std::array<fr::field_t*, temp_width> wire_ffts;
    std::array<fr::field_t*, temp_width> sigma_ffts;

    for (size_t i = 0; i < temp_width; ++i)
    {
        wire_ffts[i] = &key->wire_ffts.at("w_" + std::to_string(i + 1) + "_fft")[0];
        sigma_ffts[i] = &key->permutation_selector_ffts.at("sigma_" + std::to_string(i + 1) + "_fft")[0];
    }
    // const polynomial& w_l_fft = key->wire_ffts.at("w_1_fft");
    // const polynomial& w_r_fft = key->wire_ffts.at("w_2_fft");
    // const polynomial& w_o_fft = key->wire_ffts.at("w_3_fft");

    // const polynomial& sigma_1_fft = key->permutation_selector_ffts.at("sigma_1_fft");
    // const polynomial& sigma_2_fft = key->permutation_selector_ffts.at("sigma_2_fft");
    // const polynomial& sigma_3_fft = key->permutation_selector_ffts.at("sigma_3_fft");

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

        fr::field_t work_root;
        fr::__pow_small(key->large_domain.root, j * key->large_domain.thread_size, work_root);
        fr::__mul(work_root, fr::coset_generators[0], work_root);
        fr::__mul(work_root, beta, work_root);

        fr::field_t wire_plus_gamma;
        fr::field_t T0;
        fr::field_t denominator;
        fr::field_t numerator;
        for (size_t i = start; i < end; ++i) {

            fr::__add_without_reduction(wire_ffts[0][i], gamma, wire_plus_gamma);

            // Numerator computation
            fr::__add_with_coarse_reduction(work_root, wire_plus_gamma, numerator);

            // Denominator computation
            fr::__mul_with_coarse_reduction(sigma_ffts[0][i], beta, denominator);
            fr::__add_with_coarse_reduction(denominator, wire_plus_gamma, denominator);

            for (size_t k = 1; k < temp_width; ++k) {
                fr::__add_without_reduction(wire_ffts[k][i], gamma, wire_plus_gamma);

                fr::__mul_with_coarse_reduction(work_root, fr::coset_generators[k - 1], T0);
                fr::__add_with_coarse_reduction(T0, wire_plus_gamma, T0);
                fr::__mul_with_coarse_reduction(numerator, T0, numerator);

                fr::__mul_with_coarse_reduction(sigma_ffts[k][i], beta, T0);
                fr::__add_with_coarse_reduction(T0, wire_plus_gamma, T0);
                fr::__mul_with_coarse_reduction(denominator, T0, denominator);
            }

            fr::__mul_with_coarse_reduction(numerator, z_fft[i], numerator);
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
            fr::__add_with_coarse_reduction(numerator, T0, numerator);

            // Step 2: Compute (Z(X) - 1).(\alpha^4).L1(X)
            // We need to verify that Z(X) equals `1` when evaluated at the first element of our subgroup H
            // i.e. Z(X) starts at 1 and ends at 1
            // The `alpha^4` term is so that we can add this as a linearly independent term in our quotient polynomial
            fr::__add_without_reduction(z_fft[i], neg_alpha, T0);   // T0 = (Z(X) - 1).(\alpha^2)
            fr::__mul_with_coarse_reduction(T0, alpha_squared, T0); // T0 = (Z(X) - 1).(\alpha^4)
            fr::__mul_with_coarse_reduction(T0, l_1[i], T0);        // T0 = (Z(X) - 1).(\alpha^2).L1(X)
            fr::__add_with_coarse_reduction(numerator, T0, numerator);

            // Combine into quotient polynomial
            fr::__sub_with_coarse_reduction(numerator, denominator, T0);
            fr::reduce_once(T0, quotient_large[i]);

            // Update our working root of unity
            fr::__mul_with_coarse_reduction(work_root, key->large_domain.root, work_root);
        }
    }
}

template <size_t program_width> void ProverBase<program_width>::init_quotient_polynomials()
{
    n = key->n;
}

template <size_t program_width> void ProverBase<program_width>::execute_preamble_round()
{
    std::vector<uint8_t> size_bytes(4);

    transcript.add_element("circuit_size",
                           { static_cast<uint8_t>(n),
                             static_cast<uint8_t>(n >> 8),
                             static_cast<uint8_t>(n >> 16),
                             static_cast<uint8_t>(n >> 24) });
    transcript.apply_fiat_shamir("init");
}

template <size_t program_width> void ProverBase<program_width>::execute_first_round()
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

template <size_t program_width> void ProverBase<program_width>::execute_second_round()
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

template <size_t program_width> void ProverBase<program_width>::execute_third_round()
{
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    for (size_t i = 0; i < program_width; ++i)
    {
        std::string wire_tag = "w_" + std::to_string(i + 1);
        barretenberg::polynomial& wire = witness->wires.at(wire_tag);
        barretenberg::polynomial& wire_fft = key->wire_ffts.at(wire_tag + "_fft");

        polynomial_arithmetic::copy_polynomial(&wire[0], &wire_fft[0], n, 4 * n + 4);
        wire_fft.coset_fft(key->large_domain);
        wire_fft.add_lagrange_base_coefficient(wire_fft[0]);
        wire_fft.add_lagrange_base_coefficient(wire_fft[1]);
        wire_fft.add_lagrange_base_coefficient(wire_fft[2]);
        wire_fft.add_lagrange_base_coefficient(wire_fft[3]);
    }
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point end = std::chrono::steady_clock::now();
    std::chrono::milliseconds diff = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    std::cout << "compute wire ffts: " << diff.count() << "ms" << std::endl;
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

template <size_t program_width> void ProverBase<program_width>::execute_fourth_round()
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

template <size_t program_width> void ProverBase<program_width>::execute_fifth_round()
{
    constexpr size_t temp_width = 3;
#ifdef DEBUG_TIMING
    std::chrono::steady_clock::time_point start = std::chrono::steady_clock::now();
#endif
    fr::field_t nu = fr::serialize_from_buffer(transcript.get_challenge("nu").begin());
    fr::field_t z_challenge = fr::serialize_from_buffer(transcript.get_challenge("z").begin());
    fr::field_t* r = key->linear_poly.get_coefficients();

    std::array<fr::field_t*, program_width> wires;
    for (size_t i = 0; i < program_width; ++i)
    {
        wires[i] = &witness->wires.at("w_" + std::to_string(i + 1))[0];
    }

    std::array<fr::field_t*, temp_width - 1> sigmas;
    for (size_t i = 0; i < temp_width - 1; ++i)
    {
        sigmas[i] = &key->permutation_selectors.at("sigma_" + std::to_string(i + 1))[0];
    }

    fr::field_t nu_powers[9];
    fr::__copy(nu, nu_powers[0]);
    for (size_t i = 1; i < 9; ++i) {
        fr::__mul(nu_powers[i - 1], nu_powers[0], nu_powers[i]);
    }

    polynomial& z = key->z;
    // Next step: compute the two Kate polynomial commitments, and associated opening proofs
    // We have two evaluation points: z and z.omega
    // We need to create random linear combinations of each individual polynomial and combine them

    polynomial& opening_poly = key->opening_poly;
    polynomial& shifted_opening_poly = key->shifted_opening_poly;

    std::array<fr::field_t, program_width> z_powers;
    z_powers[0] = z_challenge;
    for (size_t i = 1; i < program_width; ++i)
    {
        fr::__pow_small(z_challenge, n * i, z_powers[i]);
    }

    polynomial& quotient_large = key->quotient_large;
    
    ITERATE_OVER_DOMAIN_START(key->small_domain);

    fr::field_t T0;
    fr::field_t quotient_temp;
    fr::__mul_with_coarse_reduction(r[i], nu_powers[0], quotient_temp);

    for (size_t k = 1; k < program_width; ++k)
    {
        fr::__mul_with_coarse_reduction(quotient_large[i + (k * n)], z_powers[k], T0);
        fr::__add_with_coarse_reduction(quotient_temp, T0, quotient_temp);
    }

    for (size_t k = 0; k < temp_width - 1; ++k)
    {
        fr::__mul_with_coarse_reduction(sigmas[k][i], nu_powers[k + 5], T0);
        fr::__add_with_coarse_reduction(quotient_temp, T0, quotient_temp);
    }

    for (size_t k = 0; k < program_width; ++k)
    {
        fr::__mul_with_coarse_reduction(wires[k][i], nu_powers[k + 1], T0);
        fr::__add_with_coarse_reduction(quotient_temp, T0, quotient_temp);
    }

    fr::__mul(z[i], nu_powers[7], shifted_opening_poly[i]);

    fr::reduce_once(quotient_temp, quotient_temp);
    fr::__add(quotient_large[i], quotient_temp, opening_poly[i]);

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
        fr::__mul(nu_base, wires[0][i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_r_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, wires[1][i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_o_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, wires[2][i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, nu);
    }
    if (needs_w_4_shifted) {
        ITERATE_OVER_DOMAIN_START(key->small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, wires[3][i], T0);
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

    g1::element PI_Z_OMEGA = scalar_multiplication::pippenger_unsafe(
        shifted_opening_poly.get_coefficients(), key->reference_string.monomials, n);

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

template <size_t program_width> fr::field_t ProverBase<program_width>::compute_linearisation_coefficients()
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

template <size_t program_width> waffle::plonk_proof ProverBase<program_width>::construct_proof()
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

template <size_t program_width> void ProverBase<program_width>::reset()
{
    transcript::Manifest manifest = transcript.get_manifest();
    transcript = transcript::Transcript(manifest);
    for (size_t i = 0; i < widgets.size(); ++i) {
        widgets[i]->reset();
    }
}
} // namespace waffle