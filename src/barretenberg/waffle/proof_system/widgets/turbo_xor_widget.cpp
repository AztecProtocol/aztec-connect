#include "./turbo_range_widget.hpp"

#include "../../../curves/grumpkin/grumpkin.hpp"

#include "../../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../transcript/transcript.hpp"
#include "../../../types.hpp"

#include "../transcript_helpers.hpp"

#include "../proving_key/proving_key.hpp"

using namespace barretenberg;

namespace waffle {
ProverTurboXorWidget::ProverTurboXorWidget(proving_key* input_key, program_witness* input_witness)
    : ProverBaseWidget(input_key, input_witness)
    , q_xor(key->constraint_selectors.at("q_xor"))
    , q_xor_fft(key->constraint_selector_ffts.at("q_xor_fft"))
{}

ProverTurboXorWidget::ProverTurboXorWidget(const ProverTurboXorWidget& other)
    : ProverBaseWidget(other)
    , q_xor(key->constraint_selectors.at("q_xor"))
    , q_xor_fft(key->constraint_selector_ffts.at("q_xor_fft"))
{}

ProverTurboXorWidget::ProverTurboXorWidget(ProverTurboXorWidget&& other)
    : ProverBaseWidget(other)
    , q_xor(key->constraint_selectors.at("q_xor"))
    , q_xor_fft(key->constraint_selector_ffts.at("q_xor_fft"))
{}

ProverTurboXorWidget& ProverTurboXorWidget::operator=(const ProverTurboXorWidget& other)
{
    q_xor = key->constraint_selectors.at("q_xor");
    q_xor_fft = key->constraint_selector_ffts.at("q_xor_fft");
    return *this;
}

ProverTurboXorWidget& ProverTurboXorWidget::operator=(ProverTurboXorWidget&& other)
{
    q_xor = key->constraint_selectors.at("q_xor");
    q_xor_fft = key->constraint_selector_ffts.at("q_xor_fft");
    return *this;
}

/*
 * Hoo boy, XOR polynomials!
 * This transition constraint evaluates a XOR relationship between the accumulating sums of three base-4 variables...
 *
 * Ok, so we want to evaluate a ^ b = c
 *
 * We also want the output memory cell to represent the actual result of the XOR operation,
 * instead of a collection of bits / quads that need to be summed together. Who has time for that?
 *
 * We use 3 columns of program memory to represent accumulating sums of a, b, c.
 *
 * For example, we can represent a 32-bit 'a' via its quads
 *
 *      15
 *      ===
 *      \          i
 * a =  /    q  . 4
 *      ===   i
 *     i = 0
 *
 * In program memory, we place an accumulating base-4 sum of a {a_0, ..., a_15}, where
 *
 *         i
 *        ===
 *        \                  j
 * a   =  /    q         .  4
 *  i     ===   (15 - j)
 *       j = 0
 *
 *
 * From this, we can extract a quad by validating that
 *
 *
 *  a      - 4 . a  ϵ [0, 1, 2, 3]
 *   i + 1        i
 *
 * Once we have validated the above, we can then extract an accumulator's implicit quad via:
 *
 *  q  =  a      - 4 . a  ϵ [0, 1, 2, 3]
 *   i     i + 1        i
 *
 *
 * But of course it's not so simple! A XOR polynomial identity with two input quads (plus selector) has a degree of 7.
 * To constrain the degree of our quotient polynomial T(X) we want our identity to have a degree of 5
 *
 * We also have a spare column to work with, which we can use to store the low-order bit of one accumulators quad.
 *
 * For the identity, we use the following notation:
 *
 *  (1) 'q' is the current round quad attributed to 'a'
 *  (2) 'b0' is the low-order bit of the current round quad attributed to 'b'
 *  (3) 'b1' is the high-order bit of the current round quad attributed to 'b'
 *  (4) 'qc' is the current round quad attributed to output 'c'
 *
 *
 *
 *                                             3
 *                      2                   4 q  (b1 - b0) + q (14 b1 - 20 b0)
 *  qc = b0 + 2 b1 + 6 q  (b0 - b1) + 3 q + ----------------------------------
 *                                                           3
 *
 * Clear as mud, right?
 *
 * We place our accumulating sums (A, B, C) in program memory in the following sequence:
 *
 * +-----+-----+-----+-----+
 * |  A  |  B  |  C  |  D  |
 * +-----+-----+-----+-----+
 * | 0   | 0   | b1  | 0   |
 * | A1  | B1  | b2  | C1  |
 * | A2  | B2  | b3  | C2  |
 * | ... | ... | ... | ... |
 * | An  | Bn  | --- | Cn  |
 * +-----+-----+-----+-----+
 *
 **/
fr::field_t ProverTurboXorWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                const transcript::Transcript& transcript)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t alpha_a = alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);

    fr::field_t* w_1_fft = &key->wire_ffts.at("w_1_fft")[0];
    fr::field_t* w_2_fft = &key->wire_ffts.at("w_2_fft")[0];
    fr::field_t* w_3_fft = &key->wire_ffts.at("w_3_fft")[0];
    fr::field_t* w_4_fft = &key->wire_ffts.at("w_4_fft")[0];

    fr::field_t* quotient_large = &key->quotient_large[0];

    fr::field_t minus_two;
    fr::field_t minus_three;
    fr::__add(fr::one, fr::one, minus_two);
    fr::__add(minus_two, fr::one, minus_three);
    fr::__neg(minus_two, minus_two);
    fr::__neg(minus_three, minus_three);

    fr::field_t one_third = fr::to_montgomery_form({ { 3, 0, 0, 0 } });
    fr::__invert(one_third, one_third);

    ITERATE_OVER_DOMAIN_START(key->large_domain);

    fr::field_t delta_c;
    fr::field_t delta_b;
    fr::field_t delta_c;

    fr::__add(w_1_fft[i], w_1_fft[i], delta_a);
    fr::__add(delta_a, delta_a, delta_a);
    fr::__sub(w_1_fft[i + 4], delta_a, delta_a);

    fr::__add(w_2_fft[i], w_2_fft[i], delta_b);
    fr::__add(delta_b, delta_b, delta_b);
    fr::__sub(w_2_fft[i + 4], delta_b, delta_b);

    fr::__add(w_4_fft[i], w_4_fft[i], delta_c);
    fr::__add(delta_c, delta_c, delta_c);
    fr::__sub(w_4_fft[i + 4], delta_c, delta_c);

    fr::field_t b0 = w_3_fft[i];
    fr::field_t b1 = fr::sub(delta_b, b0);

    fr::field_t fr::field_t xor_identity;
    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_fft[i], w_4_fft[i], delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_3_fft[i], delta_1, delta_1);

    fr::__add(w_3_fft[i], w_3_fft[i], delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_fft[i], delta_2, delta_2);

    fr::__add(w_2_fft[i], w_2_fft[i], delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_fft[i], delta_3, delta_3);

    fr::__add(w_1_fft[i], w_1_fft[i], delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_fft[i + 4], delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t range_accumulator = fr::zero;
    fr::__sqr_with_coarse_reduction(delta_1, T0);
    fr::__sub_with_coarse_reduction(T0, delta_1, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_1, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_1, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_a, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_2, T0);
    fr::__sub_with_coarse_reduction(T0, delta_2, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_2, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_2, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_b, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_3, T0);
    fr::__sub_with_coarse_reduction(T0, delta_3, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_3, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_3, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_c, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__sqr_with_coarse_reduction(delta_4, T0);
    fr::__sub_with_coarse_reduction(T0, delta_4, T0);      // D(D - 1)
    fr::__add_without_reduction(delta_4, minus_two, T1);   // (D - 2)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)
    fr::__add_without_reduction(delta_4, minus_three, T1); // (D - 3)
    fr::__mul_with_coarse_reduction(T0, T1, T0);           // D(D - 1)(D - 2)(D - 3)
    fr::__mul_with_coarse_reduction(T0, alpha_d, T0);      // D(D - 1)(D - 2)(D - 3)alpha
    fr::__add(range_accumulator, T0, range_accumulator);

    fr::__mul(range_accumulator, q_xor_fft[i], range_accumulator);
    fr::__add(quotient_large[i], range_accumulator, quotient_large[i]);
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_d, alpha);
}

