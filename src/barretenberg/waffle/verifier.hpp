#pragma once

#include "./waffle.hpp"
#include "./challenge.hpp"
#include "linearizer.hpp"
#include "../groups/pairing.hpp"

#include "../types.hpp"
namespace waffle
{
namespace verifier
{

bool verify_proof(const waffle::plonk_proof &proof, const waffle::circuit_instance &instance, const g2::affine_element &SRS_T2)
{
    polynomials::evaluation_domain domain = polynomials::get_domain(instance.n);
    // TODO: validate everything is in the correct field/group

    // reconstruct challenges
    plonk_challenges challenges;
    fr::field_t alpha_pow[5];
    fr::field_t nu_pow[10];
    challenges.alpha = compute_alpha(proof);
    challenges.gamma = compute_gamma(proof);
    challenges.beta = compute_beta(proof, challenges.gamma);
    fr::field_t u = fr::random_element();
    challenges.z = compute_evaluation_challenge(proof);
    challenges.nu =  compute_linearisation_challenge(proof);
    fr::copy(challenges.nu, nu_pow[0]);
    fr::copy(challenges.alpha, alpha_pow[0]);
    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(challenges.z, domain);
    
    // compute the terms we need to derive R(X)
    plonk_linear_terms linear_terms = compute_linear_terms(proof, challenges, lagrange_evals.l_1, instance.n);

    // reconstruct evaluation of quotient polynomial from proverm essages
    fr::field_t t_eval;
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    for (size_t i = 1; i < 5; ++i)
    {
        fr::mul(alpha_pow[i - 1], alpha_pow[0], alpha_pow[i]);
    }
    for (size_t i = 1; i < 10; ++i)
    {
        fr::mul(nu_pow[i - 1], nu_pow[0], nu_pow[i]);
    }

    fr::mul(lagrange_evals.l_n_minus_1, alpha_pow[4], T0);

    fr::sub(proof.z_1_shifted_eval, proof.z_2_shifted_eval, T1);
    fr::mul(T0, T1, T0);

    fr::mul(proof.z_1_shifted_eval, alpha_pow[1], T1);
    fr::mul(proof.z_2_shifted_eval, alpha_pow[2], T2);
    fr::add(T1, T2, T1);
    fr::sub(T0, T1, T0);
    fr::add(T0, proof.linear_eval, t_eval);
    fr::invert(lagrange_evals.vanishing_poly, T0);
    fr::mul(t_eval, T0, t_eval);

    // reconstruct Kate opening commitments from committed values
    fr::mul(linear_terms.q_m, nu_pow[0], linear_terms.q_m);
    fr::mul(linear_terms.q_l, nu_pow[0], linear_terms.q_l);
    fr::mul(linear_terms.q_r, nu_pow[0], linear_terms.q_r);
    fr::mul(linear_terms.q_o, nu_pow[0], linear_terms.q_o);
    fr::mul(linear_terms.q_c, nu_pow[0], linear_terms.q_c);
    fr::mul(linear_terms.z_1, nu_pow[0], linear_terms.z_1);
    fr::mul(linear_terms.z_2, nu_pow[0], linear_terms.z_2);

    fr::mul(nu_pow[8], u, T0);
    fr::add(linear_terms.z_1, T0, linear_terms.z_1);
    fr::mul(nu_pow[9], u, T0);
    fr::add(linear_terms.z_2, T0, linear_terms.z_2);

    // TODO: use multi-exp!
    g1::element d_evals[14];
    d_evals[0] = g1::group_exponentiation_inner(instance.Q_M, linear_terms.q_m);
    d_evals[1] = g1::group_exponentiation_inner(instance.Q_L, linear_terms.q_l);
    d_evals[2] = g1::group_exponentiation_inner(instance.Q_R, linear_terms.q_r);
    d_evals[3] = g1::group_exponentiation_inner(instance.Q_O, linear_terms.q_o);
    d_evals[4] = g1::group_exponentiation_inner(instance.Q_C, linear_terms.q_c);
    d_evals[5] = g1::group_exponentiation_inner(proof.Z_1, linear_terms.z_1);
    d_evals[6] = g1::group_exponentiation_inner(proof.Z_2, linear_terms.z_2);
    d_evals[7] = g1::group_exponentiation_inner(proof.W_L, nu_pow[1]);
    d_evals[8] = g1::group_exponentiation_inner(proof.W_R, nu_pow[2]);
    d_evals[9] = g1::group_exponentiation_inner(proof.W_O, nu_pow[3]);
    d_evals[10] = g1::group_exponentiation_inner(instance.S_ID, nu_pow[4]);
    d_evals[11] = g1::group_exponentiation_inner(instance.SIGMA_1, nu_pow[5]);
    d_evals[12] = g1::group_exponentiation_inner(instance.SIGMA_2, nu_pow[6]);
    d_evals[13] = g1::group_exponentiation_inner(instance.SIGMA_3, nu_pow[7]);

    g1::element F;
    g1::copy_from_affine(proof.T, F);
    g1::add(F, d_evals[0], F);
    g1::add(F, d_evals[1], F);
    g1::add(F, d_evals[2], F);
    g1::add(F, d_evals[3], F);
    g1::add(F, d_evals[4], F);
    g1::add(F, d_evals[5], F);
    g1::add(F, d_evals[6], F);
    g1::add(F, d_evals[7], F);
    g1::add(F, d_evals[8], F);
    g1::add(F, d_evals[9], F);
    g1::add(F, d_evals[10], F);
    g1::add(F, d_evals[11], F);
    g1::add(F, d_evals[12], F);
    g1::add(F, d_evals[13], F);

    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T6;
    fr::field_t T7;
    fr::field_t T8;
    fr::field_t T9;
    fr::field_t batch_evaluation;
    fr::mul(nu_pow[0], proof.linear_eval, T0);
    fr::mul(nu_pow[1], proof.w_l_eval, T1);
    fr::mul(nu_pow[2], proof.w_r_eval, T2);
    fr::mul(nu_pow[3], proof.w_o_eval, T3);
    fr::mul(nu_pow[4], proof.s_id_eval, T4);
    fr::mul(nu_pow[5], proof.sigma_1_eval, T5);
    fr::mul(nu_pow[6], proof.sigma_2_eval, T6);
    fr::mul(nu_pow[7], proof.sigma_3_eval, T7);
    fr::mul(nu_pow[8], u, T8);
    fr::mul(T8, proof.z_1_shifted_eval, T8);
    fr::mul(nu_pow[9], u, T9);
    fr::mul(T9, proof.z_2_shifted_eval, T9);

    fr::copy(t_eval, batch_evaluation);
    fr::add(batch_evaluation, T0, batch_evaluation);
    fr::add(batch_evaluation, T1, batch_evaluation);
    fr::add(batch_evaluation, T2, batch_evaluation);
    fr::add(batch_evaluation, T3, batch_evaluation);
    fr::add(batch_evaluation, T4, batch_evaluation);
    fr::add(batch_evaluation, T5, batch_evaluation);
    fr::add(batch_evaluation, T6, batch_evaluation);
    fr::add(batch_evaluation, T7, batch_evaluation);
    fr::add(batch_evaluation, T8, batch_evaluation);
    fr::add(batch_evaluation, T9, batch_evaluation);

    g1::element E = g1::group_exponentiation_inner(g1::affine_one(), batch_evaluation);

    // construct G1 elements of Kate opening proof
    g1::element TEMP_1;
    g1::element TEMP_2;
    g1::element LHS;
    g1::element RHS;

    fr::field_t z_omega_scalar;
    fr::mul(challenges.z, domain.root, z_omega_scalar);
    fr::mul(z_omega_scalar, u, z_omega_scalar);
    TEMP_1 = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, z_omega_scalar);
    TEMP_2 = g1::group_exponentiation_inner(proof.PI_Z, challenges.z);
    g1::neg(E, E);
    g1::add(F, E, RHS);
    g1::add(RHS, TEMP_1, RHS);
    g1::add(RHS, TEMP_2, RHS);

    LHS = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, u);
    g1::copy_from_affine(proof.PI_Z, TEMP_1);
    g1::add(LHS, TEMP_1, LHS);
    g1::neg(LHS, LHS);

    // Validate correctness of supplied polynomial evaluations
    g1::affine_element P[2];
    g2::affine_element Q[2];

    g1::copy_to_affine(LHS, P[0]);
    g1::copy_to_affine(RHS, P[1]);

    g2::copy_affine(SRS_T2, Q[0]);
    g2::copy_affine(g2::affine_one(), Q[1]);
    fq12::fq12_t result = pairing::reduced_ate_pairing_batch(P, Q, 2);

    return fq12::eq(result, fq12::one()); // wheeee
}
} // namespace verifier
} // namespace waffle