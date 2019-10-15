#ifndef WIDGET_VERIFIER_HPP
#define WIDGET_VERIFIER_HPP

#include "./challenge.hpp"
#include "../groups/g1.hpp"
#include "../groups/g2.hpp"
#include "../fields/fq12.hpp"
#include "../groups/pairing.hpp"
#include "../polynomials/evaluation_domain.hpp"
#include "../polynomials/polynomial_arithmetic.hpp"
#include "linearizer.hpp"

#include "../types.hpp"
#include "./widgets/widget_base.hpp"
#include "../groups/scalar_multiplication.hpp"

namespace waffle
{
using namespace barretenberg;
namespace test_verifier
{

inline bool verify_proof(const waffle::plonk_proof &proof, const waffle::base_circuit_instance &instance, const g2::affine_element &SRS_T2)
{
    evaluation_domain domain = evaluation_domain(instance.n);
    // TODO: validate everything is in the correct field/group

    // reconstruct challenges
    plonk_challenges challenges;
    fr::field_t alpha_pow[4];
    fr::field_t nu_pow[7];
    challenges.alpha = compute_alpha(proof);
    challenges.gamma = compute_gamma(proof);
    challenges.beta = compute_beta(proof, challenges.gamma);
    challenges.z = compute_evaluation_challenge(proof);

    polynomial_arithmetic::lagrange_evaluations lagrange_evals = polynomial_arithmetic::get_lagrange_evaluations(challenges.z, domain);

    // compute the terms we need to derive R(X)
    plonk_linear_terms linear_terms = compute_linear_terms(proof, challenges, lagrange_evals.l_1, instance.n);

    // reconstruct evaluation of quotient polynomial from prover messages
    fr::field_t t_eval;
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::copy(challenges.alpha, alpha_pow[0]);
    for (size_t i = 1; i < 4; ++i)
    {
        fr::__mul(alpha_pow[i - 1], alpha_pow[0], alpha_pow[i]);
    }


    fr::__mul(proof.sigma_1_eval, challenges.beta, T0);
    fr::__add(proof.w_l_eval, challenges.gamma, T1);
    fr::__add(T0, T1, T0);

    fr::__mul(proof.sigma_2_eval, challenges.beta, T2);
    fr::__add(proof.w_r_eval, challenges.gamma, T1);
    fr::__add(T2, T1, T2);

    fr::__add(proof.w_o_eval, challenges.gamma, T3);

    fr::__mul(T0, T2, T0);
    fr::__mul(T0, T3, T0);
    fr::__mul(T0, proof.z_1_shifted_eval, T0);
    fr::__mul(T0, alpha_pow[1], T0);

    fr::__sub(proof.z_1_shifted_eval, fr::one(), T1);
    fr::__mul(T1, lagrange_evals.l_n_minus_1, T1);
    fr::__mul(T1, alpha_pow[2], T1);

    fr::__mul(lagrange_evals.l_1, alpha_pow[3], T2);

    fr::__sub(T1, T2, T1);
    fr::__sub(T1, T0, T1);

    fr::__add(T1, proof.linear_eval, t_eval);
    fr::__invert(lagrange_evals.vanishing_poly, T0);
    fr::__mul(t_eval, T0, t_eval);

    fr::field_t z_pow_n;
    fr::field_t z_pow_2n;
    fr::__pow_small(challenges.z, instance.n, z_pow_n);
    fr::__pow_small(challenges.z, instance.n * 2, z_pow_2n);

    challenges.nu = compute_linearisation_challenge(proof, t_eval);

    fr::field_t u = compute_kate_separation_challenge(proof, t_eval);
    fr::copy(challenges.nu, nu_pow[0]);
    for (size_t i = 1; i < 7; ++i)
    {
        fr::__mul(nu_pow[i - 1], nu_pow[0], nu_pow[i]);
    }

    // reconstruct Kate opening commitments from committed values
    fr::__mul(linear_terms.q_m, nu_pow[0], linear_terms.q_m);
    fr::__mul(linear_terms.q_l, nu_pow[0], linear_terms.q_l);
    fr::__mul(linear_terms.q_r, nu_pow[0], linear_terms.q_r);
    fr::__mul(linear_terms.q_o, nu_pow[0], linear_terms.q_o);
    fr::__mul(linear_terms.q_c, nu_pow[0], linear_terms.q_c);
    fr::__mul(linear_terms.z_1, nu_pow[0], linear_terms.z_1);
    fr::__mul(linear_terms.sigma_3, nu_pow[0], linear_terms.sigma_3);

    fr::__mul(nu_pow[6], u, T0);
    fr::__add(linear_terms.z_1, T0, linear_terms.z_1);

    fr::field_t batch_evaluation;
    fr::copy(t_eval, batch_evaluation);
    fr::__mul(nu_pow[0], proof.linear_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);

    fr::__mul(nu_pow[1], proof.w_l_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);

    fr::__mul(nu_pow[2], proof.w_r_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);

    fr::__mul(nu_pow[3], proof.w_o_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);

    fr::__mul(nu_pow[4], proof.sigma_1_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);

    fr::__mul(nu_pow[5], proof.sigma_2_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);


    fr::__mul(nu_pow[6], u, T0);
    fr::__mul(T0, proof.z_1_shifted_eval, T0);
    fr::__add(batch_evaluation, T0, batch_evaluation);


    fr::neg(batch_evaluation, batch_evaluation);

    fr::field_t z_omega_scalar;
    fr::__mul(challenges.z, domain.root, z_omega_scalar);
    fr::__mul(z_omega_scalar, u, z_omega_scalar);

    std::vector<fr::field_t > scalars;
    std::vector<g1::affine_element > elements;

    elements.emplace_back(proof.Z_1);
    scalars.emplace_back(linear_terms.z_1);

    elements.emplace_back(proof.W_L);
    scalars.emplace_back(nu_pow[1]);

    elements.emplace_back(proof.W_R);
    scalars.emplace_back(nu_pow[2]);

    elements.emplace_back(proof.W_O);
    scalars.emplace_back(nu_pow[3]);

    elements.emplace_back(instance.SIGMA_1);
    scalars.emplace_back(nu_pow[4]);

    elements.emplace_back(instance.SIGMA_2);
    scalars.emplace_back(nu_pow[5]);

    elements.emplace_back(instance.SIGMA_3);
    scalars.emplace_back(linear_terms.sigma_3);

    elements.emplace_back(g1::affine_one());
    scalars.emplace_back(batch_evaluation);

    elements.emplace_back(proof.PI_Z_OMEGA);
    scalars.emplace_back(z_omega_scalar);

    elements.emplace_back(proof.PI_Z);
    scalars.emplace_back(challenges.z);

    elements.emplace_back(proof.T_MID);
    scalars.emplace_back(z_pow_n);

    elements.emplace_back(proof.T_HI);
    scalars.emplace_back(z_pow_2n);

    fr::field_t alpha_base = challenges.alpha;
    for (size_t i = 0; i < instance.widget_verifiers.size(); ++i)
    {
        alpha_base = instance.widget_verifiers[i]->append_scalar_multiplication_inputs(
            alpha_base,
            challenges.alpha,
            challenges.nu,
            proof,
            elements,
            scalars);
    }

    size_t num_elements = elements.size();
    elements.resize(num_elements * 2);
    scalar_multiplication::generate_pippenger_point_table(&elements[0], &elements[0], num_elements);
    g1::element P[2];

    P[0] = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, u);
    P[1] = scalar_multiplication::pippenger(&scalars[0], &elements[0], num_elements);

    g1::mixed_add(P[1], proof.T_LO, P[1]);
    g1::mixed_add(P[0], proof.PI_Z, P[0]);
    g1::neg(P[0], P[0]);
    g1::batch_normalize(P, 2);

    g1::affine_element P_affine[2];
    fq::copy(P[0].x, P_affine[0].x);
    fq::copy(P[0].y, P_affine[0].y);
    fq::copy(P[1].x, P_affine[1].x);
    fq::copy(P[1].y, P_affine[1].y);

    g2::affine_element Q_affine[2];
    g2::copy_affine(SRS_T2, Q_affine[0]);
    g2::copy_affine(g2::affine_one(), Q_affine[1]);

    fq12::fq12_t result = pairing::reduced_ate_pairing_batch(P_affine, Q_affine, 2);

    return fq12::eq(result, fq12::one()); // wheeee
}
} // namespace verifier
} // namespace waffle

#endif