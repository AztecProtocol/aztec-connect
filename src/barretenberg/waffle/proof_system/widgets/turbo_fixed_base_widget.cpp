#include "./turbo_fixed_base_widget.hpp"

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../curves/grumpkin/grumpkin.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../types.hpp"

using namespace barretenberg;

namespace waffle {
ProverTurboFixedBaseWidget::ProverTurboFixedBaseWidget(const size_t n)
    : ProverTurboArithmeticWidget(n)
{
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
    q_ecc_1.resize(n);
}

ProverTurboFixedBaseWidget::ProverTurboFixedBaseWidget(const ProverTurboFixedBaseWidget& other)
    : ProverTurboArithmeticWidget(other)
{
    q_ecc_1 = polynomial(other.q_ecc_1);
    version = WidgetVersionControl(other.version);
}

ProverTurboFixedBaseWidget::ProverTurboFixedBaseWidget(ProverTurboFixedBaseWidget&& other)
    : ProverTurboArithmeticWidget(other)
{
    q_ecc_1 = polynomial(other.q_ecc_1);
    version = WidgetVersionControl(other.version);
}

ProverTurboFixedBaseWidget& ProverTurboFixedBaseWidget::operator=(const ProverTurboFixedBaseWidget& other)
{
    ProverTurboArithmeticWidget::operator=(other);
    q_ecc_1 = polynomial(other.q_ecc_1);
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverTurboFixedBaseWidget& ProverTurboFixedBaseWidget::operator=(ProverTurboFixedBaseWidget&& other)
{
    ProverTurboArithmeticWidget::operator=(other);
    q_ecc_1 = polynomial(other.q_ecc_1);
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverTurboFixedBaseWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                      const transcript::Transcript& transcript,
                                                                      CircuitFFTState& circuit_state)
{
    fr::field_t grumpkin_curve_b = grumpkin::g1::curve_b;
    fr::field_t new_alpha_base =
        ProverTurboArithmeticWidget::compute_quotient_contribution(alpha_base, transcript, circuit_state);

    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    q_ecc_1.ifft(circuit_state.small_domain);

    polynomial q_ecc_1_fft = polynomial(q_ecc_1, circuit_state.large_domain.size);

    q_ecc_1_fft.coset_fft(circuit_state.large_domain);

    fr::field_t alpha_a = new_alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);
    fr::field_t alpha_e = fr::mul(alpha_d, alpha);
    fr::field_t alpha_f = fr::mul(alpha_e, alpha);
    fr::field_t alpha_g = fr::mul(alpha_f, alpha);

    // selector renaming:
    // q_1 = q_x_1
    // q_2 = q_x_2
    // q_3 = q_y_1
    // q_ecc_1 = q_y_2
    // q_4 = q_x_init_1
    // q_4_next = q_x_init_2
    // q_m = q_y_init_1
    // q_c = q_y_init_2
    ITERATE_OVER_DOMAIN_START(circuit_state.large_domain);

    // accumulator_delta = d(Xw) - 4d(X)
    // accumulator_delta tracks the current round's scalar multiplier
    // which should be one of {-3, -1, 1, 3}
    fr::field_t accumulator_delta;
    fr::__add(circuit_state.w_4_fft[i], circuit_state.w_4_fft[i], accumulator_delta);
    fr::__add(accumulator_delta, accumulator_delta, accumulator_delta);
    fr::__sub(circuit_state.w_4_fft[i + 4], accumulator_delta, accumulator_delta);

    fr::field_t accumulator_delta_squared;
    fr::__sqr(accumulator_delta, accumulator_delta_squared);

    // y_alpha represents the point that we're adding into our accumulator point at the current round
    // q_3 and q_ecc_1 are selector polynomials that describe two different y-coordinates
    // the value of y-alpha is one of these two points, or their inverses
    // y_alpha = delta * (x_alpha * q_3 + q_ecc_1)
    // (we derive x_alpha from y_alpha, with `delta` conditionally flipping the sign of the output)
    // q_3 and q_ecc_1 are not directly equal to the 2 potential y-coordintes.
    // let's use `x_beta`, `x_gamma`, `y_beta`, `y_gamma` to refer to the two points in our lookup table
    // y_alpha = [(x_alpha - x_gamma) / (x_beta - x_gamma)].y_beta.delta + [(x_alpha - x_beta) / 3.(x_gamma - x_beta)].y_gamma.delta
    // => q_3 = (3.y_beta - y_gamma) / 3.(x_beta - x_gamma)
    // => q_ecc_1 = (3.x_beta.y_gamma - x_gammay_beta) / 3.(x_beta - x_gammma)
    fr::field_t y_alpha;
    fr::__mul(circuit_state.w_o_fft[i + 4], q_3_fft[i], y_alpha);
    fr::__add(y_alpha, q_ecc_1_fft[i], y_alpha);
    fr::__mul(y_alpha, accumulator_delta, y_alpha);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;

    // scalar accumulator consistency check
    // (delta - 1)(delta - 3)(delta + 1)(delta + 3).q_ecc_1 = 0 mod Z_H
    fr::field_t scalar_accumulator_identity;
    fr::field_t three;
    fr::__add(fr::one, fr::one, three);
    fr::__add(three, fr::one, three);
    fr::__sub(accumulator_delta, fr::one, T0);
    fr::__sub(accumulator_delta, three, T1);
    fr::__add(accumulator_delta, fr::one, T2);
    fr::__add(accumulator_delta, three, T3);
    fr::__mul(T0, T1, T0);
    fr::__mul(T2, T3, T2);
    fr::__mul(T0, T2, scalar_accumulator_identity);
    fr::__mul(scalar_accumulator_identity, alpha_a, scalar_accumulator_identity);

    // x_alpha consistency check
    // (delta^2.q_1 + q_2 - x_alpha).q_ecc = 0 mod Z_H
    // x_alpha is the x-coordinate of the point we're adding into our accumulator point.
    // We use a w_o(X) to track x_alpha, to reduce the number of required selector polynomials
    fr::field_t x_alpha_identity;
    fr::__mul(accumulator_delta_squared, q_1_fft[i], x_alpha_identity);
    fr::__add(x_alpha_identity, q_2_fft[i], x_alpha_identity);
    fr::__sub(x_alpha_identity, circuit_state.w_o_fft[i + 4], x_alpha_identity);
    fr::__mul(x_alpha_identity, alpha_b, x_alpha_identity);

    // x-accumulator consistency check
    // ((x_2 + x_1 + x_alpha)(x_alpha - x_1)^2 - (y_alpha - y_1)^2).q_ecc = 0 mod Z_H
    // we use the fact that y_alpha^2 = x_alpha^3 + grumpkin::g1::curve_b
    fr::field_t x_accumulator_identity;
    fr::__mul(y_alpha, circuit_state.w_r_fft[i], T0);
    fr::__add(T0, T0, T0);
    fr::__sub(circuit_state.w_o_fft[i + 4], circuit_state.w_l_fft[i], T1);
    fr::__sqr(T1, T1); // T1 = (x_alpha - x_1)^2
    fr::__add(circuit_state.w_l_fft[i + 4], circuit_state.w_l_fft[i], T2);
    fr::__add(T2, circuit_state.w_o_fft[i + 4], T2); // T2 = (x_2 + x_1 + x_alpha)
    fr::__mul(T1, T2, T1);
    fr::__sqr(circuit_state.w_r_fft[i], T2); // T2 = y_1^2
    fr::__add(T2, grumpkin_curve_b, T2);
    fr::__add(T0, T1, x_accumulator_identity);
    fr::__sub(x_accumulator_identity, T2, x_accumulator_identity);
    fr::__sqr(circuit_state.w_o_fft[i + 4], T0); // y_alpha^2 = x_alpha^3 + b
    fr::__mul(T0, circuit_state.w_o_fft[i + 4], T0);
    fr::__sub(x_accumulator_identity, T0, x_accumulator_identity);
    fr::__mul(x_accumulator_identity, alpha_c, x_accumulator_identity);

    // y-accumulator consistency check
    // ((y_2 + y_1)(x_alpha - x_1) - (y_alpha - y_1)(x_1 - x_2)).q_ecc = 0 mod Z_H
    fr::field_t y_accumulator_identity;
    fr::__add(circuit_state.w_r_fft[i], circuit_state.w_r_fft[i + 4], T0);
    fr::__sub(circuit_state.w_o_fft[i + 4], circuit_state.w_l_fft[i], T1);
    fr::__mul(T0, T1, T0);

    fr::__sub(y_alpha, circuit_state.w_r_fft[i], T1);

    fr::__sub(circuit_state.w_l_fft[i], circuit_state.w_l_fft[i + 4], T2);
    fr::__mul(T1, T2, T1);
    fr::__sub(T0, T1, y_accumulator_identity);
    fr::__mul(y_accumulator_identity, alpha_d, y_accumulator_identity);

    // accumlulator-init consistency check
    // at the start of our scalar multiplication ladder, we want to validate that 
    // the initial values of (x_1, y_1) and scalar accumulator a_1 are correctly set
    // We constrain a_1 to be either 0 or the value in w_o (which should be correctly initialized to (1 / 4^n) via a copy constraint)
    // We constraint (x_1, y_1) to be one of 4^n.[1] or (4^n + 1).[1]
    fr::field_t accumulator_init_identity;
    fr::__sub(circuit_state.w_4_fft[i], circuit_state.w_o_fft[i], accumulator_init_identity);
    fr::__sub(accumulator_init_identity, fr::one, T0);
    fr::__mul(accumulator_init_identity, T0, accumulator_init_identity);
    fr::__mul(accumulator_init_identity, alpha_e, accumulator_init_identity);

    // // x-init consistency check
    fr::field_t x_init_identity;
    fr::__sub(circuit_state.w_o_fft[i], circuit_state.w_4_fft[i], x_init_identity);
    fr::__mul(x_init_identity, q_4_fft[i], x_init_identity);
    fr::__add(x_init_identity, q_4_next_fft[i], x_init_identity);
    fr::__sub(x_init_identity, circuit_state.w_l_fft[i], x_init_identity);
    fr::__mul(x_init_identity, alpha_f, x_init_identity);

    // // y-init consistency check
    fr::field_t y_init_identity;
    fr::__sub(circuit_state.w_o_fft[i], circuit_state.w_4_fft[i], y_init_identity);
    fr::__mul(y_init_identity, q_m_fft[i], y_init_identity);
    fr::__add(y_init_identity, q_c_fft[i], y_init_identity);
    fr::__sub(y_init_identity, circuit_state.w_r_fft[i], y_init_identity);

    fr::__mul(y_init_identity, alpha_g, y_init_identity);
    
    fr::field_t gate_identity;
    fr::__add(accumulator_init_identity, x_init_identity, gate_identity);
    fr::__add(gate_identity, y_init_identity, gate_identity);
    fr::__mul(gate_identity, q_c_fft[i], gate_identity);
    fr::__add(gate_identity, scalar_accumulator_identity, gate_identity);
    fr::__add(gate_identity, x_alpha_identity, gate_identity);
    fr::__add(gate_identity, x_accumulator_identity, gate_identity);
    fr::__add(gate_identity, y_accumulator_identity, gate_identity);
    fr::__mul(gate_identity, q_ecc_1_fft[i], gate_identity);
    fr::__add(circuit_state.quotient_large[i], gate_identity, circuit_state.quotient_large[i]);

    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_g, alpha);
}

