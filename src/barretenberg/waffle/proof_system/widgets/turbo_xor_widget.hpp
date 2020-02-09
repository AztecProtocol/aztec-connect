#pragma once

#include "./base_widget.hpp"

namespace waffle {
class VerifierTurboXorWidget : public VerifierBaseWidget {
  public:
    VerifierTurboXorWidget();

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        verification_key* key,
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars);

    barretenberg::fr::field_t compute_batch_evaluation_contribution(verification_key*, barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript&);

    barretenberg::fr::field_t compute_quotient_evaluation_contribution(verification_key*, const barretenberg::fr::field_t&, const transcript::Transcript& transcript, barretenberg::fr::field_t&, const barretenberg::evaluation_domain& );
};

class ProverTurboXorWidget : public ProverBaseWidget {
  public:
    ProverTurboXorWidget(proving_key* input_key, program_witness* input_witness);
    ProverTurboXorWidget(const ProverTurboXorWidget& other);
    ProverTurboXorWidget(ProverTurboXorWidget&& other);
    ProverTurboXorWidget& operator=(const ProverTurboXorWidget& other);
    ProverTurboXorWidget& operator=(ProverTurboXorWidget&& other);

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

    barretenberg::polynomial& q_xor;
    barretenberg::polynomial& q_xor_fft;

};
} // namespace waffle
