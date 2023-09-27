#pragma once
#include "claim_tx.hpp"
#include <atomic>
#include <stdlib/types/turbo.hpp>
#include "../notes/constants.hpp"

namespace rollup {
namespace proofs {
namespace claim {

using namespace plonk::stdlib::types::turbo;

struct ratios {
    field_ct a1;
    field_ct a2;
    field_ct b1;
    field_ct b2;

    // Get residual of a1 * b2 (mod a2)
    // Notice, it'll be 0 if a1 * b2 == k * a2 for some k.
    field_ct get_residual(Composer& composer) const
    {
        uint256_t a1_v = a1.get_value();
        uint256_t a2_v = a2.get_value();
        uint256_t b2_v = b2.get_value();

        if (a2_v != 0) {
            uint256_t remainder = ((uint512_t(b2_v) * uint512_t(a1_v)) % a2_v).lo;

            field_ct residual = witness_ct(&composer, remainder);
            return residual;
        } else {
            return witness_ct(&composer, 0);
        }
    }
};

// Validate that a1 * b1 == a2 * b2 , when (a1, b1, a2, b2) are treated as Integers
inline bool_ct product_check(Composer& composer,
                             const field_ct& a1,
                             const field_ct& b1,
                             const field_ct& a2,
                             const field_ct& b2,
                             const field_ct& residual = 0)
{
    constexpr barretenberg::fr shift_1 = barretenberg::fr(uint256_t(1) << 68);
    constexpr barretenberg::fr shift_2 = barretenberg::fr(uint256_t(1) << (68 * 2));
    constexpr barretenberg::fr shift_3 = barretenberg::fr(uint256_t(1) << (68 * 3));

    // Split a field_t element into 4 68-bit limbs
    const auto split_into_limbs = [&composer, &shift_1, &shift_2, &shift_3](const field_ct& input,
                                                                            const size_t MAX_INPUT_BITS) {
        const uint256_t value = input.get_value();

        constexpr size_t NUM_BITS_PER_LIMB = 68;

        ASSERT(MAX_INPUT_BITS <= MAX_NO_WRAP_INTEGER_BIT_LENGTH);
        ASSERT(MAX_INPUT_BITS > 0);

        const uint256_t t0 = value.slice(0, NUM_BITS_PER_LIMB);
        const uint256_t t1 = value.slice(NUM_BITS_PER_LIMB, 2 * NUM_BITS_PER_LIMB);
        const uint256_t t2 = value.slice(2 * NUM_BITS_PER_LIMB, 3 * NUM_BITS_PER_LIMB);
        const uint256_t t3 = value.slice(3 * NUM_BITS_PER_LIMB, 4 * NUM_BITS_PER_LIMB);

        std::array<field_ct, 4> limbs{
            witness_ct(&composer, t0),
            witness_ct(&composer, t1),
            witness_ct(&composer, t2),
            witness_ct(&composer, t3),
        };

        field_ct limb_sum_1 = limbs[0].add_two(limbs[1] * shift_1, limbs[2] * shift_2);
        field_ct limb_sum_2 = input - (limbs[3] * shift_3);
        limb_sum_1.assert_equal(limb_sum_2);

        // Since the modulus is a power of two minus one, wwe can simply range constrain each of the limbs
        size_t bits_left = MAX_INPUT_BITS;
        for (size_t i = 0; i < 4; i++) {
            // If we've run out of bits, enforce zero
            if (bits_left == 0) {
                limbs[i].assert_is_zero();
                // If there are not enough bits for a full lmb, reduce constraint
            } else if (bits_left < NUM_BITS_PER_LIMB) {
                limbs[i].create_range_constraint(bits_left);
                bits_left = 0;
            } else {
                // Just a regular limb
                limbs[i].create_range_constraint(NUM_BITS_PER_LIMB);
                bits_left -= NUM_BITS_PER_LIMB;
            }
        }

        return limbs;
    };

    // b1 = a1 * b2 mod a2
    // => a1 * b2 = b1 * a2 + r \in Z (equation 1)

    // split a1, a2, b1, b2, r into 68-bit limbs
    // evaluate equation 1 via limb arithmetic. The limb arithmetic *cannot overflow*

    const auto left_1 = split_into_limbs(a1, notes::DEFI_DEPOSIT_VALUE_BIT_LENGTH);
    const auto left_2 = split_into_limbs(a2, notes::NOTE_VALUE_BIT_LENGTH);
    const auto right_1 = split_into_limbs(b1, notes::NOTE_VALUE_BIT_LENGTH);
    const auto right_2 = split_into_limbs(b2, notes::NOTE_VALUE_BIT_LENGTH);
    const auto residual_limbs = split_into_limbs(residual, notes::NOTE_VALUE_BIT_LENGTH);

    // takes a [204-208]-bit limb and splits it into a low 136-bit limb and a high 72-bit limb
    const auto split_out_carry_term = [&composer, &shift_2](const field_ct& limb) {
        const uint256_t limb_val = limb.get_value();

        const uint256_t lo_val = limb_val.slice(0, 68 * 2);
        const uint256_t hi_val = limb_val.slice(68 * 2, 256);

        const field_ct lo(witness_ct(&composer, lo_val));
        const field_ct hi(witness_ct(&composer, hi_val));

        lo.create_range_constraint(68 * 2);
        hi.create_range_constraint(72); // allow for 4 overflow bits

        limb.assert_equal(lo + (hi * shift_2));

        return std::array<field_ct, 2>{ lo, hi };
    };

    // Use schoolbook multiplication algorithm to multiply 2 4-limbed values together, then convert result into 4
    // 2-limb values (with limbs twice the size) that do not overlap
    const auto compute_product_limbs = [&split_out_carry_term, &shift_1](const std::array<field_ct, 4>& left,
                                                                         const std::array<field_ct, 4>& right,
                                                                         const std::array<field_ct, 4>& to_add,
                                                                         const bool use_residual = false) {
        // a = left[0] * right[0];
        const field_ct b = left[0].madd(right[1], left[1] * right[0]);
        const field_ct c = left[0].madd(right[2], left[1].madd(right[1], left[2] * right[0]));
        const field_ct d = left[0].madd(right[3], left[1].madd(right[2], left[2].madd(right[1], left[3] * right[0])));
        const field_ct e = left[1].madd(right[3], left[2].madd(right[2], left[3] * right[1]));
        const field_ct f = left[2].madd(right[3], left[3] * right[2]);
        // g = left[3] * right[3];

        if (use_residual) {
            const auto t0 =
                split_out_carry_term(to_add[0] + left[0].madd(right[0], (b * shift_1) + to_add[1] * shift_1));
            const auto r0 = t0[0];
            const auto t1 = split_out_carry_term(t0[1].add_two(c + to_add[2], to_add[3] * shift_1 + d * shift_1));
            const auto r1 = t1[0];
            const auto t2 = split_out_carry_term(t1[1].add_two(e, f * shift_1));
            const auto r2 = t2[0];
            const auto r3 = left[3].madd(right[3], t2[1]);
            return std::array<field_ct, 4>{ r0, r1, r2, r3 };
        }

        const auto t0 = split_out_carry_term(left[0].madd(right[0], (b * shift_1)));
        const auto r0 = t0[0];
        const auto t1 = split_out_carry_term(t0[1].add_two(c, d * shift_1));
        const auto r1 = t1[0];
        const auto t2 = split_out_carry_term(t1[1].add_two(e, f * shift_1));
        const auto r2 = t2[0];
        const auto r3 = left[3].madd(right[3], t2[1]);
        return std::array<field_ct, 4>{ r0, r1, r2, r3 };
    };

    const auto lhs = compute_product_limbs(left_1, right_1, { 0, 0, 0, 0 }, false);
    const auto rhs = compute_product_limbs(left_2, right_2, residual_limbs, true);

    bool_ct balanced(&composer, true);
    for (size_t i = 0; i < 4; ++i) {
        balanced = balanced && lhs[i] == rhs[i];
    }

    return balanced;
}

/**
 * Will return true if the ratios are the same, false if not or if either denominator is 0.
 * Effectively: a1 / a2 == b1 / b2
 */
inline bool_ct ratio_check(Composer& composer, ratios const& ratios)
{
    const field_ct residual = ratios.get_residual(composer);

    // we have the following implicit definitions for `ratios.a1/a2/b1/b2`:
    //       a1 = deposit_value
    //       a2 = total_input_value
    //       b1 = output_value
    //       b2 = total_output_value
    //
    // we want the following expression over the integers:
    //       output_value = (deposit_value * total_output_value) / total_input_value
    //
    // we do this via checking:
    //      a1 * b2 == b1 * a2 + residual
    //
    // where `residual` is a remainder term in case `deposit_value * total_output_value` is not divisible by
    // `total_input_value` this requires us to validate that `residual < total_input_value`

    ratios.a1.create_range_constraint(notes::DEFI_DEPOSIT_VALUE_BIT_LENGTH, "ratio_check range constraint failure: a1");
    ratios.a2.create_range_constraint(notes::NOTE_VALUE_BIT_LENGTH, "ratio_check range constraint failure: a2");
    ratios.b1.create_range_constraint(notes::NOTE_VALUE_BIT_LENGTH, "ratio_check range constraint failure: b1");
    ratios.b2.create_range_constraint(notes::NOTE_VALUE_BIT_LENGTH, "ratio_check range constraint failure: b2");
    residual.create_range_constraint(notes::NOTE_VALUE_BIT_LENGTH, "ratio_check range constraint failure: residual");
    // We need to assert that residual < a2
    // i.e. a2 - residual > 0 => a2 - residual - 1 >= 0
    (ratios.a2 - residual - 1)
        .normalize()
        .create_range_constraint(notes::NOTE_VALUE_BIT_LENGTH, "ratio_check range constraint failure: residual >= a2");

    return (ratios.a2 != 0) && (ratios.b2 != 0) &&
           product_check(composer, ratios.a1, ratios.b2, ratios.b1, ratios.a2, residual);
}

} // namespace claim
} // namespace proofs
} // namespace rollup