void ProverTurboFixedBaseWidget::compute_transcript_elements(transcript::Transcript& transcript,
                                                             const evaluation_domain& domain)
{
    ProverTurboArithmeticWidget::compute_transcript_elements(transcript, domain);
    fr::field_t z = fr::serialize_from_buffer(&transcript.get_challenge("z")[0]);
    transcript.add_element("q_ecc_1", transcript_helpers::convert_field_element(q_ecc_1.evaluate(z, domain.size)));
    transcript.add_element("q_c", transcript_helpers::convert_field_element(q_c.evaluate(z, domain.size)));
}

fr::field_t ProverTurboFixedBaseWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                                    const transcript::Transcript& transcript,
                                                                    const evaluation_domain& domain,
                                                                    barretenberg::polynomial& r)
{
    fr::field_t new_alpha_base =
        ProverTurboArithmeticWidget::compute_linear_contribution(alpha_base, transcript, domain, r);
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_l_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_1_omega")[0]);
    fr::field_t w_o_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);

    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t q_ecc_1_eval = fr::serialize_from_buffer(&transcript.get_element("q_ecc_1")[0]);
    fr::field_t q_c_eval = fr::serialize_from_buffer(&transcript.get_element("q_c")[0]);

    fr::field_t alpha_b = fr::mul(new_alpha_base, (alpha));
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);
    fr::field_t alpha_e = fr::mul(alpha_d, alpha);
    fr::field_t alpha_f = fr::mul(alpha_e, alpha);
    fr::field_t alpha_g = fr::mul(alpha_f, alpha);

    fr::field_t delta;
    fr::__add(w_4_eval, w_4_eval, delta);
    fr::__add(delta, delta, delta);
    fr::__sub(w_4_omega_eval, delta, delta);

    fr::field_t delta_squared;
    fr::__sqr(delta, delta_squared);

    fr::field_t q_1_multiplicand;
    fr::__mul(delta_squared, q_ecc_1_eval, q_1_multiplicand);
    fr::__mul(q_1_multiplicand, alpha_b, q_1_multiplicand);

    fr::field_t q_2_multiplicand;
    fr::__mul(alpha_b, q_ecc_1_eval, q_2_multiplicand);

    fr::field_t T0;
    fr::field_t T1;

    fr::field_t q_3_multiplicand;
    fr::__sub(w_l_omega_eval, w_l_eval, T0);
    fr::__mul(T0, delta, T0);
    fr::__mul(T0, w_o_omega_eval, T0);
    fr::__mul(T0, alpha_d, T0);
    fr::__mul(T0, q_ecc_1_eval, T0);

    fr::__mul(delta, w_o_omega_eval, T1);
    fr::__mul(T1, w_r_eval, T1);
    fr::__mul(T1, alpha_c, T1);
    fr::__add(T1, T1, T1);
    fr::__mul(T1, q_ecc_1_eval, T1);
    fr::__add(T0, T1, q_3_multiplicand);

    fr::field_t q_4_multiplicand;
    fr::__sub(w_o_eval, w_4_eval, q_4_multiplicand);
    fr::__mul(q_4_multiplicand, q_ecc_1_eval, q_4_multiplicand);
    fr::__mul(q_4_multiplicand, q_c_eval, q_4_multiplicand);
    fr::__mul(q_4_multiplicand, alpha_f, q_4_multiplicand);

    fr::field_t q_4_next_multiplicand;
    fr::__mul(q_c_eval, q_ecc_1_eval, q_4_next_multiplicand);
    fr::__mul(q_4_next_multiplicand, alpha_f, q_4_next_multiplicand);

    fr::field_t q_m_multiplicand;
    fr::__sub(w_o_eval, w_4_eval, q_m_multiplicand);
    fr::__mul(q_m_multiplicand, q_ecc_1_eval, q_m_multiplicand);
    fr::__mul(q_m_multiplicand, q_c_eval, q_m_multiplicand);
    fr::__mul(q_m_multiplicand, alpha_g, q_m_multiplicand);

    ITERATE_OVER_DOMAIN_START(domain);
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;
    fr::field_t T5;
    fr::field_t T6;
    fr::field_t T7;
    fr::__mul(q_1_multiplicand, q_1[i], T2);
    fr::__mul(q_2_multiplicand, q_2[i], T3);
    fr::__mul(q_3_multiplicand, q_3[i], T4);
    fr::__mul(q_4_multiplicand, q_4[i], T5);
    fr::__mul(q_4_next_multiplicand, q_4_next[i], T6);
    fr::__mul(q_m_multiplicand, q_m[i], T7);
    fr::__add(r[i], T2, r[i]);
    fr::__add(r[i], T3, r[i]);
    fr::__add(r[i], T4, r[i]);
    fr::__add(r[i], T5, r[i]);
    fr::__add(r[i], T6, r[i]);
    fr::__add(r[i], T7, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_g, alpha);
}

fr::field_t ProverTurboFixedBaseWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                          const transcript::Transcript& transcript,
                                                                          fr::field_t* poly,
                                                                          fr::field_t* shifted_poly,
                                                                          const evaluation_domain& domain)
{
    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);
    fr::field_t new_nu_base =
        ProverTurboArithmeticWidget::compute_opening_poly_contribution(nu_base, transcript, poly, shifted_poly, domain);
    fr::field_t nu_b = fr::mul(new_nu_base, nu);
    ITERATE_OVER_DOMAIN_START(domain);
    fr::field_t T0;
    fr::field_t T1;
    fr::__mul(q_ecc_1[i], new_nu_base, T0);
    fr::__mul(q_c[i], nu_b, T1);
    fr::__add(poly[i], T0, poly[i]);
    fr::__add(poly[i], T1, poly[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(nu_b, nu);
}

std::unique_ptr<VerifierBaseWidget> ProverTurboFixedBaseWidget::compute_preprocessed_commitments(
    const evaluation_domain& domain, const ReferenceString& reference_string) const
{
    polynomial polys[9]{ polynomial(q_1, domain.size),      polynomial(q_2, domain.size),
                         polynomial(q_3, domain.size),      polynomial(q_4, domain.size),
                         polynomial(q_4_next, domain.size), polynomial(q_m, domain.size),
                         polynomial(q_c, domain.size),      polynomial(q_arith, domain.size),
                         polynomial(q_ecc_1, domain.size) };

    for (size_t i = 0; i < 9; ++i) {
        polys[i].ifft(domain);
    }

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(9);

    for (size_t i = 0; i < 9; ++i) {
        g1::jacobian_to_affine(
            scalar_multiplication::pippenger(polys[i].get_coefficients(), reference_string.monomials, domain.size),
            commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierTurboFixedBaseWidget>(commitments);
    return result;
}

void ProverTurboFixedBaseWidget::reset(const barretenberg::evaluation_domain& domain)
{
    ProverTurboArithmeticWidget::reset(domain);
    q_ecc_1.fft(domain);
}

// ###

VerifierTurboFixedBaseWidget::VerifierTurboFixedBaseWidget(
    std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierTurboArithmeticWidget(instance_commitments)
{
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_L_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_R_SHIFTED);
    version.set_dependency(WidgetVersionControl::Dependencies::REQUIRES_W_O_SHIFTED);
    ASSERT(instance_commitments.size() == 9);
    instance =
        std::vector<g1::affine_element>{ instance_commitments[0], instance_commitments[1], instance_commitments[2],
                                         instance_commitments[3], instance_commitments[4], instance_commitments[5],
                                         instance_commitments[6], instance_commitments[7], instance_commitments[8] };
}

barretenberg::fr::field_t VerifierTurboFixedBaseWidget::compute_quotient_evaluation_contribution(
    const fr::field_t& alpha_base, const transcript::Transcript& transcript, fr::field_t& t_eval)
{
    fr::field_t new_alpha_base =
        VerifierTurboArithmeticWidget::compute_quotient_evaluation_contribution(alpha_base, transcript, t_eval);
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_l_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_1_omega")[0]);
    fr::field_t w_r_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_2_omega")[0]);
    fr::field_t w_o_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t q_ecc_1_eval = fr::serialize_from_buffer(&transcript.get_element("q_ecc_1")[0]);
    fr::field_t q_c_eval = fr::serialize_from_buffer(&transcript.get_element("q_c")[0]);

    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());
    fr::field_t alpha_a = new_alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);
    fr::field_t alpha_e = fr::mul(alpha_d, alpha);
    fr::field_t alpha_f = fr::mul(alpha_e, alpha);
    fr::field_t alpha_g = fr::mul(alpha_f, alpha);

    fr::field_t delta;
    fr::__add(w_4_eval, w_4_eval, delta);
    fr::__add(delta, delta, delta);
    fr::__sub(w_4_omega_eval, delta, delta); // w_4_omega - 4 * w_4

    fr::field_t delta_squared;
    fr::__sqr(delta, delta_squared);

    fr::field_t three;
    fr::__add(fr::one, fr::one, three);
    fr::__add(three, fr::one, three);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    fr::field_t T3;
    fr::field_t T4;

    fr::field_t accumulator_identity;
    fr::__add(delta, fr::one, T1);
    fr::__add(delta, three, T2);
    fr::__sub(delta, fr::one, T3);
    fr::__sub(delta, three, T4);
    fr::__mul(T1, T2, accumulator_identity);
    fr::__mul(accumulator_identity, T3, accumulator_identity);
    fr::__mul(accumulator_identity, T4, accumulator_identity);
    fr::__mul(accumulator_identity, alpha_a, accumulator_identity);

    fr::field_t x_alpha_identity;
    fr::__mul(w_o_omega_eval, alpha_b, x_alpha_identity);
    fr::__neg(x_alpha_identity, x_alpha_identity);

    fr::field_t x_accumulator_identity;
    fr::__add(w_l_omega_eval, w_l_eval, T0);
    fr::__add(T0, w_o_omega_eval, T0);
    fr::__sub(w_o_omega_eval, w_l_eval, T1);
    fr::__sqr(T1, T1);
    fr::__mul(T0, T1, T0);

    fr::__sqr(w_o_omega_eval, T1);
    fr::__mul(T1, w_o_omega_eval, T1);
    fr::__sqr(w_r_eval, T2);
    fr::__add(T1, T2, T1);
    fr::__add(T1, grumpkin::g1::curve_b, T1);
    fr::__neg(T1, T1);

    fr::__mul(delta, w_r_eval, T2);
    fr::__mul(T2, q_ecc_1_eval, T2);
    fr::__add(T2, T2, T2);

    fr::__add(T0, T1, T0);
    fr::__add(T0, T2, x_accumulator_identity);
    fr::__mul(x_accumulator_identity, alpha_c, x_accumulator_identity);

    fr::field_t y_accumulator_identity;
    fr::__add(w_r_omega_eval, w_r_eval, T0);
    fr::__sub(w_o_omega_eval, w_l_eval, T1);
    fr::__mul(T0, T1, T0);

    fr::__sub(w_l_eval, w_l_omega_eval, T1);
    fr::__mul(q_ecc_1_eval, delta, T2);
    fr::__sub(w_r_eval, T2, T2);
    fr::__mul(T1, T2, T1);

    fr::__add(T0, T1, y_accumulator_identity);
    fr::__mul(y_accumulator_identity, alpha_d, y_accumulator_identity);

    fr::field_t accumulator_init_identity;
    fr::__sub(w_4_eval, w_o_eval, accumulator_init_identity);
    fr::__sub(accumulator_init_identity, fr::one, T0);
    fr::__mul(accumulator_init_identity, T0, accumulator_init_identity);
    fr::__mul(accumulator_init_identity, alpha_e, accumulator_init_identity);

    fr::field_t x_init_identity;
    fr::__neg(w_l_eval, x_init_identity);
    fr::__mul(x_init_identity, alpha_f, x_init_identity);

    fr::field_t y_init_identity;
    fr::__sub(q_c_eval, w_r_eval, y_init_identity);
    fr::__mul(y_init_identity, alpha_g, y_init_identity);

    fr::field_t gate_identity;
    fr::__add(accumulator_init_identity, x_init_identity, gate_identity);
    fr::__add(gate_identity, y_init_identity, gate_identity);
    fr::__mul(gate_identity, q_c_eval, gate_identity);
    fr::__add(gate_identity, accumulator_identity, gate_identity);
    fr::__add(gate_identity, x_alpha_identity, gate_identity);
    fr::__add(gate_identity, x_accumulator_identity, gate_identity);
    fr::__add(gate_identity, y_accumulator_identity, gate_identity);
    fr::__mul(gate_identity, q_ecc_1_eval, gate_identity);
    fr::__add(t_eval, gate_identity, t_eval);
    return fr::mul(alpha_g, alpha);
}

barretenberg::fr::field_t VerifierTurboFixedBaseWidget::compute_batch_evaluation_contribution(
    barretenberg::fr::field_t& batch_eval,
    const barretenberg::fr::field_t& nu_base,
    const transcript::Transcript& transcript)
{
    fr::field_t q_c_eval = fr::serialize_from_buffer(&transcript.get_element("q_c")[0]);
    fr::field_t q_arith_eval = fr::serialize_from_buffer(&transcript.get_element("q_arith")[0]);
    fr::field_t q_ecc_1_eval = fr::serialize_from_buffer(&transcript.get_element("q_ecc_1")[0]);

    fr::field_t nu = fr::serialize_from_buffer(&transcript.get_challenge("nu")[0]);

    fr::field_t nu_a = fr::mul(nu_base, nu);
    fr::field_t nu_b = fr::mul(nu_a, nu);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;

    fr::__mul(q_arith_eval, nu_base, T0);
    fr::__mul(q_ecc_1_eval, nu_a, T1);
    fr::__mul(q_c_eval, nu_b, T2);
    fr::__add(batch_eval, T0, batch_eval);
    fr::__add(batch_eval, T1, batch_eval);
    fr::__add(batch_eval, T2, batch_eval);

    return fr::mul(nu_b, nu);
}

VerifierBaseWidget::challenge_coefficients VerifierTurboFixedBaseWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_l_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_r_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_o_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_l_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_1_omega")[0]);
    fr::field_t w_o_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_3_omega")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t q_arith_eval = fr::serialize_from_buffer(&transcript.get_element("q_arith")[0]);
    fr::field_t q_ecc_1_eval = fr::serialize_from_buffer(&transcript.get_element("q_ecc_1")[0]);
    fr::field_t q_c_eval = fr::serialize_from_buffer(&transcript.get_element("q_c")[0]);

    fr::field_t alpha_a = fr::mul(challenge.alpha_base, challenge.alpha_step);
    fr::field_t alpha_b = fr::mul(alpha_a, challenge.alpha_step);
    fr::field_t alpha_c = fr::mul(alpha_b, challenge.alpha_step);
    fr::field_t alpha_d = fr::mul(alpha_c, challenge.alpha_step);
    fr::field_t alpha_e = fr::mul(alpha_d, challenge.alpha_step);
    fr::field_t alpha_f = fr::mul(alpha_e, challenge.alpha_step);
    fr::field_t alpha_g = fr::mul(alpha_f, challenge.alpha_step);

    fr::field_t delta;
    fr::__add(w_4_eval, w_4_eval, delta);
    fr::__add(delta, delta, delta);
    fr::__sub(w_4_omega_eval, delta, delta);

    fr::field_t delta_squared;
    fr::__sqr(delta, delta_squared);

    fr::field_t q_l_term_ecc;
    fr::__mul(delta_squared, q_ecc_1_eval, q_l_term_ecc);
    fr::__mul(q_l_term_ecc, alpha_b, q_l_term_ecc);

    fr::field_t q_l_term_arith;
    fr::__mul(w_l_eval, challenge.alpha_base, q_l_term_arith);
    fr::__mul(q_l_term_arith, q_arith_eval, q_l_term_arith);

    fr::field_t q_l_term;
    fr::__add(q_l_term_ecc, q_l_term_arith, q_l_term);
    fr::__mul(q_l_term, challenge.linear_nu, q_l_term);

    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(q_l_term);
    }

    fr::field_t q_r_term_ecc;
    fr::__mul(alpha_b, q_ecc_1_eval, q_r_term_ecc);

    fr::field_t q_r_term_arith;
    fr::__mul(w_r_eval, challenge.alpha_base, q_r_term_arith);
    fr::__mul(q_r_term_arith, q_arith_eval, q_r_term_arith);

    fr::field_t q_r_term;
    fr::__add(q_r_term_ecc, q_r_term_arith, q_r_term);
    fr::__mul(q_r_term, challenge.linear_nu, q_r_term);
    if (g1::on_curve(instance[1])) {
        points.push_back(instance[1]);
        scalars.push_back(q_r_term);
    }

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t q_o_term_ecc;
    fr::__sub(w_l_omega_eval, w_l_eval, T0);
    fr::__mul(T0, delta, T0);
    fr::__mul(T0, w_o_omega_eval, T0);
    fr::__mul(T0, alpha_d, T0);

    fr::__mul(delta, w_o_omega_eval, T1);
    fr::__mul(T1, w_r_eval, T1);
    fr::__add(T1, T1, T1);
    fr::__mul(T1, alpha_c, T1);

    fr::__add(T0, T1, q_o_term_ecc);
    fr::__mul(q_o_term_ecc, q_ecc_1_eval, q_o_term_ecc);

    fr::field_t q_o_term_arith;
    fr::__mul(w_o_eval, challenge.alpha_base, q_o_term_arith);
    fr::__mul(q_o_term_arith, q_arith_eval, q_o_term_arith);

    fr::field_t q_o_term;
    fr::__add(q_o_term_ecc, q_o_term_arith, q_o_term);
    fr::__mul(q_o_term, challenge.linear_nu, q_o_term);
    if (g1::on_curve(instance[2])) {
        points.push_back(instance[2]);
        scalars.push_back(q_o_term);
    }

    fr::field_t q_4_term_ecc;
    fr::__sub(w_o_eval, w_4_eval, q_4_term_ecc);
    fr::__mul(q_4_term_ecc, q_ecc_1_eval, q_4_term_ecc);
    fr::__mul(q_4_term_ecc, q_c_eval, q_4_term_ecc);
    fr::__mul(q_4_term_ecc, alpha_f, q_4_term_ecc);

    fr::field_t q_4_term_arith;
    fr::__mul(w_4_eval, challenge.alpha_base, q_4_term_arith);
    fr::__mul(q_4_term_arith, q_arith_eval, q_4_term_arith);

    fr::field_t q_4_term;
    fr::__add(q_4_term_ecc, q_4_term_arith, q_4_term);
    fr::__mul(q_4_term, challenge.linear_nu, q_4_term);
    if (g1::on_curve(instance[3])) {
        points.push_back(instance[3]);
        scalars.push_back(q_4_term);
    }

    fr::field_t q_4_next_term_ecc;
    fr::__mul(q_c_eval, q_ecc_1_eval, q_4_next_term_ecc);
    fr::__mul(q_4_next_term_ecc, alpha_f, q_4_next_term_ecc);

    fr::field_t q_4_next_term_arith;
    fr::__mul(w_4_omega_eval, challenge.alpha_base, q_4_next_term_arith);
    fr::__mul(q_4_next_term_arith, q_arith_eval, q_4_next_term_arith);

    fr::field_t q_4_next_term;
    fr::__add(q_4_next_term_ecc, q_4_next_term_arith, q_4_next_term);
    fr::__mul(q_4_next_term, challenge.linear_nu, q_4_next_term);
    if (g1::on_curve(instance[4])) {
        points.push_back(instance[4]);
        scalars.push_back(q_4_next_term);
    }

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_m_term_ecc;
    fr::__sub(w_o_eval, w_4_eval, q_m_term_ecc);
    fr::__mul(q_m_term_ecc, q_ecc_1_eval, q_m_term_ecc);
    fr::__mul(q_m_term_ecc, q_c_eval, q_m_term_ecc);
    fr::__mul(q_m_term_ecc, alpha_g, q_m_term_ecc);

    fr::field_t q_m_term_arith;
    fr::__mul(w_l_eval, w_r_eval, q_m_term_arith);
    fr::__mul(q_m_term_arith, challenge.alpha_base, q_m_term_arith);
    fr::__mul(q_m_term_arith, q_arith_eval, q_m_term_arith);

    fr::field_t q_m_term;
    fr::__add(q_m_term_ecc, q_m_term_arith, q_m_term);
    fr::__mul(q_m_term, challenge.linear_nu, q_m_term);
    if (g1::on_curve(instance[5])) {
        points.push_back(instance[5]);
        scalars.push_back(q_m_term);
    }

    fr::field_t q_c_term;
    fr::__mul(challenge.alpha_base, challenge.linear_nu, q_c_term);
    fr::__mul(q_c_term, q_arith_eval, q_c_term);
    if (g1::on_curve(instance[6])) {
        points.push_back(instance[6]);
        fr::field_t blah_nu = fr::mul(challenge.nu_base, fr::sqr(challenge.nu_step));
        fr::__add(q_c_term, blah_nu, q_c_term);
        scalars.push_back(q_c_term);
    }

    if (g1::on_curve(instance[7])) {
        points.push_back(instance[7]);
        scalars.push_back(challenge.nu_base);
    }

    if (g1::on_curve(instance[8])) {
        points.push_back(instance[8]);
        scalars.push_back(fr::mul(challenge.nu_base, challenge.nu_step));
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(alpha_d, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       fr::mul(challenge.nu_base, fr::mul(fr::sqr(challenge.nu_step), challenge.nu_step)),
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle