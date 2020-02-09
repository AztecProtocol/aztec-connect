#include "./sequential_widget.hpp"

#include "../../../types.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../transcript/transcript.hpp"

#include "../proving_key/proving_key.hpp"

using namespace barretenberg;

namespace waffle {
ProverSequentialWidget::ProverSequentialWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_3_next(key->constraint_selectors.at("q_3_next"))
    , q_3_next_fft(key->constraint_selector_ffts.at("q_3_next_fft"))
{}

ProverSequentialWidget::ProverSequentialWidget(const ProverSequentialWidget& other)
    : ProverBaseWidget(other)
    , q_3_next(key->constraint_selectors.at("q_3_next"))
    , q_3_next_fft(key->constraint_selector_ffts.at("q_3_next_fft"))
{}

ProverSequentialWidget::ProverSequentialWidget(ProverSequentialWidget&& other)
    : ProverBaseWidget(other)
    , q_3_next(key->constraint_selectors.at("q_3_next"))
    , q_3_next_fft(key->constraint_selector_ffts.at("q_3_next_fft"))
{}

ProverSequentialWidget& ProverSequentialWidget::operator=(const ProverSequentialWidget& other)
{
    ProverBaseWidget::operator=(other);

    q_3_next = key->constraint_selectors.at("q_3_next");

    q_3_next_fft = key->constraint_selector_ffts.at("q_3_next_fft");
    return *this;
}

ProverSequentialWidget& ProverSequentialWidget::operator=(ProverSequentialWidget&& other)
{
    ProverBaseWidget::operator=(other);

    q_3_next = key->constraint_selectors.at("q_3_next");

    q_3_next_fft = key->constraint_selector_ffts.at("q_3_next_fft");
    return *this;
}

fr::field_t ProverSequentialWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                  const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);

    barretenberg::fr::field_t old_alpha = barretenberg::fr::mul(alpha_base, barretenberg::fr::invert(alpha));
    polynomial& w_3_fft = key->wire_ffts.at("w_3_fft");
    polynomial& quotient_mid = key->quotient_mid;
    ITERATE_OVER_DOMAIN_START(key->mid_domain);
    fr::field_t T0;
    fr::__mul(w_3_fft.at(2 * i + 4), q_3_next_fft[i], T0); // w_l * q_m = rdx
    fr::__mul(T0, old_alpha, T0);
    fr::__add(quotient_mid[i], T0, quotient_mid[i]);
    ITERATE_OVER_DOMAIN_END;

    return alpha_base;
}

fr::field_t ProverSequentialWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                const transcript::Transcript& transcript,
                                                                polynomial& r)
{
    fr::field_t w_o_shifted_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t alpha = fr::serialize_from_buffer(&transcript.get_challenge("alpha")[0]);

    barretenberg::fr::field_t old_alpha = barretenberg::fr::mul(alpha_base, barretenberg::fr::invert(alpha));
    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T0;
    fr::__mul(w_o_shifted_eval, q_3_next[i], T0);
    fr::__mul(T0, old_alpha, T0);
    fr::__add(r[i], T0, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return alpha_base;
}

std::unique_ptr<VerifierBaseWidget> ProverSequentialWidget::compute_preprocessed_commitments(
    const ReferenceString& reference_string) const
{
    polynomial polys[1]{
        polynomial(q_3_next, key->small_domain.size),
    };

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(1);

    for (size_t i = 0; i < 1; ++i) {
        g1::jacobian_to_affine(scalar_multiplication::pippenger(
                                   polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
                               commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierSequentialWidget>(commitments);
    return result;
}

// ###

VerifierSequentialWidget::VerifierSequentialWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierBaseWidget()
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

    barretenberg::fr::field_t old_alpha =
        barretenberg::fr::mul(challenge.alpha_base, barretenberg::fr::invert(challenge.alpha_step));

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_o_next_term;
    fr::__mul(w_o_shifted_eval, old_alpha, q_o_next_term);
    fr::__mul(q_o_next_term, challenge.linear_nu, q_o_next_term);

    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(q_o_next_term);
    }

    return VerifierBaseWidget::challenge_coefficients{
        challenge.alpha_base, challenge.alpha_step, challenge.nu_base, challenge.nu_step, challenge.linear_nu
    };
}
} // namespace waffle