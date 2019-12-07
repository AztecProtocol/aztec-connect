#include "./extended_composer.hpp"

#include "../../assert.hpp"
#include "../../fields/fr.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"
#include "../proof_system/widgets/bool_widget.hpp"
#include "../proof_system/widgets/sequential_widget.hpp"

#include "math.h"

#include <algorithm>

using namespace barretenberg;

namespace waffle
{
bool ExtendedComposer::check_gate_flag(const size_t gate_index, const GateFlags flag) const
{
    return (gate_flags[static_cast<size_t>(gate_index)] & static_cast<size_t>(flag)) != 0;
}
std::array<ExtendedComposer::extended_wire_properties, 4> ExtendedComposer::filter(const uint32_t l1,
                                                                                   const uint32_t r1,
                                                                                   const uint32_t o1,
                                                                                   const uint32_t l2,
                                                                                   const uint32_t r2,
                                                                                   const uint32_t o2,
                                                                                   const uint32_t removed_wire,
                                                                                   const size_t gate_index)
{
    auto search = [this, removed_wire](uint32_t target_wire,
                                       GateFlags gate_flag,
                                       WireType target_type,
                                       size_t target_gate_index,
                                       std::array<extended_wire_properties, 4>& accumulator,
                                       size_t& next_entry,
                                    fr::field_t* selector) {
        if (removed_wire != target_wire)
        {
            auto wire_property = std::find_if(
                accumulator.begin(), accumulator.end(), [target_wire](auto x) { return x.index == target_wire; });
            if (wire_property == std::end(accumulator))
            {
                accumulator[next_entry] = { !check_gate_flag(target_gate_index, gate_flag),
                                            target_wire,
                                            target_type,
                                            std::vector<fr::field_t*>(1, selector) };
                ++next_entry;
            }
            else
            {
                wire_property->is_mutable =
                    wire_property->is_mutable && (!check_gate_flag(target_gate_index, gate_flag));
                wire_property->selectors.push_back(selector);
            }
        }
    };

    std::array<extended_wire_properties, 4> result;
    size_t count = 0;
    search(l1, GateFlags::FIXED_LEFT_WIRE, WireType::LEFT, gate_index, result, count, &q_l[gate_index]);
    search(r1, GateFlags::FIXED_RIGHT_WIRE, WireType::RIGHT, gate_index, result, count, &q_r[gate_index]);
    search(o1, GateFlags::FIXED_OUTPUT_WIRE, WireType::OUTPUT, gate_index, result, count, &q_o[gate_index]);
    search(l2, GateFlags::FIXED_LEFT_WIRE, WireType::LEFT, gate_index + 1, result, count, &q_l[gate_index + 1]);
    search(r2, GateFlags::FIXED_RIGHT_WIRE, WireType::RIGHT, gate_index + 1, result, count, &q_r[gate_index + 1]);
    search(o2, GateFlags::FIXED_OUTPUT_WIRE, WireType::OUTPUT, gate_index + 1, result, count, &q_o[gate_index + 1]);

    // If we have elided out extra variables (due to wire duplications), replace with zero variable
    while (count < 4)
    {
        result[count] = { true, zero_idx, WireType::LEFT, { &zero_selector }};
        ++count;
    }
    ASSERT(count == 4);
    return result;
}

bool is_isolated(const std::vector<ComposerBase::epicycle>& epicycles, const size_t gate_index)
{
    auto compare_gates = [gate_index](const auto x) {
        return ((x.gate_index != gate_index) && (x.gate_index != gate_index + 1));
    };
    auto search_result = std::find_if(epicycles.begin(), epicycles.end(), compare_gates);
    return (search_result == std::end(epicycles));
}

std::vector<ComposerBase::epicycle> remove_permutation(const std::vector<ComposerBase::epicycle>& epicycles,
                                                       size_t gate_index)
{
    std::vector<ComposerBase::epicycle> out;
    std::copy_if(epicycles.begin(), epicycles.end(), std::back_inserter(out), [gate_index](const auto x) {
        return x.gate_index != gate_index;
    });
    return out;
}

void change_permutation(std::vector<ComposerBase::epicycle>& epicycles,
                        const ComposerBase::epicycle old_epicycle,
                        const ComposerBase::epicycle new_epicycle)
{
    std::replace_if(
        epicycles.begin(), epicycles.end(), [&old_epicycle](const auto x) { return x == old_epicycle; }, new_epicycle);
}

ExtendedComposer::extended_wire_properties ExtendedComposer::get_shared_wire(const size_t i)
{

    if (check_gate_flag(i, GateFlags::FIXED_LEFT_WIRE) && check_gate_flag(i + 1, GateFlags::FIXED_LEFT_WIRE))
    {
        return { false, static_cast<uint32_t>(-1), WireType::NULL_WIRE, {} };
    }
    if (check_gate_flag(i, GateFlags::FIXED_RIGHT_WIRE) && check_gate_flag(i + 1, GateFlags::FIXED_RIGHT_WIRE))
    {
        return { false, static_cast<uint32_t>(-1), WireType::NULL_WIRE, {} };
    }

    const auto search = [this, i](const uint32_t target,
                            const std::array<const std::pair<uint32_t, bool>, 3>& source_wires,
                            const GateFlags flag) {
        const auto has_pair = [target](const auto x) { return (x.second && (x.first == target)); };
        const auto it = std::find_if(source_wires.begin(), source_wires.end(), has_pair);
        if (!check_gate_flag(i, flag) && it != std::end(source_wires))
        {
            return static_cast<size_t>(std::distance(source_wires.begin(), it));
        }
        return static_cast<size_t>(-1);
    };

    const std::array<const std::pair<uint32_t, bool>, 3> second_gate_wires{
        { { w_l[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_LEFT_WIRE) },
          { w_r[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_RIGHT_WIRE) },
          { w_o[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_OUTPUT_WIRE) } }
    };

    std::array<fr::field_t *, 3> selectors{ { &q_l[i + 1], &q_r[i + 1], &q_o[i + 1] } };
    size_t found = search(w_l[i], second_gate_wires, GateFlags::FIXED_LEFT_WIRE);
    if (is_isolated(wire_epicycles[w_l[i]], i) && found != static_cast<size_t>(-1) &&
        !is_bool[static_cast<size_t>(w_l[i])])
    {
        return { true, w_l[i], WireType::LEFT, { &q_l[i], selectors[found] } };
    }

    found = search(w_r[i], second_gate_wires, GateFlags::FIXED_RIGHT_WIRE);
    if (is_isolated(wire_epicycles[w_r[i]], i) && found != static_cast<size_t>(-1) &&
        !is_bool[static_cast<size_t>(w_r[i])])
    {
        return { true, w_r[i], WireType::RIGHT, { &q_r[i], selectors[found] } };
    }

    found = search(w_o[i], second_gate_wires, GateFlags::FIXED_OUTPUT_WIRE);
    if (is_isolated(wire_epicycles[w_o[i]], i) && found != static_cast<size_t>(-1) &&
        !is_bool[static_cast<size_t>(w_o[i])])
    {
        return { true, w_o[i], WireType::OUTPUT, { &q_o[i], selectors[found] } };
    }

    return { false, static_cast<uint32_t>(-1), WireType::NULL_WIRE, {} };
}

void ExtendedComposer::combine_linear_relations()
{
    q_oo.resize(n);
    for (size_t i = 0; i < n; ++i)
    {
        q_oo[i] = fr::zero();
    }
    std::vector<quad> potential_quads;
    size_t i = 0;

    while (i < (w_l.size() - 1))
    {
        extended_wire_properties wire_match = get_shared_wire(i);

        if (wire_match.index != static_cast<uint32_t>(-1))
        {
            potential_quads.push_back({
                std::array<size_t, 2>({ i, i + 1 }),
                wire_match,
                filter(w_l[i], w_r[i], w_o[i], w_l[i + 1], w_r[i + 1], w_o[i + 1], wire_match.index, i),
            });
            ++i; // skip over the next constraint as we've just added it to this quad
        }
        ++i;
    }

    deleted_gates = std::vector<bool>(w_l.size(), 0);

    for (size_t j = potential_quads.size() - 1; j < potential_quads.size(); --j)
    {
        const auto current_quad = potential_quads[j];
        size_t next_gate_index = current_quad.gate_indices[1] + 1;

        bool left_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_LEFT_WIRE)) != 0;
        bool right_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_RIGHT_WIRE)) != 0;
        bool output_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_OUTPUT_WIRE)) != 0;

        bool anchoring_gate = false;
        bool deleting_gate = false;
        extended_wire_properties lookahead_wire = extended_wire_properties();
        extended_wire_properties anchor_wire = extended_wire_properties();


        const auto search_for_linked_wire = [left_index = w_l[next_gate_index],
                                             right_index = w_r[next_gate_index],
                                             output_index = w_o[next_gate_index],
                                             left_fixed,
                                             right_fixed,
                                             output_fixed](const auto &x) {
            if (x.wire_type != WireType::OUTPUT && !x.is_mutable)
            {
                return false;
            }
            if (left_index == x.index && !left_fixed && !output_fixed)
            {
                return true;
            }
            if (right_index == x.index && !right_fixed && !output_fixed)
            {
                return true;
            }
            return output_index == x.index;
        };
        const auto candidate_wire = std::find_if(current_quad.wires.begin(), current_quad.wires.end(), search_for_linked_wire);
        if (candidate_wire != std::end(current_quad.wires))
        {
            lookahead_wire = *candidate_wire;
        }

        deleting_gate = (lookahead_wire.index != static_cast<uint32_t>(-1));

        const auto are_quads_adjacent = [&potential_quads](const size_t idx) {
            return ((idx != 0) && potential_quads[idx - 1].gate_indices[1] + 1 == potential_quads[idx].gate_indices[0]);
        };

        if (lookahead_wire.index == static_cast<uint32_t>(-1) && (j != 0) && are_quads_adjacent(j))
        {
            // ok, so we haven't found an adjacent gate that we can use to elide out a gate, but we know that the next
            // quad that we iterate over shares a wire with this quad. Which means that, if we move the shared wire onto
            // an output wire, we can elide out a gate when examining the next quad in our loop
            const auto next_quad = potential_quads[j - 1];
            const auto candidate_anchor_wire =
                std::find_if(current_quad.wires.begin(), current_quad.wires.end(), [&next_quad](const auto &x) {
                    if (x.wire_type != WireType::OUTPUT && !x.is_mutable)
                    {
                        return false;
                    }
                    const auto it = std::find_if(next_quad.wires.begin(), next_quad.wires.end(), [&x](const auto &y) {
                        return (x.index == y.index) && (y.wire_type == WireType::OUTPUT || y.is_mutable);
                    });
                    return (it != std::end(next_quad.wires));
                });

            if (candidate_anchor_wire != std::end(current_quad.wires))
            {
                const auto new_lookahead_wire = std::find_if(current_quad.wires.begin(), current_quad.wires.end(), [target_index = candidate_anchor_wire->index](const auto &x)
                {
                    return (x.index != target_index && (x.wire_type == WireType::OUTPUT || (x.is_mutable)));
                });
                if (new_lookahead_wire != std::end(current_quad.wires))
                {
                    anchor_wire = *candidate_anchor_wire;
                    lookahead_wire = *new_lookahead_wire;
                    anchoring_gate = true;
                }
            }
        }

        if (lookahead_wire.index != static_cast<uint32_t>(-1))
        {
            size_t gate_1_index = next_gate_index - 2;
            size_t gate_2_index = next_gate_index - 1;
            std::array<extended_wire_properties, 4> gate_wires;

            gate_wires[3] = lookahead_wire;
            if (anchoring_gate)
            {
                gate_wires[2] = anchor_wire;
            }

            const auto is_included = [](const std::array<extended_wire_properties, 4>& wires, const uint32_t index) {
                return (std::end(wires) != std::find_if(wires.begin(), wires.end(), [index](const auto x) { return x.index == index; }));
            };

            const auto update_gate_wires = [&gate_wires, &is_included](const auto &wire, const auto detect_policy)
            {
                if (is_included(gate_wires, wire.index))
                {
                    return;
                }
                if (detect_policy(WireType::OUTPUT, wire) && gate_wires[2].index == static_cast<uint32_t>(-1))
                {
                    gate_wires[2] = wire;
                }
                else if (detect_policy(WireType::RIGHT, wire) && gate_wires[1].index == static_cast<uint32_t>(-1))
                {
                    gate_wires[1] = wire;
                }
                else if (detect_policy(WireType::LEFT, wire) && gate_wires[0].index == static_cast<uint32_t>(-1))
                {
                    gate_wires[0] = wire;
                }
            };

            const auto find_fixed_wire = [](const WireType target_type, auto &x) {
                return (x.wire_type == target_type && !x.is_mutable);
            };
            std::for_each(
                potential_quads[j].wires.begin(),
                potential_quads[j].wires.end(),
                [&update_gate_wires, &find_fixed_wire](const auto &wire) { update_gate_wires(wire, find_fixed_wire); });

            const auto find_mutable_wire = [](const WireType target_type, const auto x) {
                return (x.wire_type == target_type || x.is_mutable);
            };
            std::for_each(
                potential_quads[j].wires.begin(),
                potential_quads[j].wires.end(),
                [&update_gate_wires, &find_mutable_wire](const auto &wire) { update_gate_wires(wire, find_mutable_wire); });

            ASSERT(gate_wires[0].index != static_cast<uint32_t>(-1));
            ASSERT(gate_wires[1].index != static_cast<uint32_t>(-1));
            ASSERT(gate_wires[2].index != static_cast<uint32_t>(-1));
            ASSERT(gate_wires[3].index != static_cast<uint32_t>(-1));

            if (deleting_gate)
            {
                // jackpot?
                bool left = (w_l[next_gate_index] == (lookahead_wire.index)) && (!left_fixed);
                bool right = (w_r[next_gate_index] == (lookahead_wire.index)) && (!right_fixed);

                if ((left || right) && !output_fixed)
                {
                    WireType swap_type = left ? WireType::LEFT : WireType::RIGHT;
                    epicycle old_cycle{ static_cast<uint32_t>(next_gate_index), swap_type };
                    epicycle new_cycle{ static_cast<uint32_t>(next_gate_index), WireType::OUTPUT };
                    change_permutation(wire_epicycles[lookahead_wire.index], old_cycle, new_cycle);
                    change_permutation(wire_epicycles[w_o[next_gate_index]], new_cycle, old_cycle);
                    std::swap(left ? w_l[next_gate_index] : w_r[next_gate_index], w_o[next_gate_index]);
                    barretenberg::fr::swap(left ? q_l[next_gate_index] : q_r[next_gate_index], q_o[next_gate_index]);
                }
                deleted_gates[potential_quads[j].gate_indices[1]] = true;
            }

            const auto assign = [](const fr::field_t &input) { return (fr::eq(input, fr::zero())) ? fr::one() : input; };
            fr::field_t left = fr::neg(assign(*potential_quads[j].removed_wire.selectors[0]));
            fr::field_t right = assign(*potential_quads[j].removed_wire.selectors[1]);

            barretenberg::fr::__mul(q_m[gate_1_index], right, q_m[gate_1_index]);
            barretenberg::fr::__mul(q_l[gate_1_index], right, q_l[gate_1_index]);
            barretenberg::fr::__mul(q_r[gate_1_index], right, q_r[gate_1_index]);
            barretenberg::fr::__mul(q_o[gate_1_index], right, q_o[gate_1_index]);
            barretenberg::fr::__mul(q_c[gate_1_index], right, q_c[gate_1_index]);

            barretenberg::fr::__mul(q_m[gate_2_index], left, q_m[gate_2_index]);
            barretenberg::fr::__mul(q_l[gate_2_index], left, q_l[gate_2_index]);
            barretenberg::fr::__mul(q_r[gate_2_index], left, q_r[gate_2_index]);
            barretenberg::fr::__mul(q_o[gate_2_index], left, q_o[gate_2_index]);
            barretenberg::fr::__mul(q_c[gate_2_index], left, q_c[gate_2_index]);

            const auto compute_new_selector = [](const auto &wire) {
                fr::field_t temp = fr::zero();
                std::for_each(wire.selectors.begin(), wire.selectors.end(), [&temp](auto x) { fr::__add(temp, *x, temp); });
                return temp;
            };
            fr::field_t new_left = compute_new_selector(gate_wires[0]);
            fr::field_t new_right = compute_new_selector(gate_wires[1]);
            fr::field_t new_output = compute_new_selector(gate_wires[2]);
            fr::field_t new_next_output = compute_new_selector(gate_wires[3]);

            fr::copy(new_left, q_l[gate_1_index]);
            fr::copy(new_right, q_r[gate_1_index]);
            fr::copy(new_output, q_o[gate_1_index]);
            fr::copy(new_next_output, q_oo[gate_1_index]);
            fr::__add(q_c[gate_1_index], q_c[gate_2_index], q_c[gate_1_index]);
            if (!fr::eq(fr::zero(), q_m[gate_2_index]))
            {
                fr::__add(q_m[gate_1_index], q_m[gate_2_index], q_m[gate_1_index]);
            }

            wire_epicycles[w_l[gate_1_index]] = remove_permutation(wire_epicycles[w_l[gate_1_index]], gate_1_index);
            wire_epicycles[w_r[gate_1_index]] = remove_permutation(wire_epicycles[w_r[gate_1_index]], gate_1_index);
            wire_epicycles[w_o[gate_1_index]] = remove_permutation(wire_epicycles[w_o[gate_1_index]], gate_1_index);
            wire_epicycles[w_l[gate_2_index]] = remove_permutation(wire_epicycles[w_l[gate_2_index]], gate_2_index);
            wire_epicycles[w_r[gate_2_index]] = remove_permutation(wire_epicycles[w_r[gate_2_index]], gate_2_index);
            wire_epicycles[w_o[gate_2_index]] = remove_permutation(wire_epicycles[w_o[gate_2_index]], gate_2_index);

            w_l[gate_1_index] = gate_wires[0].index;
            w_r[gate_1_index] = gate_wires[1].index;
            w_o[gate_1_index] = gate_wires[2].index;

            wire_epicycles[w_l[gate_1_index]].push_back({ static_cast<uint32_t>(gate_1_index), WireType::LEFT });
            wire_epicycles[w_r[gate_1_index]].push_back({ static_cast<uint32_t>(gate_1_index), WireType::RIGHT });
            wire_epicycles[w_o[gate_1_index]].push_back({ static_cast<uint32_t>(gate_1_index), WireType::OUTPUT });

            if (anchoring_gate)
            {
                w_l[gate_2_index] = zero_idx;
                w_r[gate_2_index] = zero_idx;
                w_o[gate_2_index] = gate_wires[3].index;

                q_m[gate_2_index] = fr::zero();
                q_l[gate_2_index] = fr::zero();
                q_r[gate_2_index] = fr::zero();
                q_o[gate_2_index] = fr::zero();
                q_c[gate_2_index] = fr::zero();
                wire_epicycles[w_l[gate_2_index]].push_back({ static_cast<uint32_t>(gate_2_index), WireType::LEFT });
                wire_epicycles[w_r[gate_2_index]].push_back({ static_cast<uint32_t>(gate_2_index), WireType::RIGHT });
                wire_epicycles[w_o[gate_2_index]].push_back({ static_cast<uint32_t>(gate_2_index), WireType::OUTPUT });
            }
        }
    }

    adjusted_gate_indices = std::vector<uint32_t>(n);
    uint32_t delete_count = 0U;
    for (size_t j = 0; j < n; ++j)
    {
        adjusted_gate_indices[j] = static_cast<uint32_t>(j) - delete_count;
        if (deleted_gates[j] == true)
        {
            ++delete_count;
        }
    }
    adjusted_n = n - static_cast<size_t>(delete_count);
}

