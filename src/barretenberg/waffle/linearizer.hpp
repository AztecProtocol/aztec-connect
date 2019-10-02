#ifndef LINEARIZER
#define LINEARIZER

#include "../fields/fr.hpp"

#include "../types.hpp"

namespace waffle
{
    using namespace barretenberg;
    struct plonk_linear_terms
    {
        fr::field_t w_l;
        fr::field_t w_r;
        fr::field_t w_o;
        fr::field_t z_1;
        fr::field_t z_2;
        fr::field_t q_m;
        fr::field_t q_l;
        fr::field_t q_r;
        fr::field_t q_o;
        fr::field_t q_c;
        fr::field_t sigma_1;
        fr::field_t sigma_2;
        fr::field_t sigma_3;
    };

    // This linearisation trick was originated from Mary Maller and the SONIC paper. When computing Kate commitments to the PLONK polynomials, we wish to find the minimum number of polynomial evaluations that the
    // prover must send to the verifier. I.e. we want to find the minimum number of polynomial evaluations that are needed, so that the remaining
    // polynomial evaluations can be expressed as a linear sum of polynomials. The verifier can derive the prover's commitment to this linear polynomial
    // from the original commitments - the prover can provide an evaluation of this linear polynomial, instead of the evaluations of its consitutent polynomials.
    // This shaves 6 field elements off of the proof size!
    inline plonk_linear_terms compute_linear_terms(const plonk_proof& proof, const plonk_challenges& challenges, const fr::field_t& l_1, const size_t)
    {
        plonk_linear_terms result;
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;

        // fr::field_t beta_n = {.data = {n, 0, 0, 0}};
        // fr::to_montgomery_form(beta_n, beta_n);
        // fr::__mul(beta_n, challenges.beta, beta_n);
        // fr::field_t beta_n_2;
        // fr::__add(beta_n, beta_n, beta_n_2);


        fr::field_t right_shift = fr::multiplicative_generator();
        fr::field_t output_shift = fr::multiplicative_generator();
        fr::__add(output_shift, fr::one(), output_shift);
        fr::__add(output_shift, fr::one(), output_shift);
        fr::field_t alpha_pow[6];
        fr::copy(challenges.alpha, alpha_pow[0]);
        for (size_t i = 1; i < 6; ++i)
        {
            fr::__mul(alpha_pow[i-1], alpha_pow[0], alpha_pow[i]);
        }

        fr::__mul(challenges.z, challenges.beta, T0);
        fr::__add(T0, proof.w_l_eval, T0);
        fr::__add(T0, challenges.gamma, T0);

        fr::__mul(challenges.z, challenges.beta, T1);
        fr::__mul(T1, right_shift, T1);
        fr::__add(T1, proof.w_r_eval, T1);
        fr::__add(T1, challenges.gamma, T1);

        fr::__mul(challenges.z, challenges.beta, T2);
        fr::__mul(T2, output_shift, T2);
        fr::__add(T2, proof.w_o_eval, T2);
        fr::__add(T2, challenges.gamma, T2);

        fr::__mul(T2, T1, T1);
        fr::__mul(T1, T0, T0);
        fr::__mul(T0, alpha_pow[1], result.z_1);

        fr::__mul(proof.sigma_1_eval, challenges.beta, T0);
        fr::__add(T0, proof.w_l_eval, T0);
        fr::__add(T0, challenges.gamma, T0);

        fr::__mul(proof.sigma_2_eval, challenges.beta, T1);
        fr::__add(T1, proof.w_r_eval, T1);
        fr::__add(T1, challenges.gamma, T1);

        fr::__mul(proof.sigma_3_eval, challenges.beta, T2);
        fr::__add(T2, proof.w_o_eval, T2);
        fr::__add(T2, challenges.gamma, T2);

        fr::__mul(T2, T1, T1);
        fr::__mul(T1, T0, T0);
        fr::__mul(T0, alpha_pow[2], result.z_2);


        fr::__mul(l_1, alpha_pow[4], T0);
        fr::__add(result.z_1, T0, result.z_1);
        fr::__mul(l_1, alpha_pow[5], T0);
        fr::__add(result.z_2, T0, result.z_2);

        fr::__mul(proof.w_o_eval, alpha_pow[0], result.q_o);
        fr::__mul(proof.w_r_eval, alpha_pow[0], result.q_r);
        fr::__mul(proof.w_l_eval, alpha_pow[0], result.q_l);

        fr::__mul(proof.w_l_eval, proof.w_r_eval, result.q_m);
        fr::__mul(result.q_m, alpha_pow[0], result.q_m);

        fr::copy(challenges.alpha, result.q_c);

        return result;
    }
}

#endif