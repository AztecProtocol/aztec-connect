#include <gtest/gtest.h>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/waffle/stdlib/bitarray/bitarray.hpp>
#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/crypto/hash/pedersen.hpp>
#include <barretenberg/waffle/stdlib/group/group_utils.hpp>
#include <iostream>
#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef stdlib::field_t<waffle::TurboComposer> field_t;
typedef stdlib::witness_t<waffle::TurboComposer> witness_t;

TEST(stdlib_pedersen, test_pedersen)
{

    waffle::TurboComposer composer = waffle::TurboComposer();

    fr::field_t left_in = fr::random_element();
    fr::field_t right_in = fr::random_element();
    // ensure left has skew 1, right has skew 0
    if ((fr::from_montgomery_form(left_in).data[0] & 1) == 1) {
        fr::__add(left_in, fr::one, left_in);
    }
    if ((fr::from_montgomery_form(right_in).data[0] & 1) == 0) {
        fr::__add(right_in, fr::one, right_in);
    }
    field_t left = witness_t(&composer, left_in);
    field_t right = witness_t(&composer, right_in);

    composer.fix_witness(left.witness_index, left.get_value());
    composer.fix_witness(right.witness_index, right.get_value());

    field_t out = plonk::stdlib::pedersen::compress(left, right);

    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = waffle::preprocess(prover);

    waffle::plonk_proof proof = prover.construct_proof();

    bool result = verifier.verify_proof(proof);
    EXPECT_EQ(result, true);

    bool left_skew = false;
    bool right_skew = false;

    uint64_t left_wnafs[255] = { 0 };
    uint64_t right_wnafs[255] = { 0 };

    if ((fr::from_montgomery_form(left_in).data[0] & 1) == 0) {
        fr::field_t two = fr::add(fr::one, fr::one);
        left_in = fr::sub(left_in, two);
    }
    if ((fr::from_montgomery_form(right_in).data[0] & 1) == 0) {
        fr::field_t two = fr::add(fr::one, fr::one);
        right_in = fr::sub(right_in, two);
    }
    fr::field_t converted_left = fr::from_montgomery_form(left_in);
    fr::field_t converted_right = fr::from_montgomery_form(right_in);

    uint64_t* left_scalar = &(converted_left.data[0]);
    uint64_t* right_scalar = &(converted_right.data[0]);

    barretenberg::wnaf::fixed_wnaf<255, 1, 2>(left_scalar, &left_wnafs[0], left_skew, 0);
    barretenberg::wnaf::fixed_wnaf<255, 1, 2>(right_scalar, &right_wnafs[0], right_skew, 0);

    const auto compute_split_scalar = [](uint64_t* wnafs, const size_t range) {
        grumpkin::fr::field_t result = grumpkin::fr::zero;
        grumpkin::fr::field_t three = grumpkin::fr::to_montgomery_form({ { 3, 0, 0, 0 } });
        for (size_t i = 0; i < range; ++i) {
            uint64_t entry = wnafs[i];
            grumpkin::fr::field_t prev = grumpkin::fr::add(result, result);
            prev = grumpkin::fr::add(prev, prev);
            if ((entry & 0xffffff) == 0) {
                if (((entry >> 31UL) & 1UL) == 1UL) {
                    result = grumpkin::fr::sub(prev, grumpkin::fr::one);
                } else {
                    result = grumpkin::fr::add(prev, grumpkin::fr::one);
                }
            } else {
                if (((entry >> 31UL) & 1UL) == 1UL) {
                    result = grumpkin::fr::sub(prev, three);
                } else {
                    result = grumpkin::fr::add(prev, three);
                }
            }
        }
        return result;
    };

    grumpkin::fr::field_t grumpkin_scalars[4]{ compute_split_scalar(&left_wnafs[0], 126),
                                               compute_split_scalar(&left_wnafs[126], 2),
                                               compute_split_scalar(&right_wnafs[0], 126),
                                               compute_split_scalar(&right_wnafs[126], 2) };
    if (left_skew) {
        grumpkin::fr::__add(grumpkin_scalars[1], grumpkin::fr::one, grumpkin_scalars[1]);
    }
    if (right_skew) {
        grumpkin::fr::__add(grumpkin_scalars[3], grumpkin::fr::one, grumpkin_scalars[3]);
    }

    grumpkin::g1::affine_element grumpkin_points[4]{
        plonk::stdlib::group_utils::get_generator(0),
        plonk::stdlib::group_utils::get_generator(1),
        plonk::stdlib::group_utils::get_generator(2),
        plonk::stdlib::group_utils::get_generator(3),
    };

    grumpkin::g1::element result_points[4]{
        grumpkin::g1::group_exponentiation_inner(grumpkin_points[0], grumpkin_scalars[0]),
        grumpkin::g1::group_exponentiation_inner(grumpkin_points[1], grumpkin_scalars[1]),
        grumpkin::g1::group_exponentiation_inner(grumpkin_points[2], grumpkin_scalars[2]),
        grumpkin::g1::group_exponentiation_inner(grumpkin_points[3], grumpkin_scalars[3]),
    };

    grumpkin::g1::element hash_output_left;
    grumpkin::g1::element hash_output_right;

    grumpkin::g1::add(result_points[0], result_points[1], hash_output_left);
    grumpkin::g1::add(result_points[2], result_points[3], hash_output_right);

    grumpkin::g1::element hash_output;
    grumpkin::g1::add(hash_output_left, hash_output_right, hash_output);
    hash_output = grumpkin::g1::normalize(hash_output);

    EXPECT_EQ(fr::eq(out.get_value(), hash_output.x), true);

    fr::field_t compress_native = plonk::stdlib::group_utils::compress_native(left.get_value(), right.get_value());
    EXPECT_EQ(fr::eq(out.get_value(), compress_native), true);
}
