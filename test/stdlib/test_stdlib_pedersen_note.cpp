#include <gtest/gtest.h>

#include <barretenberg/curves/grumpkin/grumpkin.hpp>
#include <barretenberg/waffle/composer/turbo_composer.hpp>
#include <barretenberg/waffle/proof_system/preprocess.hpp>
#include <barretenberg/waffle/proof_system/prover/prover.hpp>
#include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
#include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

#include <barretenberg/waffle/stdlib/bitarray/bitarray.hpp>
#include <barretenberg/waffle/stdlib/common.hpp>
#include <barretenberg/waffle/stdlib/crypto/commitment/pedersen_note.hpp>
#include <barretenberg/waffle/stdlib/group/group_utils.hpp>
#include <iostream>
#include <memory>

using namespace barretenberg;
using namespace plonk;

typedef stdlib::field_t<waffle::TurboComposer> field_t;
typedef stdlib::witness_t<waffle::TurboComposer> witness_t;
typedef stdlib::witness_t<waffle::TurboComposer> public_witness_t;

TEST(stdlib_pedersen_note, test_pedersen_note)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    fr::field_t view_key_value = fr::random_element();
    view_key_value.data[3] = view_key_value.data[3] & 0x3FFFFFFFFFFFFFFFULL;
    view_key_value = fr::to_montgomery_form(view_key_value);

    fr::field_t note_value = fr::to_montgomery_form({{ 9999, 0, 0, 0 }});

    grumpkin::g1::element left = plonk::stdlib::group_utils::fixed_base_scalar_mul<32>(note_value, 0);
    grumpkin::g1::element right = plonk::stdlib::group_utils::fixed_base_scalar_mul<250>(view_key_value, 1);
    grumpkin::g1::element expected;
    grumpkin::g1::add(left, right, expected);
    expected = grumpkin::g1::normalize(expected);

    field_t view_key = public_witness_t(&composer, view_key_value);
    field_t note_value_field = public_witness_t(&composer, note_value);
    field_t ciphertext_x = public_witness_t(&composer, expected.x);
    field_t ciphertext_y = public_witness_t(&composer, expected.y);

    plonk::stdlib::pedersen_note::note note{{ ciphertext_x, ciphertext_y }};
    plonk::stdlib::uint<waffle::TurboComposer, uint32_t> value(note_value_field);

    plonk::stdlib::pedersen_note::note result = plonk::stdlib::pedersen_note::compute_commitment(view_key, value);
    composer.assert_equal(result.ciphertext.x.witness_index, note.ciphertext.x.witness_index);
    composer.assert_equal(result.ciphertext.y.witness_index, note.ciphertext.y.witness_index);

    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}


TEST(stdlib_pedersen_note, test_pedersen_note_zero)
{
    waffle::TurboComposer composer = waffle::TurboComposer();

    fr::field_t view_key_value = fr::random_element();
    view_key_value.data[3] = view_key_value.data[3] & 0x3FFFFFFFFFFFFFFFULL;
    view_key_value = fr::to_montgomery_form(view_key_value);

    fr::field_t note_value = fr::to_montgomery_form({{ 0, 0, 0, 0 }});

    grumpkin::g1::element expected = plonk::stdlib::group_utils::fixed_base_scalar_mul<250>(view_key_value, 1);
    expected = grumpkin::g1::normalize(expected);

    field_t view_key = public_witness_t(&composer, view_key_value);
    field_t note_value_field = public_witness_t(&composer, note_value);
    field_t ciphertext_x = public_witness_t(&composer, expected.x);
    field_t ciphertext_y = public_witness_t(&composer, expected.y);

    plonk::stdlib::pedersen_note::note note{{ ciphertext_x, ciphertext_y }};
    plonk::stdlib::uint<waffle::TurboComposer, uint32_t> value(note_value_field);

    plonk::stdlib::pedersen_note::note result = plonk::stdlib::pedersen_note::compute_commitment(view_key, value);
    composer.assert_equal(result.ciphertext.x.witness_index, note.ciphertext.x.witness_index);
    composer.assert_equal(result.ciphertext.y.witness_index, note.ciphertext.y.witness_index);

    waffle::TurboProver prover = composer.preprocess();

    printf("composer gates = %zu\n", composer.get_num_gates());
    waffle::TurboVerifier verifier = composer.create_verifier();

    waffle::plonk_proof proof = prover.construct_proof();

    bool proof_result = verifier.verify_proof(proof);
    EXPECT_EQ(proof_result, true);
}

