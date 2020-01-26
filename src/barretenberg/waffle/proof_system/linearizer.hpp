#pragma once

#include "../../types.hpp"
#include "../../curves/bn254/fr.hpp"

#include "../waffle_types.hpp"

namespace waffle
{
    struct plonk_linear_terms
    {
        barretenberg::fr::field_t w_l;
        barretenberg::fr::field_t w_r;
        barretenberg::fr::field_t w_o;
        barretenberg::fr::field_t z_1;
        barretenberg::fr::field_t q_m;
        barretenberg::fr::field_t q_l;
        barretenberg::fr::field_t q_r;
        barretenberg::fr::field_t q_o;
        barretenberg::fr::field_t q_c;
        barretenberg::fr::field_t sigma_3;
    };

    // This linearisation trick was originated from Mary Maller and the SONIC paper. When computing Kate commitments to the PLONK polynomials, we wish to find the minimum number of polynomial evaluations that the
    // prover must send to the verifier. I.e. we want to find the minimum number of polynomial evaluations that are needed, so that the remaining
    // polynomial evaluations can be expressed as a linear sum of polynomials. The verifier can derive the prover's commitment to this linear polynomial
    // from the original commitments - the prover can provide an evaluation of this linear polynomial, instead of the evaluations of its consitutent polynomials.
    // This shaves 6 field elements off of the proof size!
    inline plonk_linear_terms compute_linear_terms(const transcript::Transcript& transcript, const barretenberg::fr::field_t& l_1)
    {
        barretenberg::fr::field_t alpha = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);
        barretenberg::fr::field_t beta = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("beta")[0]);
        barretenberg::fr::field_t gamma = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("gamma")[0]);
        barretenberg::fr::field_t z = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
        barretenberg::fr::field_t w_l_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
        barretenberg::fr::field_t w_r_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
        barretenberg::fr::field_t w_o_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
        barretenberg::fr::field_t z_1_shifted_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("z_omega")[0]);
        barretenberg::fr::field_t sigma_1_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("sigma_1")[0]);
        barretenberg::fr::field_t sigma_2_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("sigma_2")[0]);

        plonk_linear_terms result;
        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t T1;
        barretenberg::fr::field_t T2;

        barretenberg::fr::field_t right_shift = barretenberg::fr::multiplicative_generator;
        barretenberg::fr::field_t output_shift = barretenberg::fr::alternate_multiplicative_generator;

        barretenberg::fr::field_t alpha_pow[6];
        barretenberg::fr::__copy(alpha, alpha_pow[0]);

        barretenberg::fr::field_t z_beta = barretenberg::fr::mul(z, beta);
        for (size_t i = 1; i < 6; ++i)
        {
            barretenberg::fr::__mul(alpha_pow[i-1], alpha_pow[0], alpha_pow[i]);
        }

        barretenberg::fr::__add(z_beta, w_l_eval, T0);
        barretenberg::fr::__add(T0, gamma, T0);

        barretenberg::fr::__mul(z_beta, right_shift, T1);
        barretenberg::fr::__add(T1, w_r_eval, T1);
        barretenberg::fr::__add(T1, gamma, T1);

        barretenberg::fr::__mul(z_beta, output_shift, T2);
        barretenberg::fr::__add(T2, w_o_eval, T2);
        barretenberg::fr::__add(T2, gamma, T2);

        barretenberg::fr::__mul(T2, T1, T1);
        barretenberg::fr::__mul(T1, T0, T0);
        barretenberg::fr::__mul(T0, alpha_pow[0], result.z_1);

        barretenberg::fr::__mul(sigma_1_eval, beta, T0);
        barretenberg::fr::__add(T0, w_l_eval, T0);
        barretenberg::fr::__add(T0, gamma, T0);

        barretenberg::fr::__mul(sigma_2_eval, beta, T1);
        barretenberg::fr::__add(T1, w_r_eval, T1);
        barretenberg::fr::__add(T1, gamma, T1);


        barretenberg::fr::__mul(T1, T0, T0);
        barretenberg::fr::__mul(T0, z_1_shifted_eval, T0);
        barretenberg::fr::__mul(T0, alpha_pow[0], result.sigma_3);
        barretenberg::fr::__neg(result.sigma_3, result.sigma_3);
        barretenberg::fr::__mul(result.sigma_3, beta, result.sigma_3);

        barretenberg::fr::__mul(l_1, alpha_pow[2], T0);
        barretenberg::fr::__add(result.z_1, T0, result.z_1);

        return result;
    }
}