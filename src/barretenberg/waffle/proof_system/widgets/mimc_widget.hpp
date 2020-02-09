#pragma once

#include "./arithmetic_widget.hpp"
#include "./base_widget.hpp"
namespace waffle {

class VerifierMiMCWidget : public VerifierBaseWidget {
  public:
    VerifierMiMCWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments);

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars);

    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t& batch_eval,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript& transcript);
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

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const ReferenceString& reference_string) const;

    barretenberg::polynomial& q_mimc_selector;
    barretenberg::polynomial& q_mimc_coefficient;

    barretenberg::polynomial& q_mimc_selector_fft;
    barretenberg::polynomial& q_mimc_coefficient_fft;
};
} // namespace waffle
