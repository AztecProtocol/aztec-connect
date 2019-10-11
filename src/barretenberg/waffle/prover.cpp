#include "./prover.hpp"

#include "../groups/g1.hpp"
#include "../groups/scalar_multiplication.hpp"
#include "../polynomials/polynomial_arithmetic.hpp"
#include "../fields/fr.hpp"
#include "./linearizer.hpp"
#include "./challenge.hpp"

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
    scalar_multiplication::multiplication_state mul_state[3];
    mul_state[0].num_elements = n;
    mul_state[0].scalars = w_l.get_coefficients();
    mul_state[0].points = reference_string.monomials;
    mul_state[1].num_elements = n;
    mul_state[1].scalars = w_r.get_coefficients();
    mul_state[1].points = reference_string.monomials;
    mul_state[2].num_elements = n;
    mul_state[2].scalars = w_o.get_coefficients();
    mul_state[2].points = reference_string.monomials;

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
        .points=reference_string.monomials,
        .scalars=z.get_coefficients(),
        .num_elements=n,
        .output=g1::element()};

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
        { .points=reference_string.monomials,.scalars=&quotient_large.get_coefficients()[0], .num_elements=n, .output={} },
        { .points=reference_string.monomials,.scalars=&quotient_large.get_coefficients()[n], .num_elements=n, .output={}},
        { .points=reference_string.monomials,.scalars=&quotient_large.get_coefficients()[n+n], .num_elements=n, .output={}},
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
        for (size_t j = 1; j < small_domain.size; ++j)
        {
            fr::__mul(coeffs[j + 1], coeffs[j], coeffs[j + 1]);
        }
    }

    polynomial z2(n + n, n + n);
    z.reserve(n);
    // step 3: concatenate together the accumulator elements into Z1(X), Z2(X)
    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::__mul(accumulators[0].at(i), accumulators[1].at(i), z.at(i));
        fr::__mul(z.at(i), accumulators[2].at(i), z.at(i));

        fr::__mul(accumulators[3].at(i), accumulators[4].at(i), z2.at(i));
        fr::__mul(z2.at(i), accumulators[5].at(i), z2.at(i));
    ITERATE_OVER_DOMAIN_END;

    fr::batch_invert(z2.get_coefficients(), small_domain.size, &z2.get_coefficients()[n]);

    ITERATE_OVER_DOMAIN_START(small_domain);
        fr::__mul(z.at(i), z2.at(i), z.at(i));
    ITERATE_OVER_DOMAIN_END;

    z.ifft(small_domain);
}

