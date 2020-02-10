#pragma once

#include "./turbo_arithmetic_widget.hpp"

namespace waffle {
class VerifierTurboFixedBaseWidget : public VerifierTurboArithmeticWidget {
  public:
    VerifierTurboFixedBaseWidget();

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        verification_key*,
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars) override;

    barretenberg::fr::field_t compute_batch_evaluation_contribution(verification_key*,
                                                                    barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript&) override;

    barretenberg::fr::field_t compute_quotient_evaluation_contribution(verification_key*,
                                                                       const barretenberg::fr::field_t&,
                                                                       const transcript::Transcript& transcript,
                                                                       barretenberg::fr::field_t&) override;
};

class ProverTurboFixedBaseWidget : public ProverTurboArithmeticWidget {
  public:
    ProverTurboFixedBaseWidget(proving_key* input_key, program_witness* input_witness);
    ProverTurboFixedBaseWidget(const ProverTurboFixedBaseWidget& other);
    ProverTurboFixedBaseWidget(ProverTurboFixedBaseWidget&& other);
    ProverTurboFixedBaseWidget& operator=(const ProverTurboFixedBaseWidget& other);
    ProverTurboFixedBaseWidget& operator=(ProverTurboFixedBaseWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          barretenberg::polynomial& r);
    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript&,
                                                                barretenberg::fr::field_t*,
                                                                barretenberg::fr::field_t*);

    void compute_transcript_elements(transcript::Transcript& transcript);

    barretenberg::polynomial& q_ecc_1;
    barretenberg::polynomial& q_ecc_1_fft;
};
} // namespace waffle
