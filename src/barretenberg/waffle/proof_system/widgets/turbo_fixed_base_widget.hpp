#pragma once

#include "./turbo_arithmetic_widget.hpp"

namespace waffle {
class VerifierTurboFixedBaseWidget : public VerifierTurboArithmeticWidget {
  public:
    VerifierTurboFixedBaseWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments);

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars);

    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript&);

    barretenberg::fr::field_t compute_quotient_evaluation_contribution(const barretenberg::fr::field_t&, const transcript::Transcript& transcript, barretenberg::fr::field_t&);
};

class ProverTurboFixedBaseWidget : public ProverTurboArithmeticWidget {
  public:
    ProverTurboFixedBaseWidget(const size_t n);
    ProverTurboFixedBaseWidget(const ProverTurboFixedBaseWidget& other);
    ProverTurboFixedBaseWidget(ProverTurboFixedBaseWidget&& other);
    ProverTurboFixedBaseWidget& operator=(const ProverTurboFixedBaseWidget& other);
    ProverTurboFixedBaseWidget& operator=(ProverTurboFixedBaseWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript,
                                                            CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          const barretenberg::evaluation_domain& domain,
                                                          barretenberg::polynomial& r);
    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript&,
                                                                barretenberg::fr::field_t*,
                                                                barretenberg::fr::field_t*,
                                                                const barretenberg::evaluation_domain&);

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain& domain,
                                                                         const ReferenceString& reference_string) const;

    void compute_transcript_elements(transcript::Transcript& transcript, const barretenberg::evaluation_domain&);

    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_ecc_1;

};
} // namespace waffle
