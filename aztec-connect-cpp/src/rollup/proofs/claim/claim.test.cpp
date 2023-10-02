#include "../../constants.hpp"
#include "../../fixtures/user_context.hpp"
#include "index.hpp"
#include "../inner_proof_data/inner_proof_data.hpp"
#include "../notes/native/index.hpp"
#include "../notes/circuit/index.hpp"
#include "./claim_circuit.hpp"
#include <common/test.hpp>
#include <cstddef>
#include <iterator>
#include <stdlib/merkle_tree/index.hpp>
#include <numeric/random/engine.hpp>
#include <string>
#include <utility>

#define ENABLE_MALICIOUS_RATIO_CHECK_FOR_TESTS
#include "./malicious_claim_circuit.hpp"
#undef ENABLE_MALICIOUS_RATIO_CHECK_FOR_TESTS
namespace rollup {
namespace proofs {
namespace claim {

using namespace barretenberg;
using namespace plonk::stdlib::types::turbo;
using namespace plonk::stdlib::merkle_tree;
using namespace rollup::proofs::notes::native;
using namespace rollup::proofs::notes::native::claim;

namespace {
std::shared_ptr<waffle::FileReferenceStringFactory> srs;
circuit_data cd;
auto& engine = numeric::random::get_debug_engine();
} // namespace

class claim_tests : public ::testing::Test {
  protected:
    static void SetUpTestCase()
    {
        srs = std::make_shared<waffle::FileReferenceStringFactory>("../barretenberg/cpp/srs_db/ignition");
        cd = get_circuit_data(srs);
    }

    virtual void SetUp()
    {
        store = std::make_unique<MemoryStore>();
        data_tree = std::make_unique<MerkleTree<MemoryStore>>(*store, DATA_TREE_DEPTH, 0);
        defi_tree = std::make_unique<MerkleTree<MemoryStore>>(*store, DEFI_TREE_DEPTH, 1);
        user = rollup::fixtures::create_user_context();
    }

    template <typename T, typename Tree> void append_note(T const& note, Tree& tree)
    {
        tree->update_element(tree->size(), note.commit());
    }

    claim_tx create_claim_tx(claim_note const& claim_note,
                             uint32_t claim_note_index,
                             uint32_t defi_note_index,
                             defi_interaction::note const& interaction_note)
    {
        claim_tx tx;
        tx.data_root = data_tree->root();
        tx.claim_note = claim_note;
        tx.claim_note_index = claim_note_index;
        tx.claim_note.fee = claim_note.fee;
        tx.claim_note_path = data_tree->get_hash_path(claim_note_index);

        tx.defi_root = defi_tree->root();
        tx.defi_note_index = defi_note_index;
        tx.defi_interaction_note = interaction_note;
        tx.defi_interaction_note_path = defi_tree->get_hash_path(defi_note_index);

        tx.output_value_a = ((uint512_t(claim_note.deposit_value) * uint512_t(interaction_note.total_output_value_a)) /
                             uint512_t(interaction_note.total_input_value))
                                .lo;
        tx.output_value_b = ((uint512_t(claim_note.deposit_value) * uint512_t(interaction_note.total_output_value_b)) /
                             uint512_t(interaction_note.total_input_value))
                                .lo;
        return tx;
    }

