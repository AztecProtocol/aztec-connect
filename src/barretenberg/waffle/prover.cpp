#include "./prover.hpp"

#include "../groups/g1.hpp"
#include "../groups/scalar_multiplication.hpp"
#include "../polynomials/polynomial_arithmetic.hpp"
#include "../fields/fr.hpp"
#include "./linearizer.hpp"
#include "./challenge.hpp"


#include "../polynomials/polynomials.hpp"

using namespace barretenberg;

// TODO: PUT SOMEWHERE
// Some hacky macros that allow us to parallelize iterating over a polynomial's point-evaluations
#ifndef NO_MULTITHREADING
#define ITERATE_OVER_DOMAIN_START(domain)                                                  \
    _Pragma("omp parallel for")                                                            \
    for (size_t j = 0; j < domain.num_threads; ++j)                                        \
    {                                                                                      \
        for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); ++i) \
        {

#define ITERATE_OVER_DOMAIN_END \
    }                           \
    }
#else
#define ITERATE_OVER_DOMAIN_START(domain)    \
    for (size_t i = 0; i < domain.size; ++i) \
    {

#define ITERATE_OVER_DOMAIN_END \
    }
#endif


namespace waffle
{

plonk_circuit_state::plonk_circuit_state(const size_t __n) :
n(__n),
small_domain(n),
mid_domain(2 * n),
large_domain(4 * n)
{
    small_domain.compute_lookup_table();
    mid_domain.compute_lookup_table();
    large_domain.compute_lookup_table();
}


void plonk_circuit_state::compute_wire_commitments()
{
    scalar_multiplication::multiplication_state mul_state[3]{
        { reference_string.monomials, w_l.get_coefficients(), n, {} },
        { reference_string.monomials, w_r.get_coefficients(), n, {} },
        { reference_string.monomials, w_o.get_coefficients(), n, {} }
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    // TODO: make a method for normal-to-affine copies :/
    fq::copy(mul_state[0].output.x, proof.W_L.x);
    fq::copy(mul_state[1].output.x, proof.W_R.x);
    fq::copy(mul_state[2].output.x, proof.W_O.x);
    fq::copy(mul_state[0].output.y, proof.W_L.y);
    fq::copy(mul_state[1].output.y, proof.W_R.y);
    fq::copy(mul_state[2].output.y, proof.W_O.y);

    // compute beta, gamma
    challenges.gamma = compute_gamma(proof);
    challenges.beta = compute_beta(proof, challenges.gamma);
}

void plonk_circuit_state::compute_z_commitment()
{
    scalar_multiplication::multiplication_state mul_state{
        reference_string.monomials,
        z.get_coefficients(),
        n,
        g1::element()};

    scalar_multiplication::batched_scalar_multiplications(&mul_state, 1);

    // TODO: make a method for normal-to-affine copies :/
    fq::copy(mul_state.output.x, proof.Z_1.x);
    fq::copy(mul_state.output.y, proof.Z_1.y);

    // compute alpha
    // TODO: does this really belong here?
    challenges.alpha = compute_alpha(proof);
}

void plonk_circuit_state::compute_quotient_commitment()
{
    scalar_multiplication::multiplication_state mul_state[3]{
        { reference_string.monomials, &quotient_large.get_coefficients()[0],   n, {} },
        { reference_string.monomials, &quotient_large.get_coefficients()[n],   n, {} },
        { reference_string.monomials, &quotient_large.get_coefficients()[n+n], n, {} },
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 3);

    g1::jacobian_to_affine(mul_state[0].output, proof.T_LO);
    g1::jacobian_to_affine(mul_state[1].output, proof.T_MID);
    g1::jacobian_to_affine(mul_state[2].output, proof.T_HI);

    challenges.z = compute_evaluation_challenge(proof);
}

void plonk_circuit_state::compute_wire_coefficients()
{
    p_rax = polynomial(w_l, n);
    p_rbx = polynomial(w_r, n);
    p_rcx = polynomial(w_o, n);

    w_l.ifft(small_domain);
    w_r.ifft(small_domain);
    w_o.ifft(small_domain);
}

void plonk_circuit_state::compute_z_coefficients()
{
    polynomial accumulators[6]{
        polynomial(n + 1, n + 1),
        polynomial(n + 1, n + 1),
        polynomial(n + 1, n + 1),
        polynomial(n + 1, n + 1),
        polynomial(n + 1, n + 1),
        polynomial(n + 1, n + 1)};

#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < small_domain.num_threads; ++j)
    {
        fr::field_t work_root;
        fr::field_t thread_root;
        fr::__pow_small(small_domain.root, j * small_domain.thread_size, thread_root);
        fr::__mul(thread_root, challenges.beta, work_root);
        fr::field_t k1 = fr::multiplicative_generator();
        fr::field_t k2 = fr::alternate_multiplicative_generator();

        for (size_t i = (j * small_domain.thread_size); i < ((j + 1) * small_domain.thread_size); ++i)
        {
            fr::field_t T0;
            fr::field_t T1;
            fr::field_t T2;
            fr::__add(work_root, challenges.gamma, T0);
            fr::__add(T0, p_rax.at(i), accumulators[0].at(i+1));

            fr::__mul(work_root, k1, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, p_rbx.at(i), accumulators[1].at(i+1));

            fr::__mul(work_root, k2, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, p_rcx.at(i), accumulators[2].at(i+1));

            fr::__mul(sigma_1.at(i), challenges.beta, T0);
            fr::__add(T0, challenges.gamma, T0);
            fr::__add(T0, p_rax.at(i), accumulators[3].at(i+1));

            fr::__mul(sigma_2.at(i), challenges.beta, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, p_rbx.at(i), accumulators[4].at(i+1));

            fr::__mul(sigma_3.at(i), challenges.beta, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, p_rcx.at(i), accumulators[5].at(i+1));

            fr::__mul(work_root, small_domain.root, work_root);
        }
    }

    // step 2: compute the constituent components of Z1(X), Z2(X). This is a small bottleneck, as we have
    // 6 non-parallelizable processes
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t i = 0; i < 6; ++i)
    {
        fr::field_t *coeffs = accumulators[i].get_coefficients();
        fr::one(coeffs[0]);
        for (size_t j = 1; j < small_domain.size - 1; ++j)
        {
            fr::__mul(coeffs[j + 1], coeffs[j], coeffs[j + 1]);
        }
    }

    polynomial z2(n, n);
    z = polynomial(n, n);
    // step 3: concatenate together the accumulator elements into Z1(X), Z2(X)
    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::__mul(accumulators[0].at(i), accumulators[1].at(i), z.at(i));
        fr::__mul(z.at(i), accumulators[2].at(i), z.at(i));

        fr::__mul(accumulators[3].at(i), accumulators[4].at(i), z2.at(i));
        fr::__mul(z2.at(i), accumulators[5].at(i), z2.at(i));
    ITERATE_OVER_DOMAIN_END;

    fr::batch_invert(z2.get_coefficients(), small_domain.size);

    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::__mul(z.at(i), z2.at(i), z.at(i));
    ITERATE_OVER_DOMAIN_END;

    z.ifft(small_domain);
}

void plonk_circuit_state::compute_permutation_grand_product_coefficients(polynomial& z_fft)
{
    // Our permutation check boils down to two 'grand product' arguments,
    // that we represent with a single polynomial Z(X).
    // We want to test that Z(X) has been constructed correctly.
    // When evaluated at elements of w \in H, the numerator of Z(w) will equal the
    // identity permutation grand product, and the denominator will equal the copy permutation grand product.

    // The identity that we need to evaluate is: Z(X.w).(permutation grand product) = Z(X).(identity grand product)
    // i.e. The next element of Z is equal to the current element of Z, multiplied by (identity grand product) / (permutation grand product)

    // This method computes `Z(X).(identity grand product).{alpha}`.
    // The random `alpha` is there to ensure our grand product polynomial identity is linearly independent from the
    // other polynomial identities that we are going to roll into the quotient polynomial T(X).

    // Specifically, we want to compute:
    // (w_l(X) + \beta.sigma1(X) + \gamma).(w_r(X) + \beta.sigma2(X) + \gamma).(w_o(X) + \beta.sigma3(X) + \gamma).Z(X).alpha
    // Once we divide by the vanishing polynomial, this will be a degree 3n polynomial.

    // Step 1: convert sigma1(X), sigma2(X), sigma3(X) from point-evaluation form into coefficient form.
    // When we do this, scale the coefficients up by `beta` - we can get this for free by rolling it into the ifft transform
    sigma_1.ifft_with_constant(small_domain, challenges.beta);
    sigma_2.ifft_with_constant(small_domain, challenges.beta);
    sigma_3.ifft_with_constant(small_domain, challenges.beta);

    // Step 2: convert sigma1(X), sigma2(X), sigma3(X), Z(X) back into point-evaluation form, but this time evaluated
    // at the 4n'th roots of unity.
    
    // Step 2a: Make copies when doing this we'll need the coefficient form polynomials later
    polynomial sigma1_fft = polynomial(sigma_1, large_domain.size);
    polynomial sigma2_fft = polynomial(sigma_2, large_domain.size);
    polynomial sigma3_fft = polynomial(sigma_3, large_domain.size);
    // z_fft = polynomial(z, large_domain.size + 4);

    // add `gamma` to sigma_1(X), sigma2(X), sigma3(X), so that we don't have to add it into each evaluation
    fr::__add(sigma1_fft.at(0), challenges.gamma, sigma1_fft.at(0)); // sigma1_fft = \beta.sigma_1(X) + \gamma
    fr::__add(sigma2_fft.at(0), challenges.gamma, sigma2_fft.at(0)); // sigma2_fft = \beta.sigma_2(X) + \gamma
    fr::__add(sigma3_fft.at(0), challenges.gamma, sigma3_fft.at(0)); // sigma3_fft = \beta.sigma_3(X) + \gamma

    // before performing our fft, add w_l(X), w_r(X), w_o(X) into sigma1_fft, sigma2_fft, sigma3_fft,
    // (cheaper to add n terms in coefficient form, than 4n terms over our extended evaluation domain)
    ITERATE_OVER_DOMAIN_START(small_domain);
    fr::__add(sigma1_fft.at(i), w_l.at(i), sigma1_fft.at(i)); // sigma1_fft = w_l(X) + \beta.sigma_1(X) + \gamma
    fr::__add(sigma2_fft.at(i), w_r.at(i), sigma2_fft.at(i)); // sigma2_fft = w_r(X) + \beta.sigma_2(X) + \gamma
    fr::__add(sigma3_fft.at(i), w_o.at(i), sigma3_fft.at(i)); // sigma3_fft = w_o(X) + \beta.sigma_3(X) + \gamma
    ITERATE_OVER_DOMAIN_END;

    // Step 2c: perform fft transforms to map into point-evaluation form.
    // (use coset fft so that we get evaluations over the roots of unity * multiplicative generator)
    // (if we evaluated at the raw roots of unity, dividing by the vanishing polynomial would require dividing by zero)
    fr::field_t alpha_squared = fr::sqr(challenges.alpha);
    sigma1_fft.coset_fft(large_domain);
    sigma2_fft.coset_fft(large_domain);
    sigma3_fft.coset_fft(large_domain);
    // Multiply Z(X) by \alpha^2 when performing fft transform - we get this for free if we roll \alpha^2 into the multiplicative generator
    z_fft.coset_fft_with_constant(large_domain, alpha_squared);

    // We actually want Z(X.w), not Z(X)! But that's easy to get. z_fft contains Z(X) evaluated at the 4n'th roots of unity.
    // So z_fft(i) = Z(w^{i/4})
    // i.e. z_fft(i + 4) = Z(w^{i/4}.w)
    // => if virtual term 'foo' contains a 4n fft of Z(X.w), then z_fft(i + 4) = foo(i)
    // So all we need to do, to get Z(X.w) is to offset indexes to z_fft by 4.
    // If `i >= 4n  4`, we need to wrap around to the start - so just append the 4 starting elements to the end of z_fft
    z_fft.add_lagrange_base_coefficient(z_fft.at(0));
    z_fft.add_lagrange_base_coefficient(z_fft.at(1));
    z_fft.add_lagrange_base_coefficient(z_fft.at(2));
    z_fft.add_lagrange_base_coefficient(z_fft.at(3));

    // Step 4: Set the quotient polynomial to be equal to
    // (w_l(X) + \beta.sigma1(X) + \gamma).(w_r(X) + \beta.sigma2(X) + \gamma).(w_o(X) + \beta.sigma3(X) + \gamma).Z(X).alpha
    ITERATE_OVER_DOMAIN_START(large_domain);
        fr::__mul(sigma1_fft.at(i), sigma2_fft.at(i), sigma1_fft.at(i)); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma)
        fr::__mul(sigma1_fft.at(i), sigma3_fft.at(i), sigma1_fft.at(i)); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma).(w_o(X) + B.sigma_3(X) + \gamma)
        fr::__mul(sigma1_fft.at(i), z_fft.at(i + 4), sigma1_fft.at(i)); // sigma1_fft = (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma).(w_o(X) + B.sigma_3(X) + \gamma).Z(X.omega)
        fr::neg(sigma1_fft.at(i), quotient_large.at(i)); // Q(X) -= (w_l(X) + B.sigma_1(X) + \gamma).(w_r(X) + B.sigma_2(X) + \gamma).(w_o(X) + B.sigma_3(X) + \gamma).Z(X.omega)
    ITERATE_OVER_DOMAIN_END;
}

