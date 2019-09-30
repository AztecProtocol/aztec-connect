#ifndef VERIFIER
#define VERIFIER

#include "./waffle.hpp"
#include "./challenge.hpp"
#include <barretenberg/fields/fq12.hpp>
#include <barretenberg/groups/pairing.hpp>
#include <barretenberg/polynomials/polynomials.hpp>
#include "linearizer.hpp"

#include "../types.hpp"
namespace waffle
{
using namespace barretenberg;
namespace verifier
{

bool verify_proof(const waffle::plonk_proof &proof, const waffle::circuit_instance &instance, const g2::affine_element &SRS_T2)
{
    polynomials::evaluation_domain domain = polynomials::get_domain(instance.n);
    // TODO: validate everything is in the correct field/group

    // reconstruct challenges
    plonk_challenges challenges;
    fr::field_t alpha_pow[6];
    fr::field_t nu_pow[11];
    challenges.alpha = compute_alpha(proof);
    challenges.gamma = compute_gamma(proof);
    challenges.beta = compute_beta(proof, challenges.gamma);
    challenges.z = compute_evaluation_challenge(proof);
    fr::field_t u = fr::random_element();
    fr::copy(challenges.alpha, alpha_pow[0]);
    polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(challenges.z, domain);

    // compute the terms we need to derive R(X)
    plonk_linear_terms linear_terms = compute_linear_terms(proof, challenges, lagrange_evals.l_1, instance.n);

    // reconstruct evaluation of quotient polynomial from prover messages
    fr::field_t t_eval;
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    for (size_t i = 1; i < 6; ++i)
    {
        fr::mul(alpha_pow[i - 1], alpha_pow[0], alpha_pow[i]);
    }

    fr::mul(lagrange_evals.l_n_minus_1, alpha_pow[3], T0);

    fr::sub(proof.z_1_shifted_eval, proof.z_2_shifted_eval, T1);
    fr::mul(T0, T1, T0);

    fr::mul(proof.z_1_shifted_eval, alpha_pow[1], T1);
    fr::mul(proof.z_2_shifted_eval, alpha_pow[2], T2);
    fr::add(T1, T2, T1);
    fr::sub(T0, T1, T0);

    fr::add(alpha_pow[4], alpha_pow[5], T2);
    fr::mul(T2, lagrange_evals.l_1, T2);
    fr::sub(T0, T2, T0);
    fr::add(T0, proof.linear_eval, t_eval);
    fr::invert(lagrange_evals.vanishing_poly, T0);
    fr::mul(t_eval, T0, t_eval);
    fr::field_t z_pow_n;
    fr::field_t z_pow_2n;
    fr::pow_small(challenges.z, instance.n, z_pow_n);
    fr::pow_small(challenges.z, instance.n * 2, z_pow_2n);
    fr::mul(proof.t_mid_eval, z_pow_n, T0);
    fr::mul(proof.t_hi_eval, z_pow_2n, T1);
    fr::sub(t_eval, T0, t_eval);
    fr::sub(t_eval, T1, t_eval);

    challenges.nu = compute_linearisation_challenge(proof, t_eval);
    fr::copy(challenges.nu, nu_pow[0]);
    for (size_t i = 1; i < 11; ++i)
    {
        fr::mul(nu_pow[i - 1], nu_pow[0], nu_pow[i]);
    }

    // reconstruct Kate opening commitments from committed values
    fr::mul(linear_terms.q_m, nu_pow[2], linear_terms.q_m);
    fr::mul(linear_terms.q_l, nu_pow[2], linear_terms.q_l);
    fr::mul(linear_terms.q_r, nu_pow[2], linear_terms.q_r);
    fr::mul(linear_terms.q_o, nu_pow[2], linear_terms.q_o);
    fr::mul(linear_terms.q_c, nu_pow[2], linear_terms.q_c);
    fr::mul(linear_terms.z_1, nu_pow[2], linear_terms.z_1);
    fr::mul(linear_terms.z_2, nu_pow[2], linear_terms.z_2);

    fr::mul(nu_pow[9], u, T0);
    fr::add(linear_terms.z_1, T0, linear_terms.z_1);
    fr::mul(nu_pow[10], u, T0);
    fr::add(linear_terms.z_2, T0, linear_terms.z_2);

    fr::field_t batch_evaluation;
    fr::copy(t_eval, batch_evaluation);
    fr::mul(nu_pow[2], proof.linear_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[3], proof.w_l_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[4], proof.w_r_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[5], proof.w_o_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[6], proof.sigma_1_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[7], proof.sigma_2_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[8], proof.sigma_3_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[9], u, T0);
    fr::mul(T0, proof.z_1_shifted_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[10], u, T0);
    fr::mul(T0, proof.z_2_shifted_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[0], proof.t_mid_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::mul(nu_pow[1], proof.t_hi_eval, T0);
    fr::add(batch_evaluation, T0, batch_evaluation);

    fr::neg(batch_evaluation, batch_evaluation);

    fr::field_t z_omega_scalar;
    fr::mul(challenges.z, domain.root, z_omega_scalar);
    fr::mul(z_omega_scalar, u, z_omega_scalar);

    // TODO: make a wrapper around g1 ops so...this guff isn't needed each time we want to do a scalar mul
    fr::field_t *scalar_exponents = (fr::field_t *)aligned_alloc(32, sizeof(fr::field_t) * 18);
    fr::copy(linear_terms.q_m, scalar_exponents[0]);
    fr::copy(linear_terms.q_l, scalar_exponents[1]);
    fr::copy(linear_terms.q_r, scalar_exponents[2]);
    fr::copy(linear_terms.q_o, scalar_exponents[3]);
    fr::copy(linear_terms.q_c, scalar_exponents[4]);
    fr::copy(linear_terms.z_1, scalar_exponents[5]);
    fr::copy(linear_terms.z_2, scalar_exponents[6]);
    fr::copy(nu_pow[3], scalar_exponents[7]);
    fr::copy(nu_pow[4], scalar_exponents[8]);
    fr::copy(nu_pow[5], scalar_exponents[9]);
    fr::copy(nu_pow[6], scalar_exponents[10]);
    fr::copy(nu_pow[7], scalar_exponents[11]);
    fr::copy(nu_pow[8], scalar_exponents[12]);
    fr::copy(batch_evaluation, scalar_exponents[13]);
    fr::copy(z_omega_scalar, scalar_exponents[14]);
    fr::copy(challenges.z, scalar_exponents[15]);
    fr::copy(nu_pow[0], scalar_exponents[16]);
    fr::copy(nu_pow[1], scalar_exponents[17]);

    g1::affine_element *lhs_ge = (g1::affine_element *)aligned_alloc(32, sizeof(g1::affine_element) * 38);

    g1::copy_affine(instance.Q_M, lhs_ge[0]);
    g1::copy_affine(instance.Q_L, lhs_ge[1]);
    g1::copy_affine(instance.Q_R, lhs_ge[2]);
    g1::copy_affine(instance.Q_O, lhs_ge[3]);
    g1::copy_affine(instance.Q_C, lhs_ge[4]);
    g1::copy_affine(proof.Z_1, lhs_ge[5]);
    g1::copy_affine(proof.Z_2, lhs_ge[6]);
    g1::copy_affine(proof.W_L, lhs_ge[7]);
    g1::copy_affine(proof.W_R, lhs_ge[8]);
    g1::copy_affine(proof.W_O, lhs_ge[9]);
    g1::copy_affine(instance.SIGMA_1, lhs_ge[10]);
    g1::copy_affine(instance.SIGMA_2, lhs_ge[11]);
    g1::copy_affine(instance.SIGMA_3, lhs_ge[12]);
    g1::copy_affine(g1::affine_one(), lhs_ge[13]);
    g1::copy_affine(proof.PI_Z_OMEGA, lhs_ge[14]);
    g1::copy_affine(proof.PI_Z, lhs_ge[15]);
    g1::copy_affine(proof.T_MID, lhs_ge[16]);
    g1::copy_affine(proof.T_HI, lhs_ge[17]);

    scalar_multiplication::generate_pippenger_point_table(lhs_ge, lhs_ge, 18);
    g1::element P[2];
    P[1] = scalar_multiplication::pippenger(scalar_exponents, lhs_ge, 18);
    P[0] = g1::group_exponentiation_inner(proof.PI_Z_OMEGA, u);
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

    free(lhs_ge);
    free(scalar_exponents);
    return fq12::eq(result, fq12::one()); // wheeee
}
} // namespace verifier
} // namespace waffle

#endif