    rollup::fixtures::user_context user;
    std::unique_ptr<MemoryStore> store;
    std::unique_ptr<MerkleTree<MemoryStore>> data_tree;
    std::unique_ptr<MerkleTree<MemoryStore>> defi_tree;
    const uint32_t asset_id = 1;
    const uint32_t empty_virtual_asset_id = uint32_t(1) << (MAX_NUM_ASSETS_BIT_LENGTH - 1);
};

TEST_F(claim_tests, test_claim_and_detect_circuit_change)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    EXPECT_TRUE(verify_logic(tx, cd).logic_verified);
    // The below part detects changes in the claim circuit
    size_t number_of_gates_claim = get_number_of_gates();
    auto vk_hash_claim = get_verification_key()->sha256_hash();
    // If the below assertions fail, consider changing the variable is_circuit_change_expected to 1 in
    // rollup/constants.hpp and see if atleast the next power of two limit is not exceeded. Please change the constant
    // values accordingly and set is_circuit_change_expected to 0 in rollup/constants.hpp before merging.
    if (!(circuit_gate_count::is_circuit_change_expected)) {
        EXPECT_EQ(number_of_gates_claim, circuit_gate_count::CLAIM)
            << "The gate count for the claim circuit is changed.";
        EXPECT_EQ(from_buffer<uint256_t>(vk_hash_claim), circuit_vk_hash::CLAIM)
            << "The verification key hash for the claim circuit is changed: " << from_buffer<uint256_t>(vk_hash_claim);
        // For the next power of two limit, we need to consider that we reserve four gates for adding
        // randomness/zero-knowledge
        EXPECT_LE(number_of_gates_claim,
                  circuit_gate_next_power_of_two::CLAIM - waffle::ComposerBase::NUM_RESERVED_GATES)
            << "You have exceeded the next power of two limit for the claim circuit.";
    } else {
        EXPECT_LE(number_of_gates_claim,
                  circuit_gate_next_power_of_two::CLAIM - waffle::ComposerBase::NUM_RESERVED_GATES)
            << "You have exceeded the next power of two limit for the claim circuit.";
    }
}

TEST_F(claim_tests, test_theft_via_field_overflow_fails_1)
{
    // Choose values to retain the ratio (deposit * total_output_value_a) == (output_value_a * total_input_value)
    // deposit value: 1
    // total_input_value: 2
    // total_output_value_a: 1
    // output_value_a: 10944121435919637611123202872628637544274182200208017171849102093287904247809; // = 2^(-1)

    uint256_t o_v_a(
        0xA1F0FAC9F8000001ULL, 0x9419F4243CDCB848ULL, 0xDC2822DB40C0AC2EULL, 0x183227397098D014ULL); // 2^(-1)

    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 2,
                                           .total_output_value_a = 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = o_v_a; // choose the cheeky large output value

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: output_value_a");
}

TEST_F(claim_tests, test_theft_via_field_overflow_fails_2)
{
    // Choose values to retain the ratio (deposit * total_output_value_a) == (output_value_a * total_input_value)
    // deposit value: 1
    // total_input_value: 74 // chosen (by brute force) so that the inverse is under 252 bits.
    // total_output_value_a: 1
    // output_value_a: 295787065835665881381708185746719933629031951356973437077002759278051466157 // 74^(-1)

    uint256_t o_v_a(
        0x507c2274294c1badULL, 0x11d7301ca7b2f039ULL, 0x21a0384b1d6cfdbcULL, 0x00a768d809f64ad0ULL); // 74^(-1)

    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 74,
                                           .total_output_value_a = 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = o_v_a; // choose the cheeky large output value, that flies under the 252-bit radar

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: subtract: output_value_a > total_output_value_a");
}

TEST_F(claim_tests, test_integer_division_works)
{
    // Choose a total_output_value_a which is not divisible (in the integers) by the user's share.
    // E.g. deposit 3 / 9. Then if the total output is 10, 1/3 * 10 = 3.333333, so should yield '3', rather than some
    // giant field element (3^(-1) * 10).
    // Tests to ensure the circuit copes with residuals correctly.

    const claim_note note1 = { .deposit_value = 3,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 9,
                                           .total_output_value_a = 10,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
}

TEST_F(claim_tests, test_outputs_larger_than_252_bits_fails)
{
    uint256_t r(
        0x43E1F593F0000001ULL, 0x2833E84879B97091ULL, 0xB85045B68181585DULL, 0x30644E72E131A029ULL); // field modulus

    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 1,
                                           .total_output_value_a = r - 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: total_output_value_a");
}

TEST_F(claim_tests, test_zero_deposit_fails)
{
    const claim_note note1 = { .deposit_value = 0,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 1,
                                           .total_output_value_a = 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "Not supported: zero deposit");
}

TEST_F(claim_tests, test_theft_via_zero_equality_fails)
{
    // Choose values so that the both sides are zero:
    // (deposit * total_output_value_a) == (output_value_a * total_input_value)
    // deposit = 0
    // total_input_value: 1
    // total_output_value_a: 0
    // output_value_a: MAX_252_BIT_VALUE

    uint256_t MAX_252_BIT_VALUE(
        0xffffffffffffffffULL, 0xffffffffffffffffULL, 0xffffffffffffffffULL, 0x00ffffffffffffffULL);
    const claim_note note1 = { .deposit_value = 0,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };
    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 1,
                                           .total_output_value_a = 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = MAX_252_BIT_VALUE; // Try to steal loads of money.

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err,
              "Not supported: zero deposit"); // This case was already caught by the ratio_check function preventing
                                              // a zero-valued denominator of b2 = total_output_value_a.
}

TEST_F(claim_tests, test_deposit_greater_than_total_fails)
{
    const claim_note note1 = { .deposit_value = 100,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };
    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 10,
                                           .total_output_value_a = 10,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 100; // Match the malicious ratio of the deposit_value:total_input_value

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: subtract: deposit_value > total_input_value");
}

TEST_F(claim_tests, test_output_value_greater_than_total_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };
    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 10,
                                           .total_output_value_a = 10,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 100; // Cheeky

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: subtract: output_value_a > total_output_value_a");
}

TEST_F(claim_tests, test_zero_output_value_fails)
{
    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 1,
                                           .total_output_value_a = 1,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 0; // We want to test whether a 0 output_value will fail

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "ratio check 1 failed");
}

