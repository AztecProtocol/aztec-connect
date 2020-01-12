#pragma once

#include "./base_widget.hpp"

namespace waffle {
/**
 * ProverBoolWidget : gate that constrains left and right wire values to be booleans
 *
 **/

class VerifierBoolWidget : public VerifierBaseWidget {
  public:
    VerifierBoolWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments);

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

class ProverBoolWidget : public ProverBaseWidget {
  public:
    ProverBoolWidget(const size_t n);
    ProverBoolWidget(const ProverBoolWidget& other);
    ProverBoolWidget(ProverBoolWidget&& other);
    ProverBoolWidget& operator=(const ProverBoolWidget& other);
    ProverBoolWidget& operator=(ProverBoolWidget&& other);

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
                                                                const barretenberg::evaluation_domain&)
    {
        return nu_base;
    }

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain& domain,
                                                                         const ReferenceString& reference_string) const;
    void compute_proof_elements(plonk_proof& proof, const barretenberg::fr::field_t& z);
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_bl;
    barretenberg::polynomial q_br;
    barretenberg::polynomial q_bo;
    size_t n;
};
} // namespace waffle
