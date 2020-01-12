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
    ProverMiMCWidget(const size_t n);
    ProverMiMCWidget(const ProverMiMCWidget& other);
    ProverMiMCWidget(ProverMiMCWidget&& other);
    ProverMiMCWidget& operator=(const ProverMiMCWidget& other);
    ProverMiMCWidget& operator=(ProverMiMCWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript,
                                                            CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          const barretenberg::evaluation_domain& domain,
                                                          barretenberg::polynomial& r);
    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript& transcript,
                                                                barretenberg::fr::field_t* poly,
                                                                const barretenberg::evaluation_domain& domain);
    void compute_transcript_elements(transcript::Transcript& transcript);

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain& domain,
                                                                         const ReferenceString& reference_string) const;
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_mimc_selector;
    barretenberg::polynomial q_mimc_coefficient;

    size_t n;
};
} // namespace waffle