TEST_F(claim_tests, test_zero_total_output_value_fails)
{
    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 1,
                                           .total_output_value_a = 0,
                                           .total_output_value_b = 0,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 1; // We want to test whether a 0 output_value will fail

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(
        result.err,
        "safe_uint_t range constraint failure: subtract: output_value_a > total_output_value_a"); // The 'division by
                                                                                                  // zero' checks aren't
                                                                                                  // even reached,
                                                                                                  // because this one
                                                                                                  // gets triggered
                                                                                                  // first.
}

TEST_F(claim_tests, test_unmatching_ratio_a_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 10; // Force an unmatching ratio (it should be 20)

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "ratio check 1 failed");
}

TEST_F(claim_tests, test_unmatching_ratio_b_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_b = 10; // Force an unmatching ratio (it should be 20)

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "ratio check 2 failed");
}

TEST_F(claim_tests, test_unmatching_bridge_call_datas_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 1, // mismatch
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "note bridge call datas don't match");
}

TEST_F(claim_tests, test_unmatching_interaction_nonces_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 1, // mismatch
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "note nonces don't match");
}

TEST_F(claim_tests, test_missing_claim_note_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    // Notice: note1 not being appended
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "claim note not a member");
}

TEST_F(claim_tests, test_missing_interaction_note_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    // Notice: note2 not being appended
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "defi interaction note not a member");
}

TEST_F(claim_tests, test_defi_note_incorrect_index_fails)
{
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 25,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    append_note(note1, data_tree);

    // add some notes to the defi tree
    for (uint32_t i = 0; i < 32; i++) {
        const defi_interaction::note empty_note = { .bridge_call_data = 0,
                                                    .interaction_nonce = 0,
                                                    .total_input_value = 0,
                                                    .total_output_value_a = 0,
                                                    .total_output_value_b = 0,
                                                    .interaction_result = 0 };
        append_note(empty_note, defi_tree);
    }

    // create some actual notes
    std::vector<defi_interaction::note> defi_notes;
    for (uint32_t i = 0; i < 32; i++) {
        const defi_interaction::note note = { .bridge_call_data = 0,
                                              .interaction_nonce = i,
                                              .total_input_value = 100 + i,
                                              .total_output_value_a = 200 + i,
                                              .total_output_value_b = 300 + i,
                                              .interaction_result = 1 };
        defi_notes.push_back(note);
        append_note(note, defi_tree);
    }

    claim_tx tx_fail =
        create_claim_tx(note1, 0, 25, defi_notes[25]); // interaction index taken from interaction nonce is not correct
    auto result = verify_logic(tx_fail, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "defi interaction note not a member");

    // the defi note is actually at index 31 + 26
    claim_tx tx_pass = create_claim_tx(note1, 0, 57, defi_notes[25]);
    result = verify_logic(tx_pass, cd);
    EXPECT_TRUE(result.logic_verified);
}

TEST_F(claim_tests, test_claim_for_virtual_note)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 0,
                                                .output_asset_id_b = empty_virtual_asset_id,
                                                .config =
                                                    bridge_call_data::bit_config{
                                                        .second_input_in_use = false,
                                                        .second_output_in_use = true // <--
                                                    },
                                                .aux_data = 0 };
    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 300,
                                           .total_output_value_b = 400,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);

    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_first_input_note_virtual)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = empty_virtual_asset_id, // <--
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 222,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
}

