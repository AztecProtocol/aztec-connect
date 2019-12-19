#include "./prover.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/g2.hpp"
#include "../../../curves/bn254/scalar_multiplication.hpp"
#include "../../../io/io.hpp"
#include "../../../polynomials/polynomial_arithmetic.hpp"

#include "../../reference_string/reference_string.hpp"

#include "../challenge.hpp"
#include "../linearizer.hpp"
#include "../permutation.hpp"
#include "../widgets/base_widget.hpp"

using namespace barretenberg;

namespace waffle {

Prover::Prover(const size_t __n)
    : n(__n)
    , circuit_state(n)
    , reference_string(n)
{}

Prover::Prover(Prover&& other)
    : n(other.n)
    , w_l(std::move(other.w_l))
    , w_r(std::move(other.w_r))
    , w_o(std::move(other.w_o))
    , circuit_state(std::move(other.circuit_state))
    , sigma_1_mapping(std::move(other.sigma_1_mapping))
    , sigma_2_mapping(std::move(other.sigma_2_mapping))
    , sigma_3_mapping(std::move(other.sigma_3_mapping))
{
    for (size_t i = 0; i < other.widgets.size(); ++i) {
        widgets.emplace_back(std::move(other.widgets[i]));
    }
    reference_string = std::move(other.reference_string);
}

Prover& Prover::operator=(Prover&& other)
{
    n = other.n;
    w_l = std::move(other.w_l);
    w_r = std::move(other.w_r);
    w_o = std::move(other.w_o);
    circuit_state = waffle::CircuitFFTState(std::move(other.circuit_state));
    sigma_1_mapping = std::move(other.sigma_1_mapping);
    sigma_2_mapping = std::move(other.sigma_2_mapping);
    sigma_3_mapping = std::move(other.sigma_3_mapping);
    widgets.resize(0);
    for (size_t i = 0; i < other.widgets.size(); ++i) {
        widgets.emplace_back(std::move(other.widgets[i]));
    }
    reference_string = std::move(other.reference_string);
    return *this;
}

void Prover::compute_wire_commitments()
{
    scalar_multiplication::multiplication_state mul_state[3]{
        { reference_string.monomials, w_l.get_coefficients(), n, {} },
        { reference_string.monomials, w_r.get_coefficients(), n, {} },
        { reference_string.monomials, w_o.get_coefficients(), n, {} }
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    // TODO: make a method for normal-to-affine copies :/
    fq::__copy(mul_state[0].output.x, proof.W_L.x);
    fq::__copy(mul_state[1].output.x, proof.W_R.x);
    fq::__copy(mul_state[2].output.x, proof.W_O.x);
    fq::__copy(mul_state[0].output.y, proof.W_L.y);
    fq::__copy(mul_state[1].output.y, proof.W_R.y);
    fq::__copy(mul_state[2].output.y, proof.W_O.y);

    // compute beta, gamma
    challenges.gamma = compute_gamma(proof);
    challenges.beta = compute_beta(proof, challenges.gamma);
}

void Prover::compute_z_commitment()
{
    scalar_multiplication::multiplication_state mul_state{
        reference_string.monomials, z.get_coefficients(), n, g1::element()
    };

    scalar_multiplication::batched_scalar_multiplications(&mul_state, 1);

    // TODO: make a method for normal-to-affine copies :/
    fq::__copy(mul_state.output.x, proof.Z_1.x);
    fq::__copy(mul_state.output.y, proof.Z_1.y);

    // compute alpha
    // TODO: does this really belong here?
    challenges.alpha = compute_alpha(proof);
}

void Prover::compute_quotient_commitment()
{
    scalar_multiplication::multiplication_state mul_state[3]{
        { reference_string.monomials, &circuit_state.quotient_large.get_coefficients()[0], n, {} },
        { reference_string.monomials, &circuit_state.quotient_large.get_coefficients()[n], n, {} },
        { reference_string.monomials, &circuit_state.quotient_large.get_coefficients()[n + n], n, {} },
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    g1::jacobian_to_affine(mul_state[0].output, proof.T_LO);
    g1::jacobian_to_affine(mul_state[1].output, proof.T_MID);
    g1::jacobian_to_affine(mul_state[2].output, proof.T_HI);

    challenges.z = compute_evaluation_challenge(proof);
}

void Prover::compute_wire_coefficients()
{
    circuit_state.w_l_fft = polynomial(w_l, n);
    circuit_state.w_r_fft = polynomial(w_r, n);
    circuit_state.w_o_fft = polynomial(w_o, n);

    w_l.ifft(circuit_state.small_domain);
    w_r.ifft(circuit_state.small_domain);
    w_o.ifft(circuit_state.small_domain);
}

void Prover::compute_z_coefficients()
{
    polynomial accumulators[6]{ polynomial(n + 1, n + 1), polynomial(n + 1, n + 1), polynomial(n + 1, n + 1),
                                polynomial(n + 1, n + 1), polynomial(n + 1, n + 1), polynomial(n + 1, n + 1) };

#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < circuit_state.small_domain.num_threads; ++j) {
        fr::field_t work_root;
        fr::field_t thread_root;
        fr::__pow_small(circuit_state.small_domain.root, j * circuit_state.small_domain.thread_size, thread_root);
        fr::__mul(thread_root, challenges.beta, work_root);
        fr::field_t k1 = fr::multiplicative_generator;
        fr::field_t k2 = fr::alternate_multiplicative_generator;

        for (size_t i = (j * circuit_state.small_domain.thread_size);
             i < ((j + 1) * circuit_state.small_domain.thread_size);
             ++i) {
            fr::field_t T0;
            fr::field_t T1;
            fr::field_t T2;
            fr::__add(work_root, challenges.gamma, T0);
            fr::__add(T0, circuit_state.w_l_fft[i], accumulators[0][i + 1]);

            fr::__mul(work_root, k1, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, circuit_state.w_r_fft[i], accumulators[1][i + 1]);

            fr::__mul(work_root, k2, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, circuit_state.w_o_fft[i], accumulators[2][i + 1]);

            fr::__mul(sigma_1[i], challenges.beta, T0);
            fr::__add(T0, challenges.gamma, T0);
            fr::__add(T0, circuit_state.w_l_fft[i], accumulators[3][i + 1]);

            fr::__mul(sigma_2[i], challenges.beta, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, circuit_state.w_r_fft[i], accumulators[4][i + 1]);

            fr::__mul(sigma_3[i], challenges.beta, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, circuit_state.w_o_fft[i], accumulators[5][i + 1]);

            fr::__mul(work_root, circuit_state.small_domain.root, work_root);
        }
    }

    // step 2: compute the constituent components of Z1(X), Z2(X). This is a small bottleneck, as we have
    // 6 non-parallelizable processes
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t i = 0; i < 6; ++i) {
        fr::field_t* coeffs = accumulators[i].get_coefficients();
        coeffs[0] = fr::one;
        for (size_t j = 1; j < circuit_state.small_domain.size - 1; ++j) {
            fr::__mul(coeffs[j + 1], coeffs[j], coeffs[j + 1]);
        }
    }

    polynomial z2(n, n);
    z = polynomial(n, n);
    // step 3: concatenate together the accumulator elements into Z1(X), Z2(X)
    ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
    fr::__mul(accumulators[0][i], accumulators[1][i], z[i]);
    fr::__mul(z[i], accumulators[2][i], z[i]);

    fr::__mul(accumulators[3][i], accumulators[4][i], z2[i]);
    fr::__mul(z2[i], accumulators[5][i], z2[i]);
    ITERATE_OVER_DOMAIN_END;

    fr::batch_invert(z2.get_coefficients(), circuit_state.small_domain.size);

    ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
    fr::__mul(z[i], z2[i], z[i]);
    ITERATE_OVER_DOMAIN_END;

    z.ifft(circuit_state.small_domain);
}

void Prover::compute_permutation_grand_product_coefficients(polynomial& z_fft)
{
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

    // Step 1: convert sigma1(X), sigma2(X), sigma3(X) from point-evaluation form into coefficient form.
    // When we do this, scale the coefficients up by `beta` - we can get this for free by rolling it into the ifft
    // transform
    sigma_1.ifft_with_constant(circuit_state.small_domain, challenges.beta);
    sigma_2.ifft_with_constant(circuit_state.small_domain, challenges.beta);
    sigma_3.ifft_with_constant(circuit_state.small_domain, challenges.beta);

    // Step 2: convert sigma1(X), sigma2(X), sigma3(X), Z(X) back into point-evaluation form, but this time evaluated
    // at the 4n'th roots of unity.

    // Step 2a: Make copies when doing this we'll need the coefficient form polynomials later
    polynomial sigma1_fft = polynomial(sigma_1, circuit_state.large_domain.size);
    polynomial sigma2_fft = polynomial(sigma_2, circuit_state.large_domain.size);
    polynomial sigma3_fft = polynomial(sigma_3, circuit_state.large_domain.size);
    // z_fft = polynomial(z, circuit_state.large_domain.size + 4);

    // add `gamma` to sigma_1(X), sigma2(X), sigma3(X), so that we don't have to add it into each evaluation
    fr::__add(sigma1_fft[0], challenges.gamma, sigma1_fft[0]); // sigma1_fft = \beta.sigma_1(X) + \gamma
    fr::__add(sigma2_fft[0], challenges.gamma, sigma2_fft[0]); // sigma2_fft = \beta.sigma_2(X) + \gamma
    fr::__add(sigma3_fft[0], challenges.gamma, sigma3_fft[0]); // sigma3_fft = \beta.sigma_3(X) + \gamma

    // before performing our fft, add w_l(X), w_r(X), w_o(X) into sigma1_fft, sigma2_fft, sigma3_fft,
    // (cheaper to add n terms in coefficient form, than 4n terms over our extended evaluation domain)
    ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
    fr::__add(sigma1_fft[i], w_l[i], sigma1_fft[i]); // sigma1_fft = w_l(X) + \beta.sigma_1(X) + \gamma
    fr::__add(sigma2_fft[i], w_r[i], sigma2_fft[i]); // sigma2_fft = w_r(X) + \beta.sigma_2(X) + \gamma
    fr::__add(sigma3_fft[i], w_o[i], sigma3_fft[i]); // sigma3_fft = w_o(X) + \beta.sigma_3(X) + \gamma
    ITERATE_OVER_DOMAIN_END;

    // Step 2c: perform fft transforms to map into point-evaluation form.
    // (use coset fft so that we get evaluations over the roots of unity * multiplicative generator)
    // (if we evaluated at the raw roots of unity, dividing by the vanishing polynomial would require dividing by zero)
    sigma1_fft.coset_fft(circuit_state.large_domain);
    sigma2_fft.coset_fft(circuit_state.large_domain);
    sigma3_fft.coset_fft(circuit_state.large_domain);
    // Multiply Z(X) by \alpha^2 when performing fft transform - we get this for free if we roll \alpha^2 into the
    // multiplicative generator
    z_fft.coset_fft_with_constant(circuit_state.large_domain, challenges.alpha);

    // We actually want Z(X.w), not Z(X)! But that's easy to get. z_fft contains Z(X) evaluated at the 4n'th roots of
    // unity. So z_fft(i) = Z(w^{i/4}) i.e. z_fft(i + 4) = Z(w^{i/4}.w)
    // => if virtual term 'foo' contains a 4n fft of Z(X.w), then z_fft(i + 4) = foo(i)
    // So all we need to do, to get Z(X.w) is to offset indexes to z_fft by 4.
    // If `i >= 4n  4`, we need to wrap around to the start - so just append the 4 starting elements to the end of z_fft
    z_fft.add_lagrange_base_coefficient(z_fft[0]);
    z_fft.add_lagrange_base_coefficient(z_fft[1]);
    z_fft.add_lagrange_base_coefficient(z_fft[2]);
    z_fft.add_lagrange_base_coefficient(z_fft[3]);

    // Step 4: Set the quotient polynomial to be equal to
    // (w_l(X) + \beta.sigma1(X) + \gamma).(w_r(X) + \beta.sigma2(X) + \gamma).(w_o(X) + \beta.sigma3(X) +
    // \gamma).Z(X).alpha
    ITERATE_OVER_DOMAIN_START(circuit_state.large_domain);
    fr::__mul(sigma1_fft[i],
              sigma2_fft[i],
              sigma1_fft[i]); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma)
    fr::__mul(sigma1_fft[i], sigma3_fft[i], sigma1_fft[i]); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) +
                                                            // B.sigma_2(X) + \gamma).(w_o(X) + B.sigma_3(X) + \gamma)
    fr::__mul(sigma1_fft[i],
              z_fft[i + 4],
              sigma1_fft[i]); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma).(w_o(X)
                              // + B.sigma_3(X) + \gamma).Z(X.omega)
    fr::__neg(sigma1_fft[i],
              circuit_state.quotient_large[i]); // Q(X) -= (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) +
                                                // \gamma).(w_o(X) + B.sigma_3(X) + \gamma).Z(X.omega)
    ITERATE_OVER_DOMAIN_END;
}