void plonk_circuit_state::compute_identity_grand_product_coefficients(polynomial &z_fft)
{
    fr::field_t right_shift = fr::multiplicative_generator();
    fr::field_t output_shift = fr::alternate_multiplicative_generator();

    // Step 1: copy w_l(X), w_r(X), w_o(X) into p_rax, p_rbx, p_rcx and perform a size 4n fft
    p_rax = polynomial(w_l, 4 * n);
    p_rbx = polynomial(w_r, 4 * n);
    p_rcx = polynomial(w_o, 4 * n);
    p_rax.coset_fft(large_domain);
    p_rbx.coset_fft(large_domain);
    p_rcx.coset_fft(large_domain);

#ifndef NO_MULTITHREADING
    #pragma omp parallel for
#endif
    for (size_t j = 0; j < large_domain.num_threads; ++j)
    {
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t beta_id;

        fr::field_t work_root;
        fr::__pow_small(large_domain.root, j * large_domain.thread_size, work_root);
        fr::__mul(work_root, fr::multiplicative_generator(), work_root);
        for (size_t i = (j * large_domain.thread_size); i < ((j + 1) * large_domain.thread_size); ++i)
        {
            fr::__mul(work_root, challenges.beta, beta_id);
            fr::__add(beta_id, challenges.gamma, T0);
            fr::__add(T0, p_rax.at(i), T0);

            fr::__mul(beta_id, right_shift, T1);
            fr::__add(T1, challenges.gamma, T1);
            fr::__add(T1, p_rbx.at(i), T1);

            fr::__mul(beta_id, output_shift, T2);
            fr::__add(T2, challenges.gamma, T2);
            fr::__add(T2, p_rcx.at(i), T2);

            // combine three identity product terms, with z_1_poly evaluation
            fr::__mul(T0, T1, T0);
            fr::__mul(T0, T2, T0);
            fr::__mul(T0, z_fft.at(i), T0);
            fr::__add(quotient_large.at(i), T0, quotient_large.at(i));
            fr::__mul(work_root, large_domain.root, work_root);
        }
    }

    // We can shrink the evaluation domain by 2 for the wire polynomials and Z(X), to save on memory
    p_rax.shrink_evaluation_domain(2);
    p_rbx.shrink_evaluation_domain(2);
    p_rcx.shrink_evaluation_domain(2);
    z_fft.shrink_evaluation_domain(2);

    // size = 2n, max size = 2n + 4 (appending 4 coefficients after poly arithmetic call)
    polynomial l_1(n + n, n + n + 4);
    polynomial_arithmetic::compute_lagrange_polynomial_fft(l_1.get_coefficients(), small_domain, mid_domain);
    l_1.add_lagrange_base_coefficient(l_1.at(0));
    l_1.add_lagrange_base_coefficient(l_1.at(1));
    l_1.add_lagrange_base_coefficient(l_1.at(2));
    l_1.add_lagrange_base_coefficient(l_1.at(3));

    // accumulate degree-2n terms into gate_poly_mid
    fr::field_t alpha_squared = fr::sqr(challenges.alpha);

    ITERATE_OVER_DOMAIN_START(mid_domain);
        fr::field_t T4;
        fr::field_t T6;

        // Step 1: Compute (Z(X.w) - 1).(\alpha^3).L{n-1}(X)
        // The \alpha^3 term is so that we can subsume this polynomial into the quotient polynomial,
        // whilst ensuring the term is linearly independent form the other terms in the quotient polynomial

        // We want to verify that Z(X) equals `1` when evaluated at `w_n`, the 'last' element of our multiplicative subgroup H.
        // But PLONK's 'vanishing polynomial', Z*_H(X), isn't the true vanishing polynomial of subgroup H.
        // We need to cut a root of unity out of Z*_H(X), specifically `w_n`, for our grand product argument.
        // When evaluating Z(X) has been constructed correctly, we verify that Z(X.w).(identity permutation product) = Z(X).(sigma permutation product),
        // for all X \in H. But this relationship breaks down for X = w_n, because Z(X.w) will evaluate to the *first* element of our grand product argument.
        // The last element of Z(X) has a dependency on the first element, so the first element cannot have a dependency on the last element.

        // To summarise, we can't verify claims about Z(X) when evaluated at `w_n`.
        // But we can verify claims about Z(X.w) when evaluated at `w_{n-1}`, which is the same thing
    
        // To summarise the summary: If Z(w_n) = 1, then (Z(X.w) - 1).L_{n-1}(X) will be divisible by Z_H*(X)
        // => add linearly independent term (Z(X.w) - 1).(\alpha^3).L{n-1}(X) into the quotient polynomial to check this

        // z_fft already contains evaluations of Z(X).(\alpha^2)
        // at the (2n)'th roots of unity
        // => to get Z(X.w) instead of Z(X), index element (i+2) instead of i
        fr::__sub(z_fft.at(i + 2), alpha_squared, T6); // T6 = (Z(X.w) - 1).(\alpha^2)
        fr::__mul(T6, challenges.alpha, T6); // T6 = (Z(X.w) - 1).(\alpha^3)
        fr::__mul(T6, l_1.at(i + 4), T6); // T6 = (Z(X.w) - 1).(\alpha^3).L{n-1}(X)

        // Step 2: Compute (Z(X) - 1).(\alpha^4).L1(X)
        // We need to verify that Z(X) equals `1` when evaluated at the first element of our subgroup H
        // i.e. Z(X) starts at 1 and ends at 1
        // The `alpha^4` term is so that we can add this as a linearly independent term in our quotient polynomial

        fr::__sub(z_fft.at(i), alpha_squared, T4); // T4 = (Z(X) - 1).(\alpha^2)
        fr::__mul(T4, alpha_squared, T4); // T4 = (Z(X) - 1).(\alpha^4)
        fr::__mul(T4, l_1.at(i), T4); // T4 = (Z(X) - 1).(\alpha^2).L1(X)
    
        // Add T4 and T6 into the degree 2n component of the quotient polynomial
        fr::__add(T4, T6, quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;
}

void plonk_circuit_state::compute_arithmetisation_coefficients()
{
    q_m.ifft(small_domain);
    q_l.ifft(small_domain);
    q_r.ifft(small_domain);
    q_o.ifft(small_domain);
    q_c.ifft(small_domain);

    p_rdx = polynomial(q_m, 2 * n);
    p_rdi = polynomial(q_l, 2 * n);
    p_rsi = polynomial(q_r, 2 * n);
    p_r8 = polynomial(q_o, 2 * n);
    p_r9 = polynomial(q_c, 2 * n);
    
    p_rdx.coset_fft_with_constant(mid_domain, challenges.alpha);
    p_rdi.coset_fft_with_constant(mid_domain, challenges.alpha);
    p_rsi.coset_fft_with_constant(mid_domain, challenges.alpha);
    p_r8.coset_fft_with_constant(mid_domain, challenges.alpha);
    p_r9.coset_fft_with_constant(mid_domain, challenges.alpha);

    ITERATE_OVER_DOMAIN_START(mid_domain);
        fr::__mul(p_rax.at(i), p_rdx.at(i), p_rdx.at(i)); // w_l * q_m = rdx
        fr::__mul(p_rdx.at(i), p_rbx.at(i), p_rdx.at(i)); // w_l * w_r * q_m = rdx
        fr::__mul(p_rax.at(i), p_rdi.at(i), p_rdi.at(i)); // w_l * q_l = rdi
        fr::__mul(p_rbx.at(i), p_rsi.at(i), p_rsi.at(i)); // w_r * q_r = rsi
        fr::__mul(p_rcx.at(i), p_r8.at(i),  p_r8.at(i)); // w_o * q_o = r8
        fr::__add(p_rdx.at(i), p_rdi.at(i), p_rdx.at(i)); // q_m * w_l * w_r + w_l * q_l = rdx
        fr::__add(p_rsi.at(i), p_r8.at(i),  p_rsi.at(i)); // q_r * w_r + q_o * w_o = rsi
        fr::__add(p_rdx.at(i), p_rsi.at(i),  p_rdx.at(i)); // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o = rdx
        fr::__add(p_rdx.at(i), p_r9.at(i),  p_rdx.at(i)); // _m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o + q_c = rdx
        fr::__add(quotient_mid.at(i), p_rdx.at(i), quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;
}

void plonk_circuit_state::compute_quotient_polynomial()
{
    quotient_large.resize(4 * n);
    quotient_mid.resize(2 * n);

    compute_wire_coefficients();
    compute_wire_commitments();
    compute_z_coefficients();
    compute_z_commitment();

    polynomial z_fft(z, 4 * n);
    compute_permutation_grand_product_coefficients(z_fft);
    compute_identity_grand_product_coefficients(z_fft);
    compute_arithmetisation_coefficients();

    polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(quotient_mid.get_coefficients(), small_domain, mid_domain);
    polynomial_arithmetic::divide_by_pseudo_vanishing_polynomial(quotient_large.get_coefficients(), small_domain, large_domain);

    quotient_mid.coset_ifft(mid_domain);
    quotient_large.coset_ifft(large_domain);

    ITERATE_OVER_DOMAIN_START(mid_domain);
        fr::__add(quotient_large.at(i), quotient_mid.at(i), quotient_large.at(i));
    ITERATE_OVER_DOMAIN_END;

}

fr::field_t plonk_circuit_state::compute_linearisation_coefficients()
{
    r.resize(n);
    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t beta_inv;
    fr::__invert(challenges.beta, beta_inv);
    fr::field_t shifted_z;
    fr::__mul(challenges.z, small_domain.root, shifted_z);

    // evaluate the prover and instance polynomials.
    // (we don't need to evaluate the quotient polynomial, that can be derived by the verifier)
    proof.w_l_eval = w_l.evaluate(challenges.z, n);
    proof.w_r_eval = w_r.evaluate(challenges.z, n);
    proof.w_o_eval = w_o.evaluate(challenges.z, n);
    proof.sigma_1_eval = sigma_1.evaluate(challenges.z, n);
    proof.sigma_2_eval = sigma_2.evaluate(challenges.z, n);
    proof.z_1_shifted_eval = z.evaluate(shifted_z, n);

    fr::field_t t_eval = quotient_large.evaluate(challenges.z, 3 * n);

    // we scaled the sigma polynomials up by beta, so scale back down
    fr::__mul(proof.sigma_1_eval, beta_inv, proof.sigma_1_eval);
    fr::__mul(proof.sigma_2_eval, beta_inv, proof.sigma_2_eval);

    polynomial_arithmetic::lagrange_evaluations lagrange_evals = polynomial_arithmetic::get_lagrange_evaluations(challenges.z, small_domain);
    plonk_linear_terms linear_terms = compute_linear_terms(proof, challenges, lagrange_evals.l_1, n);

    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T6;
        fr::__mul(z.at(i), linear_terms.z_1, T0);
        fr::__mul(sigma_3.at(i), linear_terms.sigma_3, T1);
        // we scaled sigma_3.at(i) by beta, need to correct for that...
        fr::__mul(T1, beta_inv, T1);
        fr::__mul(q_c.at(i), linear_terms.q_c, T2);
        fr::__mul(q_o.at(i), linear_terms.q_o, T3);
        fr::__mul(q_r.at(i), linear_terms.q_r, T4);
        fr::__mul(q_l.at(i), linear_terms.q_l, T5);
        fr::__mul(q_m.at(i), linear_terms.q_m, T6);
        fr::__add(T6, T5, T5);
        fr::__add(T4, T3, T3);
        fr::__add(T2, T1, T1);
        fr::__add(T5, T3, T3);
        fr::__add(T1, T0, T0);
        fr::__add(T3, T0, r.at(i));
    ITERATE_OVER_DOMAIN_END;

    proof.linear_eval = r.evaluate(challenges.z, n);
    return t_eval;
}

void compute_permutation_lagrange_base(polynomial &output, const std::vector<uint32_t> &permutation, const evaluation_domain& small_domain)
{
    output = polynomial(permutation.size());
    fr::field_t k1 = fr::multiplicative_generator();
    fr::field_t k2 = fr::alternate_multiplicative_generator();

    // permutation encoding:
    // low 28 bits defines the location in witness polynomial
    // upper 2 bits defines the witness polynomial:
    // 0 = left
    // 1 = right
    // 2 = output
    const uint32_t mask = (1U << 29) - 1;
    const fr::field_t *roots = small_domain.get_round_roots()[small_domain.log2_size - 2];
    ITERATE_OVER_DOMAIN_START(small_domain);
        const size_t raw_idx = (size_t)(permutation[i]) & (size_t)(mask);
        const bool negative_idx = raw_idx >= (small_domain.size >> 1UL);
        const size_t idx = negative_idx ? raw_idx - (small_domain.size >> 1UL): raw_idx;
        fr::__conditionally_subtract_double_modulus(roots[idx], output.at(i), static_cast<uint64_t>(negative_idx));

        if (((permutation[i] >> 30U) & 1) == 1)
        {
            fr::__mul(output.at(i), k1, output.at(i));
        }
        else if (((permutation[i] >> 31U) & 1) == 1)
        {
            fr::__mul(output.at(i), k2, output.at(i));
        }
    ITERATE_OVER_DOMAIN_END;
}

void plonk_circuit_state::compute_permutation_lagrange_base_full()
{
    compute_permutation_lagrange_base(sigma_1, sigma_1_mapping, small_domain);
    compute_permutation_lagrange_base(sigma_2, sigma_2_mapping, small_domain);
    compute_permutation_lagrange_base(sigma_3, sigma_3_mapping, small_domain);
}

circuit_instance plonk_circuit_state::construct_instance()
{
    polynomial polys[8]{
        polynomial(n, n),
        polynomial(n, n),
        polynomial(n, n),
        polynomial(q_m),
        polynomial(q_l),
        polynomial(q_r),
        polynomial(q_o),
        polynomial(q_c),
    };

    // copy polynomials so that we don't mutate inputs
    compute_permutation_lagrange_base(polys[0], sigma_1_mapping, small_domain);
    compute_permutation_lagrange_base(polys[1], sigma_2_mapping, small_domain);
    compute_permutation_lagrange_base(polys[2], sigma_3_mapping, small_domain);

    for (size_t i = 0; i < 8; ++i)
    {
        polys[i].ifft(small_domain);
    }

    scalar_multiplication::multiplication_state mul_state[8];

    for (size_t i = 0; i < 8; ++i)
    {
        mul_state[i].num_elements = n;
        mul_state[i].points = reference_string.monomials;
        mul_state[i].scalars = polys[i].get_coefficients();
    }

    scalar_multiplication::batched_scalar_multiplications(mul_state, 8);

    circuit_instance instance;
    instance.n = n;
    g1::jacobian_to_affine(mul_state[0].output, instance.SIGMA_1);
    g1::jacobian_to_affine(mul_state[1].output, instance.SIGMA_2);
    g1::jacobian_to_affine(mul_state[2].output, instance.SIGMA_3);
    g1::jacobian_to_affine(mul_state[3].output, instance.Q_M);
    g1::jacobian_to_affine(mul_state[4].output, instance.Q_L);
    g1::jacobian_to_affine(mul_state[5].output, instance.Q_R);
    g1::jacobian_to_affine(mul_state[6].output, instance.Q_O);
    g1::jacobian_to_affine(mul_state[7].output, instance.Q_C);

    return instance;
}

plonk_proof plonk_circuit_state::construct_proof()
{
    compute_permutation_lagrange_base_full();
    compute_quotient_polynomial();
    compute_quotient_commitment();

    fr::field_t t_eval = compute_linearisation_coefficients();

    challenges.nu = compute_linearisation_challenge(proof, t_eval);

    fr::field_t nu_powers[7];
    fr::copy(challenges.nu, nu_powers[0]);
    for (size_t i = 1; i < 7; ++i)
    {
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

    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::field_t T4;
        fr::field_t T5;
        fr::field_t T8;
        fr::field_t T9;
        fr::__mul(quotient_large.at(i+n), z_pow_n, T8);
        fr::__mul(quotient_large.at(i+n+n), z_pow_2_n, T9);
        fr::__mul(r.at(i), nu_powers[0], T0);
        fr::__mul(w_l.at(i), nu_powers[1], T1);
        fr::__mul(w_r.at(i), nu_powers[2], T2);
        fr::__mul(w_o.at(i), nu_powers[3], T3);
        fr::__mul(sigma_1.at(i), nu_powers[4], T4);
        fr::__mul(sigma_2.at(i), nu_powers[5], T5);
        fr::__mul(z.at(i), nu_powers[6], shifted_opening_poly.at(i));
        fr::__add(T8, T9, T8);
        fr::__add(T4, T5, T4);
        fr::__add(T3, T2, T3);
        fr::__add(T1, T0, T1);
        // we added a \beta multiplier to sigma_1(X), sigma_2(X), sigma_3(X), s_id(X) - need to undo that here
        fr::__mul(T4, beta_inv, T4);
        fr::__add(T3, T1, T3);
        fr::__add(T4, T3, T4);
        fr::__add(T4, T8, T4);
        fr::__add(quotient_large.at(i), T4, opening_poly.at(i));
    ITERATE_OVER_DOMAIN_END;


    fr::field_t shifted_z;
    fr::__mul(challenges.z, small_domain.root, shifted_z);

    opening_poly.compute_kate_opening_coefficients(challenges.z);

    shifted_opening_poly.compute_kate_opening_coefficients(shifted_z);

    // Compute PI_Z(X) and PI_Z_OMEGA(X)
    scalar_multiplication::multiplication_state mul_state[2]{
        { reference_string.monomials, opening_poly.get_coefficients(), n, {}},
        { reference_string.monomials, shifted_opening_poly.get_coefficients(), n, {}},
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);

    g1::jacobian_to_affine(mul_state[0].output, proof.PI_Z);
    g1::jacobian_to_affine(mul_state[1].output, proof.PI_Z_OMEGA);

    return proof;
}

} // namespace waffle