TEST_F(claim_tests, test_first_output_note_virtual)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = empty_virtual_asset_id, // <--
                                                .output_asset_id_b = 222,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
}

TEST_F(claim_tests, test_second_input_note_nonzero_and_not_in_use_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = empty_virtual_asset_id, // <--
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 222,
                                                .config =
                                                    bridge_call_data::bit_config{ .second_input_in_use = false, // <--
                                                                                  .second_output_in_use = false },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "Expected second_input_in_use, given input_asset_id_b != 0");
}

TEST_F(claim_tests, test_second_output_note_nonzero_and_not_in_use_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = empty_virtual_asset_id, // <--
                                                .config =
                                                    bridge_call_data::bit_config{
                                                        .second_input_in_use = false,
                                                        .second_output_in_use = false // <--
                                                    },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "Expected second_output_in_use, given output_asset_id_b != 0");
}

TEST_F(claim_tests, test_second_input_in_use_means_asset_ids_equal_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0, // <-- equal
                                                .output_asset_id_a = 0,
                                                .output_asset_id_b = 0,
                                                .config =
                                                    bridge_call_data::bit_config{ .second_input_in_use = true, // <--
                                                                                  .second_output_in_use = false },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "input asset ids must be different for the second bridge input to be in-use");
}

TEST_F(claim_tests, test_second_output_in_use_means_real_output_asset_ids_equal_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 111, // <-- equal
                                                .config =
                                                    bridge_call_data::bit_config{
                                                        .second_input_in_use = false,
                                                        .second_output_in_use = true // <--
                                                    },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "real output asset ids must be different for the second bridge output to be in-use");
}

TEST_F(claim_tests, test_second_output_in_use_and_virtual_output_asset_ids_equal)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = empty_virtual_asset_id,
                                                .output_asset_id_b = empty_virtual_asset_id, // <-- equal
                                                .config =
                                                    bridge_call_data::bit_config{
                                                        .second_input_in_use = false,
                                                        .second_output_in_use = true // <--
                                                    },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
}

TEST_F(claim_tests, test_first_bridge_output_virtual_but_invalid_placeholder_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = empty_virtual_asset_id + 1, // should be 2 ** 29.
                                                .output_asset_id_b = 0,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = false },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "output_asset_id_a detected as virtual, but has incorrect placeholder value");
}

TEST_F(claim_tests, test_second_bridge_output_virtual_but_invalid_placeholder_fails)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = empty_virtual_asset_id,
                                                .output_asset_id_b = empty_virtual_asset_id + 1, // should be 2 ** 29.
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "output_asset_id_b detected as virtual, but has incorrect placeholder value");
}

TEST_F(claim_tests, test_claim_2_outputs_full_proof)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 222,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };

    // Create some values for our circuit that are large enough to properly test the ratio checks.
    // The defi deposit value must be atmost 242 bits (since we sum up defi deposits in rollup circuit).
    auto random_value = []() {
        uint256_t a = engine.get_random_uint256();
        a.data[3] = a.data[3] & 0x0003ffffffffffffULL;
        return a;
    };
    uint256_t input_value = random_value();
    uint256_t total_input = random_value();
    uint256_t total_output_a = random_value();
    uint256_t total_output_b = random_value();

    // Check total_in >= user_in. Does not work otherwise because we get integer overflow.
    if (input_value > total_input) {
        std::swap(input_value, total_input);
    }

    // Create and add a claim note, and a defi interaction note, to the data tree.
    const claim_note note1 = { .deposit_value = input_value,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = total_input,
                                           .total_output_value_a = total_output_a,
                                           .total_output_value_b = total_output_b,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);

    // Construct transaction data.
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);

    // Verify proof.
    auto result = verify(tx, cd);
    ASSERT_TRUE(result.verified);

    uint256_t nullifier1 = compute_nullifier(note1.commit());
    uint256_t nullifier2 = defi_interaction::compute_nullifier(note2.commit(), note1.commit());

    // Compute expected public inputs.
    auto proof_data = inner_proof_data(result.proof_data);

    const value_note expected_output_note1 = { .value = tx.output_value_a,
                                               .asset_id = bridge_call_data.output_asset_id_a,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier1 };

    const value_note expected_output_note2 = { .value = tx.output_value_b,
                                               .asset_id = bridge_call_data.output_asset_id_b,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier2 };

    // Validate public inputs.
    EXPECT_EQ(proof_data.proof_id, ProofIds::DEFI_CLAIM);
    EXPECT_EQ(proof_data.note_commitment1, expected_output_note1.commit());
    EXPECT_EQ(proof_data.note_commitment2, expected_output_note2.commit());
    EXPECT_EQ(proof_data.nullifier1, nullifier1);
    EXPECT_EQ(proof_data.nullifier2, uint256_t(nullifier2));
    EXPECT_EQ(proof_data.public_value, uint256_t(0));
    EXPECT_EQ(proof_data.public_owner, fr(0));
    EXPECT_EQ(proof_data.asset_id, uint256_t(0));
    EXPECT_EQ(proof_data.merkle_root, data_tree->root());
    EXPECT_EQ(proof_data.tx_fee, uint256_t(0));
    EXPECT_EQ(proof_data.tx_fee_asset_id, bridge_call_data.input_asset_id_a);
    EXPECT_EQ(proof_data.bridge_call_data, tx.claim_note.bridge_call_data);
    EXPECT_EQ(proof_data.defi_deposit_value, uint256_t(0));
    EXPECT_EQ(proof_data.defi_root, defi_tree->root());
    EXPECT_EQ(proof_data.backward_link, fr(0));
    EXPECT_EQ(proof_data.allow_chain, uint256_t(0));
}

