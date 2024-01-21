#pragma once
#include "claim_tx.hpp"
#include <stdlib/types/turbo.hpp>
#include "malicious_ratio_check.hpp"
#include "../notes/circuit/index.hpp"
#include <stdlib/merkle_tree/membership.hpp>

#ifndef ENABLE_MALICIOUS_RATIO_CHECK_FOR_TESTS
static_assert(false, "THIS FILE CAN ONLY BE USED INT TESTS");
#endif
namespace rollup {
namespace proofs {
namespace claim {

using namespace plonk::stdlib::types::turbo;
using namespace plonk::stdlib::merkle_tree;
using namespace notes;
/**
 * @brief This function creates the same circuit as the regular claim circuit, but feels it with malicious witness
 *
 * @param composer
 * @param tx
 */
void malicious_claim_circuit(Composer& composer, claim_tx const& tx)
{
    // Create witnesses.
    const auto proof_id = field_ct(witness_ct(&composer, ProofIds::DEFI_CLAIM));
    proof_id.assert_equal(ProofIds::DEFI_CLAIM);
    const auto data_root = field_ct(witness_ct(&composer, tx.data_root));
    const auto defi_root = field_ct(witness_ct(&composer, tx.defi_root));
    const auto claim_note_index =
        suint_ct(witness_ct(&composer, tx.claim_note_index), DATA_TREE_DEPTH, "claim_note_index");
    const auto claim_note_path = create_witness_hash_path(composer, tx.claim_note_path);
    const auto defi_note_index =
        suint_ct(witness_ct(&composer, tx.defi_note_index), DEFI_TREE_DEPTH, "defi_note_index");

    /**
     * Conversion to `claim_note_witness_data` contains:
     *   - range constraints on the claim note's attributes
     *   - expansion of bridge_call_data
     *     - expansion of the bridge_call_data's bit_config
     *       - sense checks on the bit_config's values
     *         (some bits can contradict each other)
     */
    const auto claim_note_data = circuit::claim::claim_note_witness_data(composer, tx.claim_note);

    const auto claim_note = circuit::claim::claim_note(claim_note_data);
    const auto defi_interaction_note_path = create_witness_hash_path(composer, tx.defi_interaction_note_path);

    /**
     * Implicit conversion to `defi_interaction::witness_data` includes:
     *   - range constraints on the defi_interaction_note's attributes
     *   - expansion of bridge_call_data
     *     - expansion of the bridge_call_data's bit_config
     *       - sense checks on the bit_config's values
     *         (some bits can contradict each other)
     */
    const auto defi_interaction_note = circuit::defi_interaction::note({ composer, tx.defi_interaction_note });
    const auto output_value_a =
        suint_ct(witness_ct(&composer, tx.output_value_a), NOTE_VALUE_BIT_LENGTH, "output_value_a");
    const auto output_value_b =
        suint_ct(witness_ct(&composer, tx.output_value_b), NOTE_VALUE_BIT_LENGTH, "output_value_b");

    const bool_ct first_output_virtual =
        circuit::get_asset_id_flag(claim_note_data.bridge_call_data_local.output_asset_id_a);
    const bool_ct second_output_virtual =
        circuit::get_asset_id_flag(claim_note_data.bridge_call_data_local.output_asset_id_b);
    const bool_ct& second_input_in_use = claim_note_data.bridge_call_data_local.config.second_input_in_use;
    const bool_ct& second_output_in_use = claim_note_data.bridge_call_data_local.config.second_output_in_use;

    {
        // Don't support zero deposits (because they're illogical):
        claim_note.deposit_value.value.assert_is_not_zero("Not supported: zero deposit");
        // Ensure deposit_value <= total_input_value
        defi_interaction_note.total_input_value.subtract(
            claim_note.deposit_value, NOTE_VALUE_BIT_LENGTH, "deposit_value > total_input_value");
        // These checks are superfluous, but included just in case:
        // Ensure output_value_a <= total_output_value_a
        defi_interaction_note.total_output_value_a.subtract(
            output_value_a, NOTE_VALUE_BIT_LENGTH, "output_value_a > total_output_value_a");
        // Ensure output_value_b <= total_output_value_b
        defi_interaction_note.total_output_value_b.subtract(
            output_value_b, NOTE_VALUE_BIT_LENGTH, "output_value_b > total_output_value_b");
    }

    {
        // Ratio checks.
        // Note, these ratio_checks also guarantee:
        //   defi_interaction_note.total_input_value != 0
        //   defi_interaction_note.total_output_value_a != 0 (unless output_value_a == 0)
        //   defi_interaction_note.total_output_value_b != 0 (unless output_value_b == 0)

        // Check that (deposit * total_output_value_a) == (output_value_a * total_input_value)
        // Rearranging, this ensures output_value_a == (deposit / total_input_value) * total_output_value_a
        const bool_ct rc1 = malicious_ratio_check(composer,
                                                  { .a1 = claim_note.deposit_value.value,
                                                    .a2 = defi_interaction_note.total_input_value.value,
                                                    .b1 = output_value_a.value,
                                                    .b2 = defi_interaction_note.total_output_value_a.value });
        const bool_ct valid1 = (output_value_a == 0 && defi_interaction_note.total_output_value_a == 0) || rc1;
        valid1.assert_equal(true, "ratio check 1 failed");

        // Check that (deposit * total_output_value_b) == (output_value_b * total_input_value)
        // Rearranging, this ensures output_value_b == (deposit / total_input_value) * total_output_value_b
        const bool_ct rc2 = malicious_ratio_check(composer,
                                                  { .a1 = claim_note.deposit_value.value,
                                                    .a2 = defi_interaction_note.total_input_value.value,
                                                    .b1 = output_value_b.value,
                                                    .b2 = defi_interaction_note.total_output_value_b.value });
        const bool_ct valid2 = (output_value_b == 0 && defi_interaction_note.total_output_value_b == 0) || rc2;
        valid2.assert_equal(true, "ratio check 2 failed");
    }

    // This nullifier1 is unique because the claim_note.commitment is unique (which itself is unique because it contains
    // a unique input_nullifier (from the defi-deposit tx which created it)).
    const auto nullifier1 = circuit::claim::compute_nullifier(claim_note.commitment);

    // We 'nullify' this (claim note, defi interaction note) combination. Each owner of a claim note can produce a valid
    // nullifier.
    const auto nullifier2 =
        circuit::defi_interaction::compute_nullifier(defi_interaction_note.commitment, claim_note.commitment);

    field_ct output_note_commitment1;
    field_ct output_note_commitment2;
    {
        // Compute output notes.
        const auto virtual_note_flag = suint_ct(uint256_t(1) << (MAX_NUM_ASSETS_BIT_LENGTH - 1));

        // If the defi interaction was unsuccessful, refund the original defi_deposit_value (which was denominated in
        // bridge input_asset_id_a) via output note 1.
        const bool_ct& interaction_success = defi_interaction_note.interaction_result;
        const auto output_value_1 =
            suint_ct::conditional_assign(interaction_success, output_value_a, claim_note_data.deposit_value);
        const auto output_asset_id_1_if_success =
            suint_ct::conditional_assign(first_output_virtual,
                                         virtual_note_flag + claim_note.defi_interaction_nonce,
                                         claim_note_data.bridge_call_data_local.output_asset_id_a);
        const auto output_asset_id_1 = suint_ct::conditional_assign(
            interaction_success, output_asset_id_1_if_success, claim_note_data.bridge_call_data_local.input_asset_id_a);
        output_note_commitment1 = circuit::value::complete_partial_commitment(
            claim_note.value_note_partial_commitment, output_value_1, output_asset_id_1, nullifier1);

        // If the defi interaction was unsuccessful, refund the original defi_deposit_value (which was denominated in
        // bridge input_asset_id_b) via output note 2, and only if there was a second input asset to the bridge.
        const auto output_value_2 =
            suint_ct::conditional_assign(interaction_success, output_value_b, claim_note_data.deposit_value);
        const auto output_asset_id_2_if_success =
            suint_ct::conditional_assign(second_output_virtual,
                                         virtual_note_flag + claim_note.defi_interaction_nonce,
                                         claim_note_data.bridge_call_data_local.output_asset_id_b);
        const auto output_asset_id_2 = suint_ct::conditional_assign(
            interaction_success, output_asset_id_2_if_success, claim_note_data.bridge_call_data_local.input_asset_id_b);
        output_note_commitment2 = circuit::value::complete_partial_commitment(
            claim_note.value_note_partial_commitment, output_value_2, output_asset_id_2, nullifier2);

        // We zero the output_note_commitment2 in two cases:
        //   - if the bridge interaction succeeded and returned a second output asset; or
        //   - if the bridge interaction failed and no second asset was ever sent to the bridge.
        const bool_ct is_bridge_output_b_in_use = interaction_success && second_output_in_use;
        const bool_ct was_bridge_input_b_in_use = !interaction_success && second_input_in_use;

        const bool_ct output_note_2_exists = is_bridge_output_b_in_use || was_bridge_input_b_in_use;

        output_note_commitment2 = output_note_commitment2 * output_note_2_exists;
    }

    {
        // Check claim note and interaction note are related.
        claim_note.bridge_call_data.assert_equal(defi_interaction_note.bridge_call_data,
                                                 "note bridge call datas don't match");
        claim_note.defi_interaction_nonce.assert_equal(defi_interaction_note.interaction_nonce,
                                                       "note nonces don't match");
    }

    {
        // Existence checks

        // Check claim note exists:
        const bool_ct claim_exists = check_membership(data_root,
                                                      claim_note_path,
                                                      claim_note.commitment,
                                                      claim_note_index.value.decompose_into_bits(DATA_TREE_DEPTH));
        claim_exists.assert_equal(true, "claim note not a member");

        // Check defi interaction note exists:
        const bool_ct din_exists = check_membership(defi_root,
                                                    defi_interaction_note_path,
                                                    defi_interaction_note.commitment,
                                                    defi_note_index.value.decompose_into_bits(DEFI_TREE_DEPTH));
        din_exists.assert_equal(true, "defi interaction note not a member");
    }

    // Force unused public inputs to 0.
    const field_ct public_value = witness_ct(&composer, 0);
    const field_ct public_owner = witness_ct(&composer, 0);
    const field_ct asset_id = witness_ct(&composer, 0);
    const field_ct defi_deposit_value = witness_ct(&composer, 0);
    const field_ct backward_link = witness_ct(&composer, 0);
    const field_ct allow_chain = witness_ct(&composer, 0);
    public_value.assert_is_zero();
    public_owner.assert_is_zero();
    asset_id.assert_is_zero();
    defi_deposit_value.assert_is_zero();
    backward_link.assert_is_zero();
    allow_chain.assert_is_zero();

    // The following make up the public inputs to the circuit.
    proof_id.set_public();
    output_note_commitment1.set_public();
    output_note_commitment2.set_public();
    nullifier1.set_public();
    nullifier2.set_public();
    public_value.set_public(); // 0
    public_owner.set_public(); // 0
    asset_id.set_public();     // 0
    data_root.set_public();
    claim_note.fee.set_public();
    claim_note_data.bridge_call_data_local.input_asset_id_a.set_public();
    claim_note.bridge_call_data.set_public();
    defi_deposit_value.set_public(); // 0
    defi_root.set_public();
    backward_link.set_public(); // 0
    allow_chain.set_public();   // 0
}

} // namespace claim
} // namespace proofs
} // namespace rollup