void ExtendedComposer::compute_sigma_permutations(Prover& output_state)
{
    // create basic 'identity' permutation
    output_state.sigma_1_mapping.reserve(output_state.n);
    output_state.sigma_2_mapping.reserve(output_state.n);
    output_state.sigma_3_mapping.reserve(output_state.n);
    for (size_t i = 0; i < output_state.n; ++i)
    {
        output_state.sigma_1_mapping.emplace_back(static_cast<uint32_t>(i));
        output_state.sigma_2_mapping.emplace_back(static_cast<uint32_t>(i) + (1U << 30U));
        output_state.sigma_3_mapping.emplace_back(static_cast<uint32_t>(i) + (1U << 31U));
    }

    uint32_t* sigmas[3]{ &output_state.sigma_1_mapping[0],
                         &output_state.sigma_2_mapping[0],
                         &output_state.sigma_3_mapping[0] };

    for (size_t i = 0; i < wire_epicycles.size(); ++i)
    {
        // each index in 'wire_epicycles' corresponds to a variable
        // the contents of 'wire_epicycles[i]' is a vector, that contains a list
        // of the gates that this variable is involved in
        for (size_t j = 0; j < wire_epicycles[i].size(); ++j)
        {
            epicycle current_epicycle = wire_epicycles[i][j];
            size_t epicycle_index = j == wire_epicycles[i].size() - 1 ? 0 : j + 1;
            epicycle next_epicycle = wire_epicycles[i][epicycle_index];
            uint32_t current_gate_index = adjusted_gate_indices[current_epicycle.gate_index];
            uint32_t next_gate_index = adjusted_gate_indices[next_epicycle.gate_index];

            sigmas[static_cast<uint32_t>(current_epicycle.wire_type) >> 30U][current_gate_index] =
                next_gate_index + static_cast<uint32_t>(next_epicycle.wire_type);
        }
    }
}