TEST_F(claim_tests, test_claim_1_output_full_proof)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 0,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = false },
                                                .aux_data = 0 };
    const uint32_t claim_fee = 8;

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = claim_fee,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    auto result = verify(tx, cd);

    auto proof_data = inner_proof_data(result.proof_data);

    uint256_t nullifier1 = compute_nullifier(note1.commit());
    uint256_t nullifier2 = defi_interaction::compute_nullifier(note2.commit(), note1.commit());

    const value_note expected_output_note1 = { .value = 20,
                                               .asset_id = bridge_call_data.output_asset_id_a,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier1 };

    EXPECT_EQ(proof_data.proof_id, ProofIds::DEFI_CLAIM);
    EXPECT_EQ(proof_data.note_commitment1, expected_output_note1.commit());
    EXPECT_EQ(proof_data.note_commitment2, fr(0));
    EXPECT_EQ(proof_data.nullifier1, nullifier1);
    EXPECT_EQ(proof_data.nullifier2, uint256_t(nullifier2));
    EXPECT_EQ(proof_data.public_value, uint256_t(0));
    EXPECT_EQ(proof_data.public_owner, fr(0));
    EXPECT_EQ(proof_data.asset_id, uint256_t(0));
    EXPECT_EQ(proof_data.merkle_root, data_tree->root());
    EXPECT_EQ(proof_data.tx_fee, claim_fee);
    EXPECT_EQ(proof_data.tx_fee_asset_id, bridge_call_data.input_asset_id_a);
    EXPECT_EQ(proof_data.bridge_call_data, tx.claim_note.bridge_call_data);
    EXPECT_EQ(proof_data.defi_deposit_value, uint256_t(0));
    EXPECT_EQ(proof_data.defi_root, defi_tree->root());
    EXPECT_EQ(proof_data.backward_link, fr(0));
    EXPECT_EQ(proof_data.allow_chain, uint256_t(0));

    EXPECT_TRUE(result.verified);
}

