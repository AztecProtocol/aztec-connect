#ifndef ARITHMETIC_WIDGET_HPP
#define ARITHMETIC_WIDGET_HPP

#include "./base_widget.hpp"

namespace waffle
{
    
class VerifierArithmeticWidget : public VerifierBaseWidget
{
public:
    VerifierArithmeticWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments);
    ~VerifierArithmeticWidget() {};

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

class ProverArithmeticWidget : public ProverBaseWidget
{
public:

    ProverArithmeticWidget(const size_t n);
    ProverArithmeticWidget(const ProverArithmeticWidget &other);
    ProverArithmeticWidget(ProverArithmeticWidget &&other);
    ProverArithmeticWidget& operator=(const ProverArithmeticWidget &other);
    ProverArithmeticWidget& operator=(ProverArithmeticWidget &&other);
    ~ProverArithmeticWidget() {};

    barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t& alpha_step, CircuitFFTState& circuit_state);
    barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t &alpha_base, const barretenberg::fr::field_t &, const waffle::plonk_proof &proof, const barretenberg::evaluation_domain& domain, barretenberg::polynomial &r);
    barretenberg::fr::field_t compute_opening_poly_contribution(barretenberg::fr::field_t*, const barretenberg::evaluation_domain &, const barretenberg::fr::field_t &nu_base, const barretenberg::fr::field_t &)
    {
        return nu_base;
    }

    
    std::unique_ptr<VerifierBaseWidget> compute_preprocessed_commitments(const barretenberg::evaluation_domain &domain, const ReferenceString &reference_string) const;
    void compute_proof_elements(plonk_proof&, const barretenberg::fr::field_t&) {};
    void reset(const barretenberg::evaluation_domain& domain);

    barretenberg::polynomial q_m;
    barretenberg::polynomial q_l;
    barretenberg::polynomial q_r;
    barretenberg::polynomial q_o;
    barretenberg::polynomial q_c;
};


}
#endif