void plonk_circuit_state::compute_permutation_grand_product_coefficients()
{
    // The final steps are:
    // 1: Compute the permutation grand product
    // 2: Compute permutation check coefficients
    // when computing coefficients of sigma_1, sigma_2, sigma_3, scale the polynomial by \beta to save a mul
    sigma_1.ifft_with_constant(small_domain, challenges.beta);
    sigma_2.ifft_with_constant(small_domain, challenges.beta);
    sigma_3.ifft_with_constant(small_domain, challenges.beta);

    p_rax = polynomial(sigma_1, large_domain.size);
    p_rbx = polynomial(sigma_2, large_domain.size);
    p_rcx = polynomial(sigma_3, large_domain.size);
    p_rdx = polynomial(z, large_domain.size + 4);

    // add `gamma/beta` to sigma_1(X), so that we don't have to add it into each evaluation
    // and add w_l(X) as well for good measure
    fr::__add(p_rax.at(0), challenges.gamma, p_rax.at(0));
    fr::__add(p_rbx.at(0), challenges.gamma, p_rbx.at(0));
    fr::__add(p_rcx.at(0), challenges.gamma, p_rcx.at(0));

    ITERATE_OVER_DOMAIN_START(small_domain);
    fr::__add(p_rax.at(i), w_l.at(i), p_rax.at(i));
    fr::__add(p_rbx.at(i), w_r.at(i), p_rbx.at(i));
    fr::__add(p_rcx.at(i), w_o.at(i), p_rcx.at(i));
    ITERATE_OVER_DOMAIN_END;

    fr::field_t alpha_squared = fr::sqr(challenges.alpha);
    p_rax.coset_fft(large_domain);
    p_rbx.coset_fft(large_domain);
    p_rcx.coset_fft(large_domain);
    p_rdx.coset_fft_with_constant(large_domain, alpha_squared);

    fr::copy(p_rdx.at(0), p_rdx.at(large_domain.size));
    fr::copy(p_rdx.at(1), p_rdx.at(large_domain.size + 1));
    fr::copy(p_rdx.at(2), p_rdx.at(large_domain.size + 2));
    fr::copy(p_rdx.at(3), p_rdx.at(large_domain.size + 3));

    // fr::field_t *shifted_z_1_poly = &ffts.z_1_poly[4];
    quotient_large = polynomial(4 * n, 4 * n);

    ITERATE_OVER_DOMAIN_START(large_domain);
        fr::__mul(p_rax.at(i), p_rbx.at(i), p_rcx.at(i));
        fr::__mul(p_rax.at(i), p_rcx.at(i), p_rax.at(i));
        fr::__mul(p_rax.at(i), p_rdx.at(i + 4), p_rax.at(i));
        fr::neg(p_rax.at(i), quotient_large.at(i));
    ITERATE_OVER_DOMAIN_END;

    p_rax = polynomial(w_l, 4 * n);
    p_rbx = polynomial(w_r, 4 * n);
    p_rcx = polynomial(w_o, 4 * n);
    p_rax.coset_fft(large_domain);
    p_rbx.coset_fft(large_domain);
    p_rcx.coset_fft(large_domain);
}

void plonk_circuit_state::compute_identity_grand_product_coefficients()
{
    fr::field_t right_shift = fr::multiplicative_generator();
    fr::field_t output_shift = fr::alternate_multiplicative_generator();

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
            fr::__mul(T0, p_rdx.at(i), T0);
            fr::__add(quotient_large.at(i), T0, quotient_large.at(i));
            fr::__mul(work_root, large_domain.root, work_root);
        }
    }

    // We can shrink the evaluation domain by 2 for the wire polynomials, to save on memory
    p_rax.shrink_evaluation_domain(2);
    p_rbx.shrink_evaluation_domain(2);
    p_rcx.shrink_evaluation_domain(2);
    p_rdx.shrink_evaluation_domain(2);

    polynomial l_1(n + n + 4, n + n + 4);
    polynomial_arithmetic::compute_lagrange_polynomial_fft(l_1.get_coefficients(), small_domain, mid_domain);

    fr::copy(l_1.at(0), l_1.at(mid_domain.size));
    fr::copy(l_1.at(1), l_1.at(mid_domain.size + 1));
    fr::copy(l_1.at(2), l_1.at(mid_domain.size + 2));
    fr::copy(l_1.at(3), l_1.at(mid_domain.size + 3));
    fr::field_t *l_n_minus_1_poly = &l_1.get_coefficients()[4];
    fr::field_t *shifted_z_poly = &z.get_coefficients()[2];

    // accumulate degree-2n terms into gate_poly_mid
    fr::field_t alpha_squared = fr::sqr(challenges.alpha);

    ITERATE_OVER_DOMAIN_START(mid_domain);
        fr::field_t T4;
        fr::field_t T6;
        fr::__sub(shifted_z_poly[i], alpha_squared, T6);
        fr::__mul(T6, challenges.alpha, T6);
        fr::__mul(T6, l_n_minus_1_poly[i], T6);

        fr::__sub(z.at(i), alpha_squared, T4);
        fr::__mul(T4, alpha_squared, T4);
        fr::__mul(T4, l_1.at(i), T4);
    
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

    p_rdx = polynomial(q_m, n + n);
    p_rdi = polynomial(q_l, n + n);
    p_rsi = polynomial(q_r, n + n);
    p_r8 = polynomial(q_o, n + n);
    p_r9 = polynomial(q_c, n + n);
    
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
        fr::__mul(p_rcx.at(i), p_r8.at(i), p_r8.at(i)); // w_o * q_o = r8
        fr::__add(p_rdx.at(i), p_rdi.at(i), p_rdx.at(i)); // q_m * w_l * w_r + w_l * q_l = rdx
        fr::__add(p_rsi.at(i), p_r8.at(i), p_rsi.at(i)); // q_r * w_r + q_o * w_o = rsi
        fr::__add(p_rdx.at(i), p_r9.at(i), p_rdx.at(i)); // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o = rdx
        fr::__add(p_rdx.at(i), p_r9.at(i), p_rdx.at(i)); // _m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o + q_c = rdx
        fr::__add(quotient_mid.at(i), p_rdx.at(i), quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;
}

