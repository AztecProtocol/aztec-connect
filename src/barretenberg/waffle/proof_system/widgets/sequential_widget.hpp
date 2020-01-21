#pragma once

#include "./base_widget.hpp"

namespace waffle {
class VerifierSequentialWidget : public VerifierBaseWidget {
  public:
    VerifierSequentialWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments);

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars);

    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const transcript::Transcript&)
    {
        return nu_base;
    };
};

class ProverSequentialWidget : public ProverBaseWidget {
  public:
    ProverSequentialWidget(proving_key* input_key, program_witness* input_witness);
    ProverSequentialWidget(const ProverSequentialWidget& other);
    ProverSequentialWidget(ProverSequentialWidget&& other);
    ProverSequentialWidget& operator=(const ProverSequentialWidget& other);
    ProverSequentialWidget& operator=(ProverSequentialWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript,
                                                            CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          barretenberg::polynomial& r);

    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const transcript::Transcript&,
                                                                barretenberg::fr::field_t*,
                                                                barretenberg::fr::field_t*)
    {
        return nu_base;
    }

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const ReferenceString& reference_string) const;

    void reset();

    barretenberg::polynomial& q_3_next;

    barretenberg::polynomial& q_3_next_fft;

};
} // namespace waffle