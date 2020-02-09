#pragma once

#include "./arithmetic_widget.hpp"
#include "./base_widget.hpp"

namespace waffle {

class VerifierMiMCWidget : public VerifierBaseWidget {
  public:
    VerifierMiMCWidget();

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        verification_key*,
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars) override;

    barretenberg::fr::field_t compute_batch_evaluation_contribution(verification_key*,
                                                                    barretenberg::fr::field_t& batch_eval,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript& transcript) override;
};

class ProverMiMCWidget : public ProverBaseWidget {
  public:
    ProverMiMCWidget(proving_key* key, program_witness* witness);
    ProverMiMCWidget(const ProverMiMCWidget& other);
    ProverMiMCWidget(ProverMiMCWidget&& other);
    ProverMiMCWidget& operator=(const ProverMiMCWidget& other);
    ProverMiMCWidget& operator=(ProverMiMCWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          barretenberg::polynomial& r);
    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript& transcript,
                                                                barretenberg::fr::field_t* poly,
                                                                barretenberg::fr::field_t*);
    void compute_transcript_elements(transcript::Transcript& transcript);

    barretenberg::polynomial& q_mimc_selector;
    barretenberg::polynomial& q_mimc_coefficient;

    barretenberg::polynomial& q_mimc_selector_fft;
    barretenberg::polynomial& q_mimc_coefficient_fft;
};
} // namespace waffle
