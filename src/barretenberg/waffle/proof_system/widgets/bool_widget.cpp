#include "./bool_widget.hpp"

#include "../../../fields/fr.hpp"
#include "../../../types.hpp"
#include "../../../groups/g1.hpp"
#include "../../../groups/scalar_multiplication.hpp"

using namespace barretenberg;

namespace waffle
{
ProverBoolWidget::ProverBoolWidget(const size_t _n) :
    ProverBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
        static_cast<size_t>(WidgetVersionControl::Features::HAS_BOOL_SELECTORS)
    ),
    n(_n)
{
    q_bl.resize(_n);
    q_br.resize(_n);
}

ProverBoolWidget::ProverBoolWidget(const ProverBoolWidget &other) :
    ProverBaseWidget(other),
    n(other.n)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
}

ProverBoolWidget::ProverBoolWidget(ProverBoolWidget &&other) :
    ProverBaseWidget(other),
    n(other.n)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
}

ProverBoolWidget& ProverBoolWidget::operator=(const ProverBoolWidget &other)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    n = other.n;
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverBoolWidget& ProverBoolWidget::operator=(ProverBoolWidget &&other)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    n = other.n;
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverBoolWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base, const barretenberg::fr::field_t &alpha_step, CircuitFFTState& circuit_state)
{
    q_bl.ifft(circuit_state.small_domain);
    q_br.ifft(circuit_state.small_domain);

    polynomial q_bl_fft = polynomial(q_bl, circuit_state.mid_domain.size);
    polynomial q_br_fft = polynomial(q_br, circuit_state.mid_domain.size);

    q_bl_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_br_fft.coset_fft_with_constant(circuit_state.mid_domain, fr::mul(alpha_base, alpha_step));
    ITERATE_OVER_DOMAIN_START(circuit_state.large_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::__sqr(circuit_state.w_l_fft[i * 2], T0);
        fr::__sub(T0, circuit_state.w_l_fft[i * 2], T0);
        fr::__mul(T0, q_bl_fft[i], T0);

        fr::__sqr(circuit_state.w_r_fft[i * 2], T1);
        fr::__sub(T1, circuit_state.w_r_fft[i * 2], T1);
        fr::__mul(T1, q_br_fft[i], T1);
        
        fr::__add(circuit_state.quotient_mid[i], T0, circuit_state.quotient_mid[i]);
        fr::__add(circuit_state.quotient_mid[i], T1, circuit_state.quotient_mid[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, fr::sqr(alpha_step));
}

void ProverBoolWidget::compute_proof_elements(plonk_proof &, const fr::field_t &)
{
}

fr::field_t ProverBoolWidget::compute_linear_contribution(const fr::field_t &alpha_base, const fr::field_t &alpha_step, const waffle::plonk_proof &proof, const evaluation_domain& domain, polynomial &r)
{
    fr::field_t left_bool_multiplier = fr::mul(fr::sub(fr::sqr(proof.w_l_eval), proof.w_l_eval), alpha_base);
    fr::field_t right_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(proof.w_l_eval), proof.w_l_eval), alpha_base), alpha_step);

    ITERATE_OVER_DOMAIN_START(domain);
        fr::field_t T0;
        fr::__mul(left_bool_multiplier, q_bl[i], T0);
        fr::__add(r[i], T0, r[i]);
        fr::__mul(right_bool_multiplier, q_br[i], T0);
        fr::__add(r[i], T0, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, fr::sqr(alpha_step));
}

fr::field_t ProverBoolWidget::compute_opening_poly_contribution(barretenberg::fr::field_t*, const evaluation_domain&, const fr::field_t &nu_base, const fr::field_t &)
{
    return nu_base;
}

std::unique_ptr<VerifierBaseWidget> ProverBoolWidget::compute_preprocessed_commitments(const evaluation_domain& domain, const ReferenceString &reference_string) const
{
    polynomial polys[2]{
        polynomial(q_bl, domain.size),
        polynomial(q_br, domain.size)
    };

    for (size_t i = 0; i < 2; ++i)
    {
        polys[i].ifft(domain);
    }

    scalar_multiplication::multiplication_state mul_state[2]{
        { reference_string.monomials, polys[0].get_coefficients(), domain.size, {}},
        { reference_string.monomials, polys[1].get_coefficients(), domain.size, {}},
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 2);
    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(2);

    for (size_t i = 0; i < 2; ++i)
    {
        g1::jacobian_to_affine(mul_state[i].output, commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierBoolWidget>(commitments);
    return result;
}

void ProverBoolWidget::reset(const evaluation_domain& domain)
{
    q_bl.fft(domain.size);
    q_br.fft(domain.size);
}

// ###

VerifierBoolWidget::VerifierBoolWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments) :
    VerifierBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
        static_cast<size_t>(WidgetVersionControl::Features::HAS_BOOL_SELECTORS)
    )
{
    ASSERT(instance_commitments.size() == 2);
    instance = std::vector<g1::affine_element>{
        instance_commitments[0],
        instance_commitments[1]
    };
}

barretenberg::fr::field_t VerifierBoolWidget::compute_batch_evaluation_contribution(barretenberg::fr::field_t &, barretenberg::fr::field_t &nu_base, barretenberg::fr::field_t &, const plonk_proof &)
{
    return nu_base;
}

VerifierBaseWidget::challenge_coefficients VerifierBoolWidget::append_scalar_multiplication_inputs(
    const VerifierBaseWidget::challenge_coefficients &challenge,
    const waffle::plonk_proof &proof,
    std::vector<barretenberg::g1::affine_element> &points,
    std::vector<barretenberg::fr::field_t> &scalars)
{
    for (size_t i = 0; i < instance.size(); ++i)
    {
        points.push_back(instance[i]);
    }
    scalars.push_back(challenge.nu_base);

    fr::field_t left_bool_multiplier = fr::mul(fr::sub(fr::sqr(proof.w_l_eval), proof.w_l_eval), challenge.alpha_base);
    fr::field_t right_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(proof.w_l_eval), proof.w_l_eval), challenge.alpha_base), challenge.alpha_step);
    left_bool_multiplier = fr::mul(left_bool_multiplier, challenge.linear_nu);
    right_bool_multiplier = fr::mul(right_bool_multiplier, challenge.linear_nu);

    scalars.push_back(left_bool_multiplier);
    scalars.push_back(right_bool_multiplier);


    return VerifierBaseWidget::challenge_coefficients{
        fr::mul(challenge.alpha_base, fr::sqr(challenge.alpha_step)),
        challenge.alpha_step,
        challenge.nu_base,
        challenge.nu_step,
        challenge.linear_nu
    };
}
}