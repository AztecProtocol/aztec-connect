#include "./bool_widget.hpp"

#include "../../../types.hpp"
#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"

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
    q_bo.resize(_n);
}

ProverBoolWidget::ProverBoolWidget(const ProverBoolWidget &other) :
    ProverBaseWidget(other),
    n(other.n)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    q_bo = polynomial(other.q_bo);
}

ProverBoolWidget::ProverBoolWidget(ProverBoolWidget &&other) :
    ProverBaseWidget(other),
    n(other.n)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    q_bo = polynomial(other.q_bo);
}

ProverBoolWidget& ProverBoolWidget::operator=(const ProverBoolWidget &other)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    q_bo = polynomial(other.q_bo);
    n = other.n;
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverBoolWidget& ProverBoolWidget::operator=(ProverBoolWidget &&other)
{
    q_bl = polynomial(other.q_bl);
    q_br = polynomial(other.q_br);
    q_bo = polynomial(other.q_bo);
    n = other.n;
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverBoolWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base, const transcript::Transcript& transcript, CircuitFFTState& circuit_state)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    q_bl.ifft(circuit_state.small_domain);
    q_br.ifft(circuit_state.small_domain);
    q_bo.ifft(circuit_state.small_domain);
    
    polynomial q_bl_fft = polynomial(q_bl, circuit_state.mid_domain.size);
    polynomial q_br_fft = polynomial(q_br, circuit_state.mid_domain.size);
    polynomial q_bo_fft = polynomial(q_bo, circuit_state.mid_domain.size);

    q_bl_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_br_fft.coset_fft_with_constant(circuit_state.mid_domain, fr::mul(alpha_base, alpha));
    q_bo_fft.coset_fft_with_constant(circuit_state.mid_domain, fr::mul(alpha_base, fr::sqr(alpha)));

    ITERATE_OVER_DOMAIN_START(circuit_state.mid_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::__sqr(circuit_state.w_l_fft[i * 2], T0);
        fr::__sub(T0, circuit_state.w_l_fft[i * 2], T0);
        fr::__mul(T0, q_bl_fft[i], T0);


        fr::__sqr(circuit_state.w_r_fft[i * 2], T1);
        fr::__sub(T1, circuit_state.w_r_fft[i * 2], T1);
        fr::__mul(T1, q_br_fft[i], T1);

        fr::__sqr(circuit_state.w_o_fft[i * 2], T2);
        fr::__sub(T2, circuit_state.w_o_fft[i * 2], T2);
        fr::__mul(T2, q_bo_fft[i], T2);
    
        fr::__add(circuit_state.quotient_mid[i], T0, circuit_state.quotient_mid[i]);
        fr::__add(circuit_state.quotient_mid[i], T1, circuit_state.quotient_mid[i]);
        fr::__add(circuit_state.quotient_mid[i], T2, circuit_state.quotient_mid[i]);

    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, fr::mul(fr::sqr(alpha), alpha));
}

fr::field_t ProverBoolWidget::compute_linear_contribution(const fr::field_t &alpha_base, const transcript::Transcript &transcript, const evaluation_domain& domain, polynomial &r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);

    fr::field_t left_bool_multiplier = fr::mul(fr::sub(fr::sqr(w_l_eval), w_l_eval), alpha_base);
    fr::field_t right_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(w_r_eval), w_r_eval), alpha_base), alpha);
    fr::field_t output_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(w_o_eval), w_o_eval), alpha_base), fr::sqr(alpha));

    ITERATE_OVER_DOMAIN_START(domain);
        fr::field_t T0;
        fr::__mul(left_bool_multiplier, q_bl[i], T0);
        fr::__add(r[i], T0, r[i]);
        fr::__mul(right_bool_multiplier, q_br[i], T0);
        fr::__add(r[i], T0, r[i]);
        fr::__mul(output_bool_multiplier, q_bo[i], T0);
        fr::__add(r[i], T0, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, fr::mul(fr::sqr(alpha), alpha));
}

std::unique_ptr<VerifierBaseWidget> ProverBoolWidget::compute_preprocessed_commitments(const evaluation_domain& domain, const ReferenceString &reference_string) const
{
    polynomial polys[3]{
        polynomial(q_bl, domain.size),
        polynomial(q_br, domain.size),
        polynomial(q_bo, domain.size)
    };

    for (size_t i = 0; i < 3; ++i)
    {
        polys[i].ifft(domain);
    }

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(3);

    for (size_t i = 0; i < 3; ++i)
    {
        g1::jacobian_to_affine(
            scalar_multiplication::pippenger(polys[i].get_coefficients(), reference_string.monomials, domain.size),
            commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierBoolWidget>(commitments);
    return result;
}

void ProverBoolWidget::reset(const evaluation_domain& domain)
{
    q_bl.fft(domain);
    q_br.fft(domain);
    q_bo.fft(domain);
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
        instance_commitments[1],
        instance_commitments[2]
    };
}

VerifierBaseWidget::challenge_coefficients VerifierBoolWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);

    fr::field_t left_bool_multiplier = fr::mul(fr::sub(fr::sqr(w_l_eval), w_l_eval), challenge.alpha_base);
    fr::field_t right_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(w_r_eval), w_r_eval), challenge.alpha_base), challenge.alpha_step);
    fr::field_t output_bool_multiplier =  fr::mul(fr::mul(fr::sub(fr::sqr(w_o_eval), w_o_eval), challenge.alpha_base), fr::sqr(challenge.alpha_step));

    left_bool_multiplier = fr::mul(left_bool_multiplier, challenge.linear_nu);
    right_bool_multiplier = fr::mul(right_bool_multiplier, challenge.linear_nu);
    output_bool_multiplier = fr::mul(output_bool_multiplier, challenge.linear_nu);

    if (g1::on_curve(instance[0]))
    {
        points.push_back(instance[0]);
        scalars.push_back(left_bool_multiplier);
    }
    if (g1::on_curve(instance[1]))
    {
        points.push_back(instance[1]);
        scalars.push_back(right_bool_multiplier);
    }
    if (g1::on_curve(instance[2]))
    {
        points.push_back(instance[2]);
        scalars.push_back(output_bool_multiplier);
    }

    return VerifierBaseWidget::challenge_coefficients{
        fr::mul(challenge.alpha_base, fr::mul(fr::sqr(challenge.alpha_step), challenge.alpha_step)),
        challenge.alpha_step,
        challenge.nu_base,
        challenge.nu_step,
        challenge.linear_nu
    };
}
}