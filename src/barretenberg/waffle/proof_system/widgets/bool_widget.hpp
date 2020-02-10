#pragma once

#include "./base_widget.hpp"

namespace waffle {
/**
 * ProverBoolWidget : constraint that constrains left and right wire values to be booleans
 *
 **/

class VerifierBoolWidget : public VerifierBaseWidget {
  public:
    VerifierBoolWidget();

    barretenberg::fr::field_t compute_quotient_evaluation_contribution(verification_key*,
                                                                       const barretenberg::fr::field_t&,
                                                                       const transcript::Transcript&,
                                                                       barretenberg::fr::field_t&) override;

    barretenberg::fr::field_t compute_batch_evaluation_contribution(verification_key*,
                                                                    barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript&) override;

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        verification_key* key,
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars) override;
};

class ProverBoolWidget : public ProverBaseWidget {
  public:
    ProverBoolWidget(proving_key* input_key, program_witness* input_witness);
    ProverBoolWidget(const ProverBoolWidget& other);
    ProverBoolWidget(ProverBoolWidget&& other);
    ProverBoolWidget& operator=(const ProverBoolWidget& other);
    ProverBoolWidget& operator=(ProverBoolWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          barretenberg::polynomial& r);

    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript&,
                                                                barretenberg::fr::field_t*,
                                                                barretenberg::fr::field_t*);

    barretenberg::polynomial& q_bl;
    barretenberg::polynomial& q_br;
    barretenberg::polynomial& q_bo;

    barretenberg::polynomial& q_bl_fft;
    barretenberg::polynomial& q_br_fft;
    barretenberg::polynomial& q_bo_fft;
};
} // namespace waffle
