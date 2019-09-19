#pragma once

#include "./waffle.hpp"
#include "./challenge.hpp"
#include "../groups/pairing.hpp"

namespace waffle
{
namespace verifier
{

bool verify_proof(const waffle::plonk_proof &proof, const waffle::plonk_instance &instance, const g2::affine_element &SRS_T2)
{
    // blah. Where do we begin?
    polynomials::evaluation_domain domain = polynomials::get_domain(instance.n);
    // TODO: validate everything is in the correct field/group
    fr::field_t alpha_pow[4];
    fr::field_t nu_pow[10];
    fr::field_t gamma = compute_gamma(proof);
    fr::field_t beta = compute_beta(proof, gamma);
    fr::field_t u;
    fr::random_element(u);
    alpha_pow[0] = compute_alpha(proof);
    fr::field_t z = compute_evaluation_challenge(proof);
    nu_pow[0] = compute_linearisation_challenge(proof);

    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(z, domain);

    fr::field_t t_eval;

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    for (size_t i = 1; i < 4; ++i)
    {
        fr::mul(alpha_pow[i - 1], alpha_pow[0], alpha_pow[i]);
    }
    for (size_t i = 1; i < 10; ++i)
    {
        fr::mul(nu_pow[i - 1], nu_pow[0], nu_pow[i]);
    }

    fr::mul(proof.z_1_shifted_eval, alpha_pow[1], T0);
    fr::mul(proof.z_2_shifted_eval, alpha_pow[2], T1);
    fr::sub(proof.z_1_shifted_eval, proof.z_2_shifted_eval, T2);
    fr::mul(T2, lagrange_evals.l_1, T2);
    fr::mul(T2, alpha_pow[3], T2);
    fr::add(proof.linear_eval, T0, t_eval);
    fr::add(t_eval, T1, t_eval);
    fr::add(t_eval, T2, t_eval);
    fr::invert(lagrange_evals.vanishing_poly, T0);
    fr::mul(t_eval, T0, t_eval);

    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T6;
    fr::field_t T7;
    fr::field_t T8;
    fr::field_t T9;
    fr::field_t r_z_1_term;
    fr::field_t r_z_2_term;
    fr::field_t r_q_m_term;
    fr::field_t r_q_l_term;
    fr::field_t r_q_r_term;
    fr::field_t r_q_o_term;
    fr::field_t r_q_c_term;

    fr::field_t beta_n = {.data = {instance.n, 0, 0, 0}};
    fr::to_montgomery_form(beta_n, beta_n);
    fr::mul(beta_n, beta, beta_n);
    fr::field_t beta_n_2;
    fr::add(beta_n, beta_n, beta_n_2);

    fr::mul(proof.s_id_eval, beta, T0);
    fr::add(T0, proof.w_l_eval, T0);
    fr::add(T0, gamma, T0);

    fr::mul(proof.s_id_eval, beta, T1);
    fr::add(T1, proof.w_r_eval, T1);
    fr::add(T1, gamma, T1);
    fr::add(T1, beta_n, T1);

    fr::mul(proof.s_id_eval, beta, T2);
    fr::add(T2, proof.w_o_eval, T2);
    fr::add(T2, gamma, T2);
    fr::add(T2, beta_n_2, T2);

    fr::mul(T2, T1, T1);
    fr::mul(T1, T0, T0);
    fr::mul(T0, alpha_pow[1], r_z_1_term);

    fr::mul(proof.sigma_1_eval, beta, T0);
    fr::add(T0, proof.w_l_eval, T0);
    fr::add(T0, gamma, T0);

    fr::mul(proof.sigma_2_eval, beta, T1);
    fr::add(T1, proof.w_r_eval, T1);
    fr::add(T1, gamma, T1);

    fr::mul(proof.sigma_3_eval, beta, T2);
    fr::add(T2, proof.w_o_eval, T2);
    fr::add(T2, gamma, T2);

    fr::mul(T2, T1, T1);
    fr::mul(T1, T0, T0);
    fr::mul(T0, alpha_pow[2], r_z_2_term);


    fr::mul(lagrange_evals.l_1, alpha_pow[3], T0);
    fr::add(r_z_1_term, T0, r_z_1_term);
    fr::neg(T0, T0);
    fr::add(r_z_2_term, T0, r_z_2_term);


    fr::mul(proof.w_o_eval, alpha_pow[0], r_q_o_term);
    fr::mul(proof.w_r_eval, alpha_pow[0], r_q_r_term);
    fr::mul(proof.w_l_eval, alpha_pow[0], r_q_l_term);

    fr::mul(proof.w_l_eval, proof.w_r_eval, r_q_m_term);
    fr::mul(r_q_m_term, alpha_pow[0], r_q_m_term);


    fr::mul(r_q_m_term, nu_pow[0], r_q_m_term);
    fr::mul(r_q_l_term, nu_pow[0], r_q_l_term);
    fr::mul(r_q_r_term, nu_pow[0], r_q_r_term);
    fr::mul(r_q_o_term, nu_pow[0], r_q_o_term);
    fr::mul(alpha_pow[0], nu_pow[0], r_q_c_term);
    fr::mul(r_z_1_term, nu_pow[0], r_z_1_term);
    fr::mul(r_z_2_term, nu_pow[0], r_z_2_term);

    fr::mul(nu_pow[8], u, T0);
    fr::add(r_z_1_term, T0, r_z_1_term);
    fr::mul(nu_pow[9], u, T0);
    fr::add(r_z_2_term, T0, r_z_2_term);

    // TODO: use pippenger!
    g1::element d_evals[12];
    d_evals[0] = g1::group_exponentiation_inner(instance.Q_M, r_q_m_term);
    d_evals[1] = g1::group_exponentiation_inner(instance.Q_L, r_q_l_term);
    d_evals[2] = g1::group_exponentiation_inner(instance.Q_R, r_q_r_term);
    d_evals[3] = g1::group_exponentiation_inner(instance.Q_O, r_q_o_term);
    d_evals[4] = g1::group_exponentiation_inner(proof.Z_1, r_z_1_term);
    d_evals[5] = g1::group_exponentiation_inner(proof.Z_2, r_z_2_term);
    d_evals[6] = g1::group_exponentiation_inner(proof.W_L, nu_pow[1]);
    d_evals[7] = g1::group_exponentiation_inner(proof.W_R, nu_pow[2]);
    d_evals[8] = g1::group_exponentiation_inner(proof.W_O, nu_pow[3]);
    d_evals[9] = g1::group_exponentiation_inner(instance.S_ID, nu_pow[4]);
    d_evals[10] = g1::group_exponentiation_inner(instance.SIGMA_1, nu_pow[5]);
    d_evals[11] = g1::group_exponentiation_inner(instance.SIGMA_2, nu_pow[6]);
    d_evals[12] = g1::group_exponentiation_inner(instance.SIGMA_3, nu_pow[7]);

    g1::element F;
    g1::add(d_evals[0], d_evals[1], F);
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
    fr::mul(T8, proof.z_2_shifted_eval, T8);
    fr::mul(nu_pow[9], u, T9);
    fr::mul(T9, proof.z_2_shifted_eval, T9);
    fr::add(T0, T1, batch_evaluation);
    fr::add(batch_evaluation, T2, batch_evaluation);
    fr::add(batch_evaluation, T3, batch_evaluation);
    fr::add(batch_evaluation, T4, batch_evaluation);
    fr::add(batch_evaluation, T5, batch_evaluation);
    fr::add(batch_evaluation, T6, batch_evaluation);
    fr::add(batch_evaluation, T7, batch_evaluation);
    fr::add(batch_evaluation, T8, batch_evaluation);
    fr::add(batch_evaluation, T9, batch_evaluation);

    g1::element E = g1::group_exponentiation_inner(g1::affine_one(), batch_evaluation);

    g1::element TEMP_1;
    g1::element TEMP_2;
    g1::element LHS;
    g1::element RHS;

    fr::field_t z_omega_scalar;
    fr::mul(z, domain.root, z_omega_scalar);
    fr::mul(z_omega_scalar, u, z_omega_scalar);
    TEMP_1 = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, z_omega_scalar);
    TEMP_2 = g1::group_exponentiation_inner(proof.PI_Z, z);
    g1::neg(E, E);
    g1::add(F, E, RHS);
    g1::add(RHS, TEMP_1, RHS);
    g1::add(RHS, TEMP_2, RHS);

    LHS = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, u);
    g1::copy_from_affine(proof.PI_Z, TEMP_1);
    g1::add(LHS, TEMP_1, LHS);
    g1::neg(LHS, LHS);

    g1::affine_element P[2];
    g2::affine_element Q[2];

    g1::copy_to_affine(LHS, P[0]);
    g1::copy_to_affine(RHS, P[1]);

    Q[0] = g2::affine_one();
    g2::copy_affine(SRS_T2, Q[1]);

    fq12::fq12_t result = pairing::reduced_ate_pairing_batch(P, Q, 2);

    return fq12::iszero(result);
}
} // namespace verifier
} // namespace waffle