void ProverTurboXorWidget::compute_transcript_elements(transcript::Transcript&) {}

fr::field_t ProverTurboXorWidget::compute_linear_contribution(const fr::field_t& alpha_base,
                                                              const transcript::Transcript& transcript,
                                                              barretenberg::polynomial& r)
{
    fr::field_t alpha = fr::serialize_from_buffer(transcript.get_challenge("alpha").begin());

    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_2_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_3_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t alpha_a = alpha_base;
    fr::field_t alpha_b = fr::mul(alpha_a, alpha);
    fr::field_t alpha_c = fr::mul(alpha_b, alpha);
    fr::field_t alpha_d = fr::mul(alpha_c, alpha);

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_eval, w_4_eval, delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_3_eval, delta_1, delta_1);

    fr::__add(w_3_eval, w_3_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_eval, delta_2, delta_2);

    fr::__add(w_2_eval, w_2_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_eval, delta_3, delta_3);

    fr::__add(w_1_eval, w_1_eval, delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_omega_eval, delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;

    fr::__sub(delta_1, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_1, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_a, delta_1);

    fr::__sub(delta_2, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_2, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_b, delta_2);

    fr::__sub(delta_3, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_3, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_c, delta_3);

    fr::__sub(delta_4, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_4, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_d, delta_4);

    fr::field_t range_multiplicand;
    fr::__add(delta_1, delta_2, range_multiplicand);
    fr::__add(range_multiplicand, delta_3, range_multiplicand);
    fr::__add(range_multiplicand, delta_4, range_multiplicand);

    ITERATE_OVER_DOMAIN_START(key->small_domain);
    fr::field_t T3;
    fr::__mul(range_multiplicand, q_xor[i], T3);
    fr::__add(r[i], T3, r[i]);
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_d, alpha);
}

