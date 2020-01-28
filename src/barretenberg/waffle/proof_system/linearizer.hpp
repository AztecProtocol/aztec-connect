#pragma once

#include "../../types.hpp"
#include "../../curves/bn254/fr.hpp"

#include "../waffle_types.hpp"

namespace waffle
{
    struct plonk_linear_terms
    {
        barretenberg::fr::field_t z_1;
        barretenberg::fr::field_t sigma_last;
    };

    // This linearisation trick was originated from Mary Maller and the SONIC paper. When computing Kate commitments to the PLONK polynomials, we wish to find the minimum number of polynomial evaluations that the
    // prover must send to the verifier. I.e. we want to find the minimum number of polynomial evaluations that are needed, so that the remaining
    // polynomial evaluations can be expressed as a linear sum of polynomials. The verifier can derive the prover's commitment to this linear polynomial
    // from the original commitments - the prover can provide an evaluation of this linear polynomial, instead of the evaluations of its consitutent polynomials.
    // This shaves 6 field elements off of the proof size!
    template <typename program_settings>
    inline plonk_linear_terms compute_linear_terms(const transcript::Transcript& transcript, const barretenberg::fr::field_t& l_1)
    {
        barretenberg::fr::field_t alpha = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);
        barretenberg::fr::field_t alpha_cubed = barretenberg::fr::mul(barretenberg::fr::sqr(alpha), alpha);
        barretenberg::fr::field_t beta = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("beta")[0]);
        barretenberg::fr::field_t gamma = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("gamma")[0]);
        barretenberg::fr::field_t z = barretenberg::fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
        barretenberg::fr::field_t z_beta = barretenberg::fr::mul(z, beta);

        std::array<barretenberg::fr::field_t, program_settings::program_width> wire_evaluations;
        for (size_t i = 0; i < program_settings::program_width; ++i)
        {
            wire_evaluations[i] = barretenberg::fr::serialize_from_buffer(&transcript.get_element("w_" + std::to_string(i + 1))[0]);
        }

        barretenberg::fr::field_t z_1_shifted_eval = barretenberg::fr::serialize_from_buffer(&transcript.get_element("z_omega")[0]);

        plonk_linear_terms result;

        barretenberg::fr::field_t T0;
        barretenberg::fr::field_t z_contribution = barretenberg::fr::one;
        for (size_t i = 0; i < program_settings::program_width; ++i)
        {
            barretenberg::fr::field_t coset_generator = (i == 0) ? barretenberg::fr::one : barretenberg::fr::coset_generators[i - 1];
            barretenberg::fr::__mul(z_beta, coset_generator, T0);
            barretenberg::fr::__add(T0, wire_evaluations[i], T0);
            barretenberg::fr::__add(T0, gamma, T0);
            barretenberg::fr::__mul(z_contribution, T0, z_contribution);
        }
        barretenberg::fr::__mul(z_contribution, alpha, result.z_1);
        barretenberg::fr::__mul(l_1, alpha_cubed, T0);
        barretenberg::fr::__add(result.z_1, T0, result.z_1);

        barretenberg::fr::field_t sigma_contribution = barretenberg::fr::one;
        for (size_t i = 0; i < program_settings::program_width - 1; ++i)
        {
            barretenberg::fr::field_t permutation_evaluation = barretenberg::fr::serialize_from_buffer(&transcript.get_element("sigma_" + std::to_string(i + 1))[0]);
            barretenberg::fr::__mul(permutation_evaluation, beta, T0);
            barretenberg::fr::__add(T0, wire_evaluations[i], T0);
            barretenberg::fr::__add(T0, gamma, T0);
            barretenberg::fr::__mul(sigma_contribution, T0, sigma_contribution);
        }
        barretenberg::fr::__mul(sigma_contribution, z_1_shifted_eval, sigma_contribution);
        barretenberg::fr::__mul(sigma_contribution, alpha, result.sigma_last);
        barretenberg::fr::__neg(result.sigma_last, result.sigma_last);
        barretenberg::fr::__mul(result.sigma_last, beta, result.sigma_last);

        return result;
    }
}