void Prover::compute_identity_grand_product_coefficients(polynomial& z_fft)
{
    fr::field_t right_shift = fr::multiplicative_generator;
    fr::field_t output_shift = fr::alternate_multiplicative_generator;

#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < circuit_state.large_domain.num_threads; ++j) {
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t beta_id;

        fr::field_t work_root;
        fr::__pow_small(circuit_state.large_domain.root, j * circuit_state.large_domain.thread_size, work_root);
        fr::__mul(work_root, fr::multiplicative_generator, work_root);
        for (size_t i = (j * circuit_state.large_domain.thread_size);
             i < ((j + 1) * circuit_state.large_domain.thread_size);
             ++i) {
            fr::__mul(work_root, challenges.beta, beta_id);
            fr::__add(beta_id, challenges.gamma, T0);
            fr::__add(T0, circuit_state.w_l_fft[i], T0);

            fr::__mul(beta_id, right_shift, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, circuit_state.w_r_fft[i], T1);

            fr::__mul(beta_id, output_shift, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, circuit_state.w_o_fft[i], T2);

            // combine three identity product terms, with z_1_poly evaluation
            fr::__mul(T0, T1, T0);
            fr::__mul(T0, T2, T0);
            fr::__mul(T0, z_fft[i], T0);
            fr::__add(circuit_state.quotient_large[i], T0, circuit_state.quotient_large[i]);
            fr::__mul(work_root, circuit_state.large_domain.root, work_root);
        }
    }

    // // We can shrink the evaluation domain by 2 for the wire polynomials and Z(X), to save on memory
    // circuit_state.w_l_fft.shrink_evaluation_domain(2);
    // circuit_state.w_r_fft.shrink_evaluation_domain(2);
    // circuit_state.w_o_fft.shrink_evaluation_domain(2);
    // z_fft.shrink_evaluation_domain(2);

    // size = 2n, max size = 2n + 4 (appending 4 coefficients after poly arithmetic call)
    polynomial l_1(n + n, n + n + 4);
    polynomial_arithmetic::compute_lagrange_polynomial_fft(
        l_1.get_coefficients(), circuit_state.small_domain, circuit_state.mid_domain);
    l_1.add_lagrange_base_coefficient(l_1[0]);
    l_1.add_lagrange_base_coefficient(l_1.at(1));
    l_1.add_lagrange_base_coefficient(l_1.at(2));
    l_1.add_lagrange_base_coefficient(l_1.at(3));

    // accumulate degree-2n terms into gate_poly_mid
    fr::field_t alpha_squared = fr::sqr(challenges.alpha);

    ITERATE_OVER_DOMAIN_START(circuit_state.mid_domain);
    fr::field_t T4;
    fr::field_t T6;

    // Step 1: Compute (Z(X.w) - 1).(\alpha^3).L{n-1}(X)
    // The \alpha^3 term is so that we can subsume this polynomial into the quotient polynomial,
    // whilst ensuring the term is linearly independent form the other terms in the quotient polynomial

    // We want to verify that Z(X) equals `1` when evaluated at `w_n`, the 'last' element of our multiplicative subgroup
    // H. But PLONK's 'vanishing polynomial', Z*_H(X), isn't the true vanishing polynomial of subgroup H. We need to cut
    // a root of unity out of Z*_H(X), specifically `w_n`, for our grand product argument. When evaluating Z(X) has been
    // constructed correctly, we verify that Z(X.w).(identity permutation product) = Z(X).(sigma permutation product),
    // for all X \in H. But this relationship breaks down for X = w_n, because Z(X.w) will evaluate to the *first*
    // element of our grand product argument. The last element of Z(X) has a dependency on the first element, so the
    // first element cannot have a dependency on the last element.

    // TODO: With the reduction from 2 Z polynomials to a single Z(X), the above no longer applies
    // TODO: Fix this to remove the (Z(X.w) - 1).L_{n-1}(X) check

    // To summarise, we can't verify claims about Z(X) when evaluated at `w_n`.
    // But we can verify claims about Z(X.w) when evaluated at `w_{n-1}`, which is the same thing

    // To summarise the summary: If Z(w_n) = 1, then (Z(X.w) - 1).L_{n-1}(X) will be divisible by Z_H*(X)
    // => add linearly independent term (Z(X.w) - 1).(\alpha^3).L{n-1}(X) into the quotient polynomial to check this

    // z_fft already contains evaluations of Z(X).(\alpha^2)
    // at the (2n)'th roots of unity
    // => to get Z(X.w) instead of Z(X), index element (i+2) instead of i
    fr::__sub(z_fft[2 * i + 4], challenges.alpha, T6); // T6 = (Z(X.w) - 1).(\alpha^2)
    fr::__mul(T6, challenges.alpha, T6);               // T6 = (Z(X.w) - 1).(\alpha^3)
    fr::__mul(T6, l_1[i + 4], T6);                     // T6 = (Z(X.w) - 1).(\alpha^3).L{n-1}(X)

    // Step 2: Compute (Z(X) - 1).(\alpha^4).L1(X)
    // We need to verify that Z(X) equals `1` when evaluated at the first element of our subgroup H
    // i.e. Z(X) starts at 1 and ends at 1
    // The `alpha^4` term is so that we can add this as a linearly independent term in our quotient polynomial

    fr::__sub(z_fft[2 * i], challenges.alpha, T4); // T4 = (Z(X) - 1).(\alpha^2)
    fr::__mul(T4, alpha_squared, T4);              // T4 = (Z(X) - 1).(\alpha^4)
    fr::__mul(T4, l_1[i], T4);                     // T4 = (Z(X) - 1).(\alpha^2).L1(X)

    // Add T4 and T6 into the degree 2n component of the quotient polynomial
    fr::__add(T4, T6, circuit_state.quotient_mid[i]);
    ITERATE_OVER_DOMAIN_END;
}