fr::field_t ProverTurboXorWidget::compute_opening_poly_contribution(const fr::field_t& nu_base,
                                                                    const transcript::Transcript&,
                                                                    fr::field_t*,
                                                                    fr::field_t*)
{
    return nu_base;
}

std::unique_ptr<VerifierBaseWidget> ProverTurboXorWidget::compute_preprocessed_commitments(
    const ReferenceString& reference_string) const
{
    polynomial polys[1]{ polynomial(q_xor, key->small_domain.size) };

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(1);

    for (size_t i = 0; i < 1; ++i) {
        g1::jacobian_to_affine(scalar_multiplication::pippenger(
                                   polys[i].get_coefficients(), reference_string.monomials, key->small_domain.size),
                               commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierTurboXorWidget>(commitments);
    return result;
}

// ###

VerifierTurboXorWidget::VerifierTurboXorWidget(std::vector<barretenberg::g1::affine_element>& instance_commitments)
    : VerifierBaseWidget()
{
    ASSERT(instance_commitments.size() == 1);
    instance = std::vector<g1::affine_element>{ instance_commitments[0] };
}

barretenberg::fr::field_t VerifierTurboXorWidget::compute_quotient_evaluation_contribution(
    const fr::field_t& alpha_base, const transcript::Transcript&, fr::field_t&, const evaluation_domain&)
{
    return alpha_base;
}

barretenberg::fr::field_t VerifierTurboXorWidget::compute_batch_evaluation_contribution(
    barretenberg::fr::field_t&, const barretenberg::fr::field_t& nu_base, const transcript::Transcript&)
{
    return nu_base;
}

VerifierBaseWidget::challenge_coefficients VerifierTurboXorWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients& challenge,
    const transcript::Transcript& transcript,
    std::vector<barretenberg::g1::affine_element>& points,
    std::vector<barretenberg::fr::field_t>& scalars)
{
    fr::field_t w_4_eval = fr::serialize_from_buffer(&transcript.get_element("w_4")[0]);
    fr::field_t w_1_eval = fr::serialize_from_buffer(&transcript.get_element("w_1")[0]);
    fr::field_t w_2_eval = fr::serialize_from_buffer(&transcript.get_element("w_2")[0]);
    fr::field_t w_3_eval = fr::serialize_from_buffer(&transcript.get_element("w_3")[0]);
    fr::field_t w_4_omega_eval = fr::serialize_from_buffer(&transcript.get_element("w_4_omega")[0]);

    fr::field_t alpha_a = challenge.alpha_base; // fr::mul(challenge.alpha_base, challenge.alpha_step);
    fr::field_t alpha_b = fr::mul(alpha_a, challenge.alpha_step);
    fr::field_t alpha_c = fr::mul(alpha_b, challenge.alpha_step);
    fr::field_t alpha_d = fr::mul(alpha_c, challenge.alpha_step);

    fr::field_t delta_1;
    fr::field_t delta_2;
    fr::field_t delta_3;
    fr::field_t delta_4;

    fr::__add(w_4_eval, w_4_eval, delta_1);
    fr::__add(delta_1, delta_1, delta_1);
    fr::__sub(w_3_eval, delta_1, delta_1);

    fr::__add(w_3_eval, w_3_eval, delta_2);
    fr::__add(delta_2, delta_2, delta_2);
    fr::__sub(w_2_eval, delta_2, delta_2);

    fr::__add(w_2_eval, w_2_eval, delta_3);
    fr::__add(delta_3, delta_3, delta_3);
    fr::__sub(w_1_eval, delta_3, delta_3);

    fr::__add(w_1_eval, w_1_eval, delta_4);
    fr::__add(delta_4, delta_4, delta_4);
    fr::__sub(w_4_omega_eval, delta_4, delta_4);

    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;

    fr::__sub(delta_1, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_1, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_a, delta_1);

    fr::__sub(delta_2, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_2, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_b, delta_2);

    fr::__sub(delta_3, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_3, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_c, delta_3);

    fr::__sub(delta_4, fr::one, T0);
    fr::__sub(T0, fr::one, T1);
    fr::__sub(T1, fr::one, T2);
    fr::__mul(T0, delta_4, T0);
    fr::__mul(T0, T1, T0);
    fr::__mul(T0, T2, T0);
    fr::__mul(T0, alpha_d, delta_4);

    fr::field_t range_multiplicand;
    fr::__add(delta_1, delta_2, range_multiplicand);
    fr::__add(range_multiplicand, delta_3, range_multiplicand);
    fr::__add(range_multiplicand, delta_4, range_multiplicand);
    fr::__mul(range_multiplicand, challenge.linear_nu, range_multiplicand);

    if (g1::on_curve(instance[0])) {
        points.push_back(instance[0]);
        scalars.push_back(range_multiplicand);
    }

    return VerifierBaseWidget::challenge_coefficients{ fr::mul(alpha_d, challenge.alpha_step),
                                                       challenge.alpha_step,
                                                       challenge.nu_base,
                                                       challenge.nu_step,
                                                       challenge.linear_nu };
}
} // namespace waffle