TEST_F(claim_tests, test_claim_1_output_with_virtual_note_full_proof)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = empty_virtual_asset_id,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };
    const uint32_t claim_fee = 8;
    const uint64_t defi_interaction_nonce = 2;

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = defi_interaction_nonce,
                               .fee = claim_fee,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = defi_interaction_nonce,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 1 };

    const defi_interaction::note dummy = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 100,
                                           .total_output_value_b = 100,
                                           .interaction_result = 1 };

    append_note(note1, data_tree);
    append_note(dummy, defi_tree);
    append_note(dummy, defi_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 2, note2);
    auto result = verify(tx, cd);

    auto proof_data = inner_proof_data(result.proof_data);

    uint256_t nullifier1 = compute_nullifier(note1.commit());
    uint256_t nullifier2 = defi_interaction::compute_nullifier(note2.commit(), note1.commit());

    const value_note expected_output_note1 = { .value = 20,
                                               .asset_id = bridge_call_data.output_asset_id_a,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier1 };

    const value_note expected_output_note2 = { .value = 30,
                                               .asset_id = static_cast<uint32_t>(1 << (MAX_NUM_ASSETS_BIT_LENGTH - 1)) +
                                                           defi_interaction_nonce,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier2 };

    EXPECT_EQ(proof_data.proof_id, ProofIds::DEFI_CLAIM);
    EXPECT_EQ(proof_data.merkle_root, data_tree->root());
    EXPECT_EQ(proof_data.note_commitment1, expected_output_note1.commit());
    EXPECT_EQ(proof_data.note_commitment2, expected_output_note2.commit());
    EXPECT_EQ(proof_data.nullifier1, nullifier1);
    EXPECT_EQ(proof_data.nullifier2, nullifier2);
    EXPECT_EQ(proof_data.public_value, uint256_t(0));
    EXPECT_EQ(proof_data.public_owner, fr(0));
    EXPECT_EQ(proof_data.bridge_call_data, tx.claim_note.bridge_call_data);
    EXPECT_EQ(proof_data.tx_fee, claim_fee);
    EXPECT_EQ(proof_data.tx_fee_asset_id, bridge_call_data.input_asset_id_a);
    EXPECT_EQ(proof_data.bridge_call_data, tx.claim_note.bridge_call_data);
    EXPECT_EQ(proof_data.defi_deposit_value, uint256_t(0));
    EXPECT_EQ(proof_data.defi_root, defi_tree->root());

    EXPECT_TRUE(result.verified);
}

TEST_F(claim_tests, test_claim_refund_full_proof)
{
    const bridge_call_data bridge_call_data = { .bridge_address_id = 0,
                                                .input_asset_id_a = 0,
                                                .input_asset_id_b = 0,
                                                .output_asset_id_a = 111,
                                                .output_asset_id_b = 222,
                                                .config = bridge_call_data::bit_config{ .second_input_in_use = false,
                                                                                        .second_output_in_use = true },
                                                .aux_data = 0 };

    const claim_note note1 = { .deposit_value = 10,
                               .bridge_call_data = bridge_call_data.to_uint256_t(),
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = bridge_call_data.to_uint256_t(),
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 200,
                                           .total_output_value_b = 300,
                                           .interaction_result = 0 }; // <-- refund

    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    auto result = verify(tx, cd);

    auto proof_data = inner_proof_data(result.proof_data);

    uint256_t nullifier1 = compute_nullifier(note1.commit());
    uint256_t nullifier2 = defi_interaction::compute_nullifier(note2.commit(), note1.commit());

    const value_note expected_output_note1 = { .value = 10,
                                               .asset_id = bridge_call_data.input_asset_id_a,
                                               .account_required = false,
                                               .owner = user.owner.public_key,
                                               .secret = user.note_secret,
                                               .creator_pubkey = 0,
                                               .input_nullifier = nullifier1 };

    EXPECT_EQ(proof_data.proof_id, ProofIds::DEFI_CLAIM);
    EXPECT_EQ(proof_data.note_commitment1, expected_output_note1.commit());
    EXPECT_EQ(proof_data.note_commitment2, fr(0));
    EXPECT_EQ(proof_data.nullifier1, nullifier1);
    EXPECT_EQ(proof_data.nullifier2, uint256_t(nullifier2));
    EXPECT_EQ(proof_data.public_value, uint256_t(0));
    EXPECT_EQ(proof_data.public_owner, fr(0));
    EXPECT_EQ(proof_data.asset_id, uint256_t(0));
    EXPECT_EQ(proof_data.merkle_root, data_tree->root());
    EXPECT_EQ(proof_data.tx_fee, uint256_t(0));
    EXPECT_EQ(proof_data.tx_fee_asset_id, bridge_call_data.input_asset_id_a);
    EXPECT_EQ(proof_data.bridge_call_data, tx.claim_note.bridge_call_data);
    EXPECT_EQ(proof_data.defi_deposit_value, uint256_t(0));
    EXPECT_EQ(proof_data.defi_root, defi_tree->root());
    EXPECT_EQ(proof_data.backward_link, fr(0));
    EXPECT_EQ(proof_data.allow_chain, uint256_t(0));

    EXPECT_TRUE(result.verified);
}