void Prover::compute_quotient_polynomial()
{
    circuit_state.quotient_large.resize(4 * n);
    circuit_state.quotient_mid.resize(2 * n);

    compute_wire_coefficients();

    compute_wire_commitments();

    compute_z_coefficients();

    compute_z_commitment();

    circuit_state.w_l_fft = polynomial(w_l, 4 * n + 4);
    circuit_state.w_r_fft = polynomial(w_r, 4 * n + 4);
    circuit_state.w_o_fft = polynomial(w_o, 4 * n + 4);

    circuit_state.w_l_fft.coset_fft(circuit_state.large_domain);
    circuit_state.w_r_fft.coset_fft(circuit_state.large_domain);
    circuit_state.w_o_fft.coset_fft(circuit_state.large_domain);

    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[0]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[1]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[2]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[3]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[0]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[1]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[2]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[3]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[0]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[1]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[2]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[3]);
    polynomial z_fft(z, 4 * n + 4);

    compute_permutation_grand_product_coefficients(z_fft);

    compute_identity_grand_product_coefficients(z_fft);

    fr::field_t alpha_base = fr::sqr(fr::sqr(challenges.alpha));
    fr::mul(challenges.alpha, alpha_base);
    for (size_t i = 0; i < widgets.size(); ++i) {
        alpha_base = widgets[i]->compute_quotient_contribution(alpha_base, challenges.alpha, circuit_state);
    }

    polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(
        circuit_state.quotient_mid.get_coefficients(), circuit_state.small_domain, circuit_state.mid_domain);
    polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(
        circuit_state.quotient_large.get_coefficients(), circuit_state.small_domain, circuit_state.large_domain);

    circuit_state.quotient_mid.coset_ifft(circuit_state.mid_domain);
    circuit_state.quotient_large.coset_ifft(circuit_state.large_domain);

    ITERATE_OVER_DOMAIN_START(circuit_state.mid_domain);
    fr::__add(circuit_state.quotient_large[i], circuit_state.quotient_mid[i], circuit_state.quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;
}