Prover ExtendedComposer::preprocess()
{
    combine_linear_relations();

    process_bool_gates();
    ASSERT(wire_epicycles.size() == variables.size());
    ASSERT(n == q_m.size());
    ASSERT(n == q_l.size());
    ASSERT(n == q_r.size());
    ASSERT(n == q_o.size());
    ASSERT(n == q_o.size());
    ASSERT(n == q_left_bools.size());
    ASSERT(n == q_right_bools.size());
    ASSERT(n == q_output_bools.size());
    // we need to check our bool selectors to ensure that there aren't any straggleres that
    // we couldn't fit in.
    // TODO: hmm this is a lot of code duplication, should refactor once we have this working

    size_t log2_n = static_cast<size_t>(log2(static_cast<size_t>(adjusted_n + 1)));

    if ((1UL << log2_n) != (adjusted_n + 1))
    {
        ++log2_n;
    }
    size_t new_n = 1UL << log2_n;
    size_t n_delta = new_n - adjusted_n;

    for (size_t i = adjusted_n; i < new_n; ++i)
    {
        q_m.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_l.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_r.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_o.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_c.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_left_bools.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_right_bools.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_output_bools.emplace_back(fr::field_t({ { 0, 0, 0, 0 } }));
        q_oo.emplace_back(fr::zero());
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
        adjusted_gate_indices.push_back(static_cast<uint32_t>(i));
    }

    Prover output_state(new_n);

    compute_sigma_permutations(output_state);

    std::unique_ptr<ProverBoolWidget> bool_widget = std::make_unique<ProverBoolWidget>(new_n);
    std::unique_ptr<ProverArithmeticWidget> arithmetic_widget = std::make_unique<ProverArithmeticWidget>(new_n);
    std::unique_ptr<ProverSequentialWidget> sequential_widget = std::make_unique<ProverSequentialWidget>(new_n);

    output_state.w_l = polynomial(new_n);
    output_state.w_r = polynomial(new_n);
    output_state.w_o = polynomial(new_n);

    for (size_t i = 0; i < n + n_delta; ++i)
    {
        if ((i < n) && deleted_gates[i] == true)
        {
            continue;
        }
        size_t index = adjusted_gate_indices[i];
        fr::copy(variables[w_l[i]], output_state.w_l[index]);
        fr::copy(variables[w_r[i]], output_state.w_r[index]);
        fr::copy(variables[w_o[i]], output_state.w_o[index]);
        fr::copy(q_m[i], arithmetic_widget->q_m[index]);
        fr::copy(q_l[i], arithmetic_widget->q_l[index]);
        fr::copy(q_r[i], arithmetic_widget->q_r[index]);
        fr::copy(q_o[i], arithmetic_widget->q_o[index]);
        fr::copy(q_c[i], arithmetic_widget->q_c[index]);
        fr::copy(q_left_bools[i], bool_widget->q_bl[index]);
        fr::copy(q_right_bools[i], bool_widget->q_br[index]);
        fr::copy(q_output_bools[i], bool_widget->q_bo[index]);
        fr::copy(q_oo[i], sequential_widget->q_o_next[index]);
    }

    // printf("arithmetic check...\n");
    // for (size_t i = 0; i < output_state.n; ++i)
    // {
    //     uint32_t mask = (1 << 28) - 1;

    //     fr::field_t left_copy; //= output_state.w_l[output_state.sigma_1_mapping[i]];
    //     fr::field_t right_copy;// = output_state.w_r[output_state.sigma_2_mapping[i]];
    //     fr::field_t output_copy;// = output_state.w_o[output_state.sigma_3_mapping[i]];
    //     if (output_state.sigma_1_mapping[i] >> 30 == 0)
    //     {
    //         left_copy = output_state.w_l[output_state.sigma_1_mapping[i] & mask];
    //     }
    //     else if (output_state.sigma_1_mapping[i] >> 30 == 1)
    //     {
    //         left_copy = output_state.w_r[output_state.sigma_1_mapping[i] & mask];
    //     }
    //     else
    //     {
    //         left_copy = output_state.w_o[output_state.sigma_1_mapping[i] & mask];
    //     }
    //     if (output_state.sigma_2_mapping[i] >> 30 == 0)
    //     {
    //         right_copy = output_state.w_l[output_state.sigma_2_mapping[i] & mask];
    //     }
    //     else if (output_state.sigma_2_mapping[i] >> 30 == 1)
    //     {
    //         right_copy = output_state.w_r[output_state.sigma_2_mapping[i] & mask];
    //     }
    //     else
    //     {
    //         right_copy = output_state.w_o[output_state.sigma_2_mapping[i] & mask];
    //     }
    //     if (output_state.sigma_3_mapping[i] >> 30 == 0)
    //     {
    //         output_copy = output_state.w_l[output_state.sigma_3_mapping[i] & mask];
    //     }
    //     else if (output_state.sigma_3_mapping[i] >> 30 == 1)
    //     {
    //         output_copy = output_state.w_r[output_state.sigma_3_mapping[i] & mask];
    //     }
    //     else
    //     {
    //         output_copy = output_state.w_o[output_state.sigma_3_mapping[i] & mask];
    //     }
    //     if (!fr::eq(left_copy, output_state.w_l[i]))
    //     {
    //         printf("left copy at index %lu fails... \n", i);
    //         for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
    //         {
    //             if (i == adjusted_gate_indices[j])
    //             {
    //                 printf("original index = %lu\n", j);
    //                 break;
    //             }
    //         }
    //     }
    //     if (!fr::eq(right_copy, output_state.w_r[i]))
    //     {
    //         printf("right copy at index %lu fails. mapped to gate %lu. right wire and copy wire = \n", i,
    //         output_state.sigma_2_mapping[i] & mask); printf("raw value = %x \n", output_state.sigma_2_mapping[i]);
    //         fr::print(fr::from_montgomery_form(output_state.w_r[i]));
    //         fr::print(fr::from_montgomery_form(right_copy));
    //         for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
    //         {
    //             if (i == adjusted_gate_indices[j])
    //             {
    //                 printf("original index = %lu\n", j);
    //                 break;
    //             }
    //         }
    //     }
    //     if (!fr::eq(output_copy, output_state.w_o[i]))
    //     {
    //         printf("output copy at index %lu fails. mapped to gate %lu. output wire and copy wire = \n", i,
    //         output_state.sigma_3_mapping[i] & mask); printf("raw value = %x \n", output_state.sigma_3_mapping[i]);
    //         fr::print(fr::from_montgomery_form(output_state.w_o[i]));
    //         fr::print(fr::from_montgomery_form(output_copy));
    //         for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
    //         {
    //             if (i == adjusted_gate_indices[j])
    //             {
    //                 printf("original index = %lu\n", j);
    //                 break;
    //             }
    //         }
    //     }
    // }
    // for (size_t i = 0; i < output_state.n; ++i)
    // {
    //     fr::field_t wlwr = fr::mul(output_state.w_l[i], output_state.w_r[i]);
    //     fr::field_t t0 = fr::mul(wlwr, arithmetic_widget->q_m[i]);
    //     fr::field_t t1 = fr::mul(output_state.w_l[i], arithmetic_widget->q_l[i]);
    //     fr::field_t t2 = fr::mul(output_state.w_r[i], arithmetic_widget->q_r[i]);
    //     fr::field_t t3 = fr::mul(output_state.w_o[i], arithmetic_widget->q_o[i]);
    //     size_t shifted_idx = (i == output_state.n - 1) ? 0 : i + 1;
    //     fr::field_t t4 = fr::mul(output_state.w_o[shifted_idx], sequential_widget->q_o_next[i]);
    //     fr::field_t result = fr::add(t0, t1);
    //     result = fr::add(result, t2);
    //     result = fr::add(result, t3);
    //     result = fr::add(result, t4);
    //     result = fr::add(result, arithmetic_widget->q_c[i]);
    //     if (!fr::eq(result, fr::zero()))
    //     {
    //         size_t failure_idx = i;
    //         size_t original_failure_idx;
    //         for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
    //         {
    //             if (deleted_gates[j])
    //             {
    //                 continue;
    //             }
    //             if (adjusted_gate_indices[j] == i)
    //             {
    //                 original_failure_idx = j;
    //                 break;
    //             }
    //         }
    //         printf("arithmetic gate failure at index i = %lu, original gate index = %lu \n", failure_idx,
    //         original_failure_idx); printf("selectors:\n");
    //         fr::print(fr::from_montgomery_form(arithmetic_widget->q_l[i]));
    //         fr::print(fr::from_montgomery_form(arithmetic_widget->q_r[i]));
    //         fr::print(fr::from_montgomery_form(arithmetic_widget->q_o[i]));
    //         fr::print(fr::from_montgomery_form(arithmetic_widget->q_c[i]));
    //         fr::print(fr::from_montgomery_form(arithmetic_widget->q_m[i]));
    //         fr::print(fr::from_montgomery_form(sequential_widget->q_o_next[i]));
    //         printf("witnesses: \n");
    //         fr::print(fr::from_montgomery_form(output_state.w_l[i]));
    //         fr::print(fr::from_montgomery_form(output_state.w_r[i]));
    //         fr::print(fr::from_montgomery_form(output_state.w_o[i]));
    //         fr::print(fr::from_montgomery_form(output_state.w_o[shifted_idx]));
    //     }
    // }
    // printf("bool wires...\n");
    // for (size_t i = 0; i < bool_widget->q_bl.get_size(); ++i)
    // {
    //     if (!fr::eq(fr::from_montgomery_form(bool_widget->q_bl[i]), fr::zero()))
    //     {
    //         fr::field_t t = output_state.w_l[i];
    //         fr::field_t u = fr::sub(fr::sqr(t), t);
    //         if (!fr::eq(u, fr::zero()))
    //         {
    //             printf("bool fail? left \n");
    //         }
    //     }
    //     if (!fr::eq(fr::from_montgomery_form(bool_widget->q_br[i]), fr::zero()))
    //     {
    //         fr::field_t t = output_state.w_r[i];
    //         fr::field_t u = fr::sub(fr::sqr(t), t);
    //         if (!fr::eq(u, fr::zero()))
    //         {
    //             printf("bool fail? right \n");
    //         }
    //     }
    // }

    output_state.widgets.push_back(std::move(arithmetic_widget));

    output_state.widgets.push_back(std::move(sequential_widget));

    output_state.widgets.push_back(std::move(bool_widget));

    return output_state;
}
} // namespace waffle