// RANGE CHECK TESTS

// For less verbose code, we set up some default test data here. Individual elements of the test_data can then be
// modified in each test.
class test_data {
  private:
    const uint32_t empty_virtual_asset_id = (uint32_t(1) << (MAX_NUM_ASSETS_BIT_LENGTH - 1));

  public:
    bridge_call_data bid;
    claim_note note1;
    defi_interaction::note note2;

    struct virtual_flags {
        bool in1 = false;
        bool in2 = false;
        bool out1 = false;
        bool out2 = false;
    };

    struct in_use_flags {
        bool in2 = false;
        bool out2 = false;
    };

    test_data(rollup::fixtures::user_context user,
              virtual_flags virtual_flags = { false, false, false, false },
              in_use_flags in_use = { false, false })
    {
        bid = { .bridge_address_id = 123,
                .input_asset_id_a = 456 + (virtual_flags.in1 ? empty_virtual_asset_id : 0),
                .input_asset_id_b = (in_use.in2 ? 789 : 0) + (virtual_flags.in2 ? empty_virtual_asset_id : 0),
                .output_asset_id_a = virtual_flags.out1 ? empty_virtual_asset_id : 111,
                .output_asset_id_b = in_use.out2 ? (virtual_flags.out2 ? empty_virtual_asset_id : 222) : 0,
                .config = bridge_call_data::bit_config{ .second_input_in_use = in_use.in2,
                                                        .second_output_in_use = in_use.out2 },
                .aux_data = 0 };

        // claim note:
        note1 = { .deposit_value = 10,
                  .bridge_call_data = bid.to_uint256_t(),
                  .defi_interaction_nonce = 0,
                  .fee = 0,
                  .value_note_partial_commitment =
                      create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                  .input_nullifier = fr::random_element(&engine) };

        // defi interaction note:
        note2 = { .bridge_call_data = bid.to_uint256_t(),
                  .interaction_nonce = 0,
                  .total_input_value = 100,
                  .total_output_value_a = 200,
                  .total_output_value_b = 300,
                  .interaction_result = 1 };
    };
};

// Elements of bridge_call_data are implicitly range-constrained by the bit-shifting in bridge_call_data.hpp (since bits
// outside of the valid ranges are ignored)

// Can't create tests which attempt to exceed 32-bit range for values which are 'fed in' as uint32_t

TEST_F(claim_tests, test_total_input_value_out_of_range_fails)
{
    test_data test_data(user);
    uint256_t total_input_value = uint256_t(1) << 253; // <--
    test_data.note2.total_input_value = total_input_value;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: total_input_value");
}

TEST_F(claim_tests, test_total_output_value_a_out_of_range_fails)
{
    test_data test_data(user);
    uint256_t total_output_value_a = uint256_t(1) << 253; // <--
    test_data.note2.total_output_value_a = total_output_value_a;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: total_output_value_a");
}

TEST_F(claim_tests, test_total_output_value_b_out_of_range_fails)
{
    test_data test_data(user);
    uint256_t total_output_value_b = uint256_t(1) << 253; // <--
    test_data.note2.total_output_value_b = total_output_value_b;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: total_output_value_b");
}

TEST_F(claim_tests, test_deposit_value_out_of_range_fails)
{
    test_data test_data(user);
    uint256_t deposit_value = uint256_t(1) << 253; // <--
    test_data.note1.deposit_value = deposit_value;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: deposit_value");
}

TEST_F(claim_tests, test_fee_out_of_range_fails)
{
    test_data test_data(user);
    uint256_t fee = uint256_t(1) << 253; // <--
    test_data.note1.fee = fee;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_FALSE(result.logic_verified);
    EXPECT_EQ(result.err, "safe_uint_t range constraint failure: fee");
}

TEST_F(claim_tests, test_refund_one_virtual)
{
    test_data test_data(user, { .in1 = true });
    test_data.note2.interaction_result = false;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], 0);
}

TEST_F(claim_tests, test_refund_two_virtual)
{
    test_data test_data(user, { .in1 = true, .in2 = true }, { .in2 = true });
    test_data.note2.interaction_result = false;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_refund_one_real)
{
    test_data test_data(user, {}, { .out2 = true });
    test_data.note2.interaction_result = false;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], 0);
}