fr::field_t Prover::compute_linearisation_coefficients()
{
    r.resize_unsafe(n);
    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t beta_inv;
    fr::__invert(challenges.beta, beta_inv);
    fr::field_t shifted_z;
    fr::__mul(challenges.z, circuit_state.small_domain.root, shifted_z);

    // evaluate the prover and instance polynomials.
    // (we don't need to evaluate the quotient polynomial, that can be derived by the verifier)
    proof.w_l_eval = w_l.evaluate(challenges.z, n);
    proof.w_r_eval = w_r.evaluate(challenges.z, n);
    proof.w_o_eval = w_o.evaluate(challenges.z, n);

    bool needs_w_l_shifted = false;
    bool needs_w_r_shifted = false;
    bool needs_w_o_shifted = false;
    for (size_t i = 0; i < widgets.size(); ++i) {
        needs_w_l_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
        needs_w_r_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
        needs_w_o_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
    }
    if (needs_w_l_shifted) {
        proof.w_l_shifted_eval = w_l.evaluate(shifted_z, n);
    }
    if (needs_w_r_shifted) {
        proof.w_r_shifted_eval = w_r.evaluate(shifted_z, n);
    }
    if (needs_w_o_shifted) {
        proof.w_o_shifted_eval = w_o.evaluate(shifted_z, n);
    }

    proof.sigma_1_eval = sigma_1.evaluate(challenges.z, n);
    proof.sigma_2_eval = sigma_2.evaluate(challenges.z, n);
    proof.z_1_shifted_eval = z.evaluate(shifted_z, n);

    for (size_t i = 0; i < widgets.size(); ++i) {
        widgets[i]->compute_proof_elements(proof, challenges.z);
    }
    fr::field_t t_eval = circuit_state.quotient_large.evaluate(challenges.z, 3 * n);
    // we scaled the sigma polynomials up by beta, so scale back down
    fr::__mul(proof.sigma_1_eval, beta_inv, proof.sigma_1_eval);
    fr::__mul(proof.sigma_2_eval, beta_inv, proof.sigma_2_eval);

    polynomial_arithmetic::lagrange_evaluations lagrange_evals =
        polynomial_arithmetic::get_lagrange_evaluations(challenges.z, circuit_state.small_domain);
    plonk_linear_terms linear_terms = compute_linear_terms(proof, challenges, lagrange_evals.l_1, n);

    ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::__mul(z[i], linear_terms.z_1, T0);
    fr::__mul(sigma_3[i], linear_terms.sigma_3, T1);
    // we scaled sigma_3[i] by beta, need to correct for that...
    fr::__mul(T1, beta_inv, T1);
    fr::__add(T0, T1, r[i]);
    ITERATE_OVER_DOMAIN_END;

    fr::field_t alpha_base = fr::sqr(fr::sqr(challenges.alpha));
    for (size_t i = 0; i < widgets.size(); ++i) {
        alpha_base =
            widgets[i]->compute_linear_contribution(alpha_base, challenges.alpha, proof, circuit_state.small_domain, r);
    }

    proof.linear_eval = r.evaluate(challenges.z, n);
    return t_eval;
}

