#pragma once

#include "./base_widget.hpp"

namespace waffle {
class VerifierSequentialWidget : public VerifierBaseWidget {
  public:
    VerifierSequentialWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments);

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients& challenge,
        const waffle::transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars);

    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t&,
                                                                    const barretenberg::fr::field_t& nu_base,
                                                                    const waffle::transcript::Transcript&)
    {
        return nu_base;
    };
};

class ProverSequentialWidget : public ProverBaseWidget {
  public:
    ProverSequentialWidget(const size_t n);
    ProverSequentialWidget(const ProverSequentialWidget& other);
    ProverSequentialWidget(ProverSequentialWidget&& other);
    ProverSequentialWidget& operator=(const ProverSequentialWidget& other);
    ProverSequentialWidget& operator=(ProverSequentialWidget&& other);

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const waffle::transcript::Transcript& transcript,
                                                            CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                          const waffle::transcript::Transcript& transcript,
                                                          const barretenberg::evaluation_domain& domain,
                                                          barretenberg::polynomial& r);

    barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                const waffle::transcript::Transcript&,
                                                                barretenberg::fr::field_t*,
                                                                const barretenberg::evaluation_domain&)
    {
        return nu_base;
    }

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain& domain,
                                                                         const ReferenceString& reference_string) const;
    void compute_proof_elements(plonk_proof&, const barretenberg::fr::field_t&){};
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_o_next;
};
} // namespace waffle