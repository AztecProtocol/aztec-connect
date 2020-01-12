#include "./sequential_widget.hpp"

#include "../../../types.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"

using namespace barretenberg;

namespace waffle
{
ProverSequentialWidget::ProverSequentialWidget(const size_t n) :
    ProverBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED),
        static_cast<size_t>(WidgetVersionControl::Features::HAS_EXTENDED_ARITHMETISATION)
    )
{
    q_o_next.resize(n);
}

ProverSequentialWidget::ProverSequentialWidget(const ProverSequentialWidget &other) : ProverBaseWidget(other)
{
    q_o_next = polynomial(other.q_o_next);
}

ProverSequentialWidget::ProverSequentialWidget(ProverSequentialWidget &&other) : ProverBaseWidget(other)
{
    q_o_next = polynomial(other.q_o_next);
}

ProverSequentialWidget& ProverSequentialWidget::operator=(const ProverSequentialWidget &other)
{
    q_o_next = polynomial(other.q_o_next);
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverSequentialWidget& ProverSequentialWidget::operator=(ProverSequentialWidget &&other)
{
    q_o_next = polynomial(other.q_o_next);
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverSequentialWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base, const transcript::Transcript& transcript, CircuitFFTState& circuit_state)
{
    fr::field_t alpha = fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);

    barretenberg::fr::field_t old_alpha = barretenberg::fr::mul(alpha_base, barretenberg::fr::invert(alpha));
    q_o_next.ifft(circuit_state.small_domain);

    polynomial q_o_next_fft = polynomial(q_o_next, circuit_state.mid_domain.size);

    q_o_next_fft.coset_fft_with_constant(circuit_state.mid_domain, old_alpha);

    ITERATE_OVER_DOMAIN_START(circuit_state.mid_domain);
        fr::__mul(circuit_state.w_o_fft.at(2 * i + 4), q_o_next_fft.at(i), q_o_next_fft.at(i)); // w_l * q_m = rdx
        fr::__add(circuit_state.quotient_mid.at(i), q_o_next_fft.at(i), circuit_state.quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;

    return alpha_base;
}

fr::field_t ProverSequentialWidget::compute_linear_contribution(const fr::field_t &alpha_base, const transcript::Transcript &transcript, const evaluation_domain& domain, polynomial &r)
{
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t alpha = fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);

    barretenberg::fr::field_t old_alpha = barretenberg::fr::mul(alpha_base, barretenberg::fr::invert(alpha));
    ITERATE_OVER_DOMAIN_START(domain);
        fr::field_t T0;
        fr::__mul(w_o_shifted_eval, q_o_next.at(i), T0);
        fr::__mul(T0, old_alpha, T0);
        fr::__add(r.at(i), T0, r.at(i));
    ITERATE_OVER_DOMAIN_END;
    return alpha_base;
}

std::unique_ptr<VerifierBaseWidget> ProverSequentialWidget::compute_preprocessed_commitments(const evaluation_domain& domain, const ReferenceString &reference_string) const
{
    polynomial polys[1]{
        polynomial(q_o_next, domain.size),
    };

    for (size_t i = 0; i < 1; ++i)
    {
        polys[i].ifft(domain);
    }

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(1);

    for (size_t i = 0; i < 1; ++i)
    {
        g1::jacobian_to_affine(scalar_multiplication::pippenger(polys[i].get_coefficients(), reference_string.monomials, domain.size), commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierSequentialWidget>(commitments);
    return result;
}

void ProverSequentialWidget::reset(const barretenberg::evaluation_domain& domain)
{
    q_o_next.fft(domain);
}

// ###

VerifierSequentialWidget::VerifierSequentialWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments) :
    VerifierBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED),
        static_cast<size_t>(WidgetVersionControl::Features::HAS_EXTENDED_ARITHMETISATION)
    )
{
    ASSERT(instance_commitments.size() == 1);
    instance = std::vector<g1::affine_element>{
        instance_commitments[0],
    };
}

VerifierBaseWidget::challenge_coefficients VerifierSequentialWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);

    barretenberg::fr::field_t old_alpha = barretenberg::fr::mul(challenge.alpha_base, barretenberg::fr::invert(challenge.alpha_step));

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_o_next_term;
    fr::__mul(w_o_shifted_eval, old_alpha, q_o_next_term);
    fr::__mul(q_o_next_term, challenge.linear_nu, q_o_next_term);

    
    if (g1::on_curve(instance[0]))
    {
        points.push_back(instance[0]);
        scalars.push_back(q_o_next_term);
    }

    return VerifierBaseWidget::challenge_coefficients{
        challenge.alpha_base,
        challenge.alpha_step,
        challenge.nu_base,
        challenge.nu_step,
        challenge.linear_nu
    };
}
}