void Prover::compute_opening_elements()
{

    fr::field_t t_eval = compute_linearisation_coefficients();

    challenges.nu = compute_linearisation_challenge(proof, t_eval);

    fr::field_t nu_powers[8];
    fr::__copy(challenges.nu, nu_powers[0]);
    for (size_t i = 1; i < 8; ++i) {
        fr::__mul(nu_powers[i - 1], nu_powers[0], nu_powers[i]);
    }

    fr::field_t beta_inv;
    fr::__invert(challenges.beta, beta_inv);

    // Next step: compute the two Kate polynomial commitments, and associated opening proofs
    // We have two evaluation points: z and z.omega
    // We need to create random linear combinations of each individual polynomial and combine them
    polynomial opening_poly(n, n);
    polynomial shifted_opening_poly(n, n);
    fr::field_t z_pow_n;
    fr::field_t z_pow_2_n;
    fr::__pow_small(challenges.z, n, z_pow_n);
    fr::__pow_small(challenges.z, 2 * n, z_pow_2_n);

    ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T8;
    fr::field_t T9;
    fr::__mul(circuit_state.quotient_large[i + n], z_pow_n, T8);
    fr::__mul(circuit_state.quotient_large[i + n + n], z_pow_2_n, T9);
    fr::__mul(r[i], nu_powers[0], T0);
    fr::__mul(w_l[i], nu_powers[1], T1);
    fr::__mul(w_r[i], nu_powers[2], T2);
    fr::__mul(w_o[i], nu_powers[3], T3);
    fr::__mul(sigma_1[i], nu_powers[4], T4);
    fr::__mul(sigma_2[i], nu_powers[5], T5);
    fr::__mul(z[i], nu_powers[6], shifted_opening_poly[i]);
    fr::__add(T8, T9, T8);
    fr::__add(T4, T5, T4);
    fr::__add(T3, T2, T3);
    fr::__add(T1, T0, T1);
    // we added a \beta multiplier to sigma_1(X), sigma_2(X), sigma_3(X), s_id(X) - need to undo that here
    fr::__mul(T4, beta_inv, T4);
    fr::__add(T3, T1, T3);
    fr::__add(T4, T3, T4);
    fr::__add(T4, T8, T4);
    fr::__add(circuit_state.quotient_large[i], T4, opening_poly[i]);
    ITERATE_OVER_DOMAIN_END;

    fr::field_t nu_base = nu_powers[7];

    // TODO compute 'needs_blah_shifted' in constructor
    bool needs_w_l_shifted = false;
    bool needs_w_r_shifted = false;
    bool needs_w_o_shifted = false;
    for (size_t i = 0; i < widgets.size(); ++i) {
        needs_w_l_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
        needs_w_r_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
        needs_w_o_shifted |=
            widgets[i]->version.has_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
    }
    if (needs_w_l_shifted) {
        ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_l[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, challenges.nu);
    }
    if (needs_w_r_shifted) {
        ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_r[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, challenges.nu);
    }
    if (needs_w_o_shifted) {
        ITERATE_OVER_DOMAIN_START(circuit_state.small_domain);
        fr::field_t T0;
        fr::__mul(nu_base, w_o[i], T0);
        fr::__add(shifted_opening_poly[i], T0, shifted_opening_poly[i]);
        ITERATE_OVER_DOMAIN_END;
        nu_base = fr::mul(nu_base, challenges.nu);
    }

    for (size_t i = 0; i < widgets.size(); ++i) {
        nu_base = widgets[i]->compute_opening_poly_contribution(
            &opening_poly[0], circuit_state.small_domain, nu_base, nu_powers[0]);
    }

    fr::field_t shifted_z;
    fr::__mul(challenges.z, circuit_state.small_domain.root, shifted_z);

    opening_poly.compute_kate_opening_coefficients(challenges.z);

    shifted_opening_poly.compute_kate_opening_coefficients(shifted_z);

    // Compute PI_Z(X) and PI_Z_OMEGA(X)
    scalar_multiplication::multiplication_state mul_state[2]{
        { reference_string.monomials, opening_poly.get_coefficients(), n, {} },
        { reference_string.monomials, shifted_opening_poly.get_coefficients(), n, {} },
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);

    g1::jacobian_to_affine(mul_state[0].output, proof.PI_Z);
    g1::jacobian_to_affine(mul_state[1].output, proof.PI_Z_OMEGA);
}