void plonk_circuit_state::compute_quotient_polynomial()
{
    quotient_large.reserve(4 * n);
    quotient_mid.reserve(2 * n);

    compute_wire_coefficients();
    compute_wire_commitments();
    compute_z_coefficients();
    compute_z_commitment();
    compute_permutation_grand_product_coefficients();
    compute_identity_grand_product_coefficients();
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
    // ok... now we need to evaluate polynomials. Jeepers
    fr::field_t beta_inv;
    fr::__invert(challenges.beta, beta_inv);
    fr::field_t shifted_z;
    fr::__mul(challenges.z, small_domain.root, shifted_z);

    // evaluate the prover and instance polynomials.
    // (we don't need to evaluate the quotient polynomial, that can be derived by the verifier)
    proof.w_l_eval = w_l.evaluate(challenges.z);
    proof.w_r_eval = w_r.evaluate(challenges.z);
    proof.w_o_eval = w_o.evaluate(challenges.z);
    proof.sigma_1_eval = sigma_1.evaluate(challenges.z);
    proof.sigma_2_eval = sigma_2.evaluate(challenges.z);
    proof.z_1_shifted_eval = z.evaluate(challenges.z);

    fr::field_t t_eval = quotient_large.evaluate(challenges.z);

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
        fr::copy(q_c.at(i), T2);
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

    proof.linear_eval = r.evaluate(challenges.z);
    return t_eval;
}

void compute_permutation_lagrange_base(polynomial &output, const std::vector<uint32_t> &permutation, const evaluation_domain& small_domain)
{
    output.reserve(permutation.size());
    fr::field_t k1 = fr::multiplicative_generator();
    fr::field_t k2 = fr::alternate_multiplicative_generator();


    // permutation encoding:
    // low 28 bits defines the location in witness polynomial
    // upper 2 bits defines the witness polynomial:
    // 0 = left
    // 1 = right
    // 2 = output
    const uint32_t mask = (1U << 29) - 1;
    const fr::field_t *roots = small_domain.get_round_roots()[0];
    ITERATE_OVER_DOMAIN_START(small_domain);
        const size_t idx = (size_t)(permutation[i]) & (size_t)(mask);
        fr::copy(roots[idx], output.at(i));
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

    polynomial opening_poly;
    polynomial shifted_opening_poly;
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
    shifted_opening_poly.compute_kate_opening_coefficients(challenges.z);

    // Compute PI_Z(X) and PI_Z_OMEGA(X)
    scalar_multiplication::multiplication_state mul_state[2];

    mul_state[0].scalars = opening_poly.get_coefficients();
    mul_state[1].scalars = shifted_opening_poly.get_coefficients();

    mul_state[0].points = reference_string.monomials;
    mul_state[1].points = reference_string.monomials;

    mul_state[0].num_elements = small_domain.size;
    mul_state[1].num_elements = small_domain.size;
    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);

    g1::jacobian_to_affine(mul_state[0].output, proof.PI_Z);
    g1::jacobian_to_affine(mul_state[1].output, proof.PI_Z_OMEGA);

    return proof;
}

} // namespace waffle