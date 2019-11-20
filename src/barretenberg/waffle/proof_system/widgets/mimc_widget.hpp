#ifndef MIMC_WIDGET_HPP
#define MIMC_WIDGET_HPP

#include "./base_widget.hpp"
#include "./arithmetic_widget.hpp"

namespace waffle
{
    
class VerifierMiMCWidget : public VerifierBaseWidget
{
public:
    VerifierMiMCWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments);
    ~VerifierMiMCWidget() {};

    VerifierBaseWidget::challenge_coefficients append_scalar_multiplication_inputs(
        const challenge_coefficients &challenge,
        const waffle::plonk_proof &proof,
        std::vector<barretenberg::g1::affine_element> &points,
        std::vector<barretenberg::fr::field_t> &scalars
    );

    barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t &batch_eval, barretenberg::fr::field_t &nu_base, barretenberg::fr::field_t &nu_step, const plonk_proof &proof);
    void compute_quotient_evaluation_contribution(barretenberg::fr::field_t &t, const plonk_proof &proof, const plonk_challenges &challenges);
};

class ProverMiMCWidget : public ProverBaseWidget
{
public:

    ProverMiMCWidget(const size_t n);
    ProverMiMCWidget(const ProverMiMCWidget &other);
    ProverMiMCWidget(ProverMiMCWidget &&other);
    ProverMiMCWidget& operator=(const ProverMiMCWidget &other);
    ProverMiMCWidget& operator=(ProverMiMCWidget &&other);
    ~ProverMiMCWidget() {};

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t& alpha_step, CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t &, const waffle::plonk_proof &proof, const barretenberg::evaluation_domain& domain, barretenberg::polynomial &r);
    barretenberg::fr::field_t compute_opening_poly_contribution(barretenberg::fr::field_t* poly, const barretenberg::evaluation_domain &domain, const barretenberg::fr::field_t &nu_base, const barretenberg::fr::field_t &nu_step);

    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain &domain, const ReferenceString &reference_string) const;
    void compute_proof_elements(plonk_proof &proof, const barretenberg::fr::field_t &z);
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_mimc_selector;
    barretenberg::polynomial q_mimc_coefficient;

    size_t n;
};


}
#endif