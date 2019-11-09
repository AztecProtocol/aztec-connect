#ifndef SEQUENTIAL_WIDGET_HPP
#define SEQUENTIAL_WIDGET_HPP

#include "./base_widget.hpp"

namespace waffle
{
class VerifierSequentialWidget : public VerifierBaseWidget
{
public:
    VerifierSequentialWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments);
    ~VerifierSequentialWidget() {};

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients &challenge,
        const waffle::plonk_proof &proof,
        std::vector<barretenberg::g1::affine_element> &points,
        std::vector<barretenberg::fr::field_t> &scalars
    );
    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t&, barretenberg::fr::field_t &nu_base, barretenberg::fr::field_t &, const plonk_proof&)
    {
        return nu_base;
    };
};

class ProverSequentialWidget : public ProverBaseWidget
{
public:

    ProverSequentialWidget(const size_t n);
    ProverSequentialWidget(const ProverSequentialWidget &other);
    ProverSequentialWidget(ProverSequentialWidget &&other);
    ProverSequentialWidget& operator=(const ProverSequentialWidget &other);
    ProverSequentialWidget& operator=(ProverSequentialWidget &&other);
    ~ProverSequentialWidget() {};

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t& alpha_step, CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t &, const waffle::plonk_proof &proof, const barretenberg::evaluation_domain& domain, barretenberg::polynomial &r);
    barretenberg::fr::field_t compute_opening_poly_contribution(barretenberg::fr::field_t*, const barretenberg::evaluation_domain &, const barretenberg::fr::field_t &nu_base, const barretenberg::fr::field_t &)
    {
        return nu_base;
    }

    
    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain &domain, const ReferenceString &reference_string) const;
    void compute_proof_elements(plonk_proof&, const barretenberg::fr::field_t&) {};
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_o_next;
};
}


#endif