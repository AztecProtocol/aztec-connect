#include "./bool_widget.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../types.hpp"

using namespace barretenberg;

namespace waffle {
ProverBoolWidget::ProverBoolWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key,
                       input_witness,
                       static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
                       static_cast<size_t>(WidgetVersionControl::Features::HAS_BOOL_SELECTORS))
    , q_bl(key->constraint_selectors.at("q_bl"))
    , q_br(key->constraint_selectors.at("q_br"))
    , q_bo(key->constraint_selectors.at("q_bo"))
    , q_bl_fft(key->constraint_selector_ffts.at("q_bl_fft"))
    , q_br_fft(key->constraint_selector_ffts.at("q_br_fft"))
    , q_bo_fft(key->constraint_selector_ffts.at("q_bo_fft"))
{}

ProverBoolWidget::ProverBoolWidget(const ProverBoolWidget& other)
    : ProverBaseWidget(other)
    , q_bl(key->constraint_selectors.at("q_bl"))
    , q_br(key->constraint_selectors.at("q_br"))
    , q_bo(key->constraint_selectors.at("q_bo"))
    , q_bl_fft(key->constraint_selector_ffts.at("q_bl_fft"))
    , q_br_fft(key->constraint_selector_ffts.at("q_br_fft"))
    , q_bo_fft(key->constraint_selector_ffts.at("q_bo_fft"))
{}

ProverBoolWidget::ProverBoolWidget(ProverBoolWidget&& other)
    : ProverBaseWidget(other)
    , q_bl(key->constraint_selectors.at("q_bl"))
    , q_br(key->constraint_selectors.at("q_br"))
    , q_bo(key->constraint_selectors.at("q_bo"))
    , q_bl_fft(key->constraint_selector_ffts.at("q_bl_fft"))
    , q_br_fft(key->constraint_selector_ffts.at("q_br_fft"))
    , q_bo_fft(key->constraint_selector_ffts.at("q_bo_fft"))
{}

ProverBoolWidget& ProverBoolWidget::operator=(const ProverBoolWidget& other)
{
    ProverBaseWidget::operator=(other);

    q_bl = key->constraint_selectors.at("q_bl");
    q_br = key->constraint_selectors.at("q_br");
    q_bo = key->constraint_selectors.at("q_bo");

    q_bl_fft = key->constraint_selectors.at("q_bl_fft");
    q_br_fft = key->constraint_selectors.at("q_br_fft");
    q_bo_fft = key->constraint_selectors.at("q_bo_fft");

    version = WidgetVersionControl(other.version);
    return *this;
}

ProverBoolWidget& ProverBoolWidget::operator=(ProverBoolWidget&& other)
{
    ProverBaseWidget::operator=(other);

    q_bl = key->constraint_selectors.at("q_bl");
    q_br = key->constraint_selectors.at("q_br");
    q_bo = key->constraint_selectors.at("q_bo");

    q_bl_fft = key->constraint_selectors.at("q_bl_fft");
    q_br_fft = key->constraint_selectors.at("q_br_fft");
    q_bo_fft = key->constraint_selectors.at("q_bo_fft");

    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverBoolWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                            const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    polynomial& w_1_fft = key->wire_ffts.at("w_1_fft");
    polynomial& w_2_fft = key->wire_ffts.at("w_2_fft");
    polynomial& w_3_fft = key->wire_ffts.at("w_3_fft");

    polynomial& quotient_mid = key->quotient_mid;

    fr::field_t alpha_a = fr::mul(alpha_base, alpha);
    fr::field_t alpha_b = fr::mul(alpha_base, fr::sqr(alpha));
    ITERATE_OVER_DOMAIN_START(key->mid_domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::__sqr(w_1_fft[i * 2], T0);
    fr::__sub(T0, w_1_fft[i * 2], T0);
    fr::__mul(T0, q_bl_fft[i], T0);
    fr::__mul(T0, alpha_base, T0);

    fr::__sqr(w_2_fft[i * 2], T1);
    fr::__sub(T1, w_2_fft[i * 2], T1);
    fr::__mul(T1, q_br_fft[i], T1);
    fr::__mul(T1, alpha_a, T1);

    fr::__sqr(w_3_fft[i * 2], T2);
    fr::__sub(T2, w_3_fft[i * 2], T2);
    fr::__mul(T2, q_bo_fft[i], T2);
    fr::__mul(T2, alpha_b, T2);

    fr::__add(quotient_mid[i], T0, quotient_mid[i]);
    fr::__add(quotient_mid[i], T1, quotient_mid[i]);
    fr::__add(quotient_mid[i], T2, quotient_mid[i]);

    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, fr::mul(fr::sqr(alpha), alpha));
}

fr::field_t ProverBoolWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                          const transcript::Transcript& transcript,
                                                          polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);

    fr::field_t left_bool_multiplier = fr::mul(fr::sub(fr::sqr(w_l_eval), w_l_eval), alpha_base);
    fr::field_t right_bool_multiplier = fr::mul(fr::mul(fr::sub(fr::sqr(w_r_eval), w_r_eval), alpha_base), alpha);
    fr::field_t output_bool_multiplier =
        fr::mul(fr::mul(fr::sub(fr::sqr(w_o_eval), w_o_eval), alpha_base), fr::sqr(alpha));

    ITERATE_OVER_DOMAIN_START(key->small_domain);
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

std::unique_ptr<VerifierBaseWidget> ProverBoolWidget::compute_preprocessed_commitments(
    const ReferenceString& reference_string) const
{
    polynomial polys[3]{ polynomial(q_bl, key->small_domain.size),
                         polynomial(q_br, key->small_domain.size),
                         polynomial(q_bo, key->small_domain.size) };



    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(3);

    for (size_t i = 0; i < 3; ++i) {
        g1::jacobian_to_affine(scalar_multiplication::pippenger(
                                   polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
                               commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierBoolWidget>(commitments);
    return result;
}

void ProverBoolWidget::reset() {}

// ###

VerifierBoolWidget::VerifierBoolWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierBaseWidget(static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
                         static_cast<size_t>(WidgetVersionControl::Features::HAS_BOOL_SELECTORS))
{
    ASSERT(instance_commitments.size() == 3);
    instance =
        std::vector<g1::affine_element>{ instance_commitments[0], instance_commitments[1], instance_commitments[2] };
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
    fr::field_t right_bool_multiplier =
        fr::mul(fr::mul(fr::sub(fr::sqr(w_r_eval), w_r_eval), challenge.alpha_base), challenge.alpha_step);
    fr::field_t output_bool_multiplier =
        fr::mul(fr::mul(fr::sub(fr::sqr(w_o_eval), w_o_eval), challenge.alpha_base), fr::sqr(challenge.alpha_step));

    left_bool_multiplier = fr::mul(left_bool_multiplier, challenge.linear_nu);
    right_bool_multiplier = fr::mul(right_bool_multiplier, challenge.linear_nu);
    output_bool_multiplier = fr::mul(output_bool_multiplier, challenge.linear_nu);

    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(left_bool_multiplier);
    }
    if (g1::on_curve(instance[1])) {
        points.push_back(instance[1]);
        scalars.push_back(right_bool_multiplier);
    }
    if (g1::on_curve(instance[2])) {
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
} // namespace waffle