plonk_proof Prover::construct_proof()
{
    compute_permutation_lagrange_base_single(sigma_1, sigma_1_mapping, circuit_state.small_domain);
    compute_permutation_lagrange_base_single(sigma_2, sigma_2_mapping, circuit_state.small_domain);
    compute_permutation_lagrange_base_single(sigma_3, sigma_3_mapping, circuit_state.small_domain);
    compute_quotient_polynomial();
    compute_quotient_commitment();
    compute_opening_elements();
    return proof;
}

void Prover::reset()
{
    w_l.fft(circuit_state.small_domain);
    w_r.fft(circuit_state.small_domain);
    w_o.fft(circuit_state.small_domain);
    sigma_1 = polynomial(0, 0);
    sigma_2 = polynomial(0, 0);
    sigma_3 = polynomial(0, 0);
    circuit_state.w_l_fft = polynomial(0, 0);
    circuit_state.w_r_fft = polynomial(0, 0);
    circuit_state.w_o_fft = polynomial(0, 0);
    circuit_state.quotient_mid = polynomial(0, 0);
    circuit_state.quotient_large = polynomial(0, 0);
    r = polynomial(0, 0);
    for (size_t i = 0; i < widgets.size(); ++i) {
        widgets[i]->reset(circuit_state.small_domain);
    }
}
} // namespace waffle