TEST_F(claim_tests, test_refund_two_real)
{
    test_data test_data(user, {}, { .out2 = true });
    test_data.note2.interaction_result = false;
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_refund_virtual_real)
{
    test_data test_data(user, { .in1 = true }, { .in2 = true });
    test_data.note2.interaction_result = false;

    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_refund_real_virtual)
{
    test_data test_data(user, { .in2 = true }, { .in2 = true });
    test_data.note2.interaction_result = false;

    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_one_virtual)
{
    test_data test_data(user, { .out1 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], 0);
}

TEST_F(claim_tests, test_two_virtual)
{
    test_data test_data(user, { .out1 = true, .out2 = true }, { .out2 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_one_real)
{
    test_data test_data(user, { .in1 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], 0);
}

TEST_F(claim_tests, test_two_real)
{
    test_data test_data(user, {}, { .out2 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_virtual_real)
{
    test_data test_data(user, { .out1 = true, .out2 = true }, { .out2 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}

TEST_F(claim_tests, test_real_virtual)
{
    test_data test_data(user, { .out2 = true }, { .out2 = true });
    append_note(test_data.note1, data_tree);
    append_note(test_data.note2, defi_tree);
    claim_tx tx = create_claim_tx(test_data.note1, 0, 0, test_data.note2);

    auto result = verify_logic(tx, cd);
    EXPECT_TRUE(result.logic_verified);
    EXPECT_EQ(tx.get_output_notes()[0], result.public_inputs[InnerProofFields::NOTE_COMMITMENT1]);
    EXPECT_EQ(tx.get_output_notes()[1], result.public_inputs[InnerProofFields::NOTE_COMMITMENT2]);
}
/**
 * @brief Check that malicious prover can't submit an erroneous claim
 *
 */
TEST_F(claim_tests, test_claim_fails_if_prover_is_malicious)
{
    // Generate notes with malicious values
    const claim_note note1 = { .deposit_value = 1,
                               .bridge_call_data = 0,
                               .defi_interaction_nonce = 0,
                               .fee = 0,
                               .value_note_partial_commitment =
                                   create_partial_commitment(user.note_secret, user.owner.public_key, 0, 0),
                               .input_nullifier = fr::random_element(&engine) };

    const defi_interaction::note note2 = { .bridge_call_data = 0,
                                           .interaction_nonce = 0,
                                           .total_input_value = 100,
                                           .total_output_value_a = 100,
                                           .total_output_value_b = 100,
                                           .interaction_result = 1 };
    append_note(note1, data_tree);
    append_note(note2, defi_tree);
    claim_tx tx = create_claim_tx(note1, 0, 0, note2);
    tx.output_value_a = 100;
    tx.output_value_b = 100;

    // Create one regular composer
    Composer composer = Composer(cd.proving_key, cd.verification_key, cd.num_gates);
    // And one donor
    Composer donor = Composer(cd.proving_key, cd.verification_key, cd.num_gates);

    // Construct the circuit with malicious witness in the donor
    malicious_claim_circuit(donor, tx);

    // Construct the regular claim circuit in the regular composer
    claim_circuit(composer, tx);

    // The witness in the regular will not satisfy the contriaints
    info("Check circuit before transplant: ", composer.check_circuit());
    ASSERT_EQ(composer.variables.size(), donor.variables.size());
    // Copy the values of variables into the regular circuit
    for (size_t i = 0; i < composer.variables.size(); i++) {
        composer.variables[i] = donor.variables[i];
    }
    // If the circuit is undercontrained, the will both pass now
    info("Check donor circuit: ", donor.check_circuit());
    info("Check circuit after transplant: ", composer.check_circuit());
    Timer proof_timer;
    info(": Creating proof...");
    verify_result<Composer> result;
    auto prover = composer.create_unrolled_prover();
    auto proof = prover.construct_proof();
    result.proof_data = proof.proof_data;
    info(": Proof created in ", proof_timer.toString(), "s");
    auto verifier = composer.create_unrolled_verifier();
    result.verified = verifier.verify_proof({ result.proof_data });
    if (!result.verified) {
        info(": Proof validation failed.");
    } else {
        info(": Verified successfully.");
    }
    result.verification_key = composer.circuit_verification_key;
    EXPECT_FALSE(result.verified);
}

} // namespace claim
} // namespace proofs
} // namespace rollup