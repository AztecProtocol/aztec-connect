#include "./extended_composer.hpp"

#include "../../assert.hpp"
#include "../../fields/fr.hpp"
#include "../proof_system/widgets/sequential_widget.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"
#include "../proof_system/widgets/bool_widget.hpp"
#include "../proof_system/widgets/sequential_widget.hpp"

#include "math.h"

#include <algorithm>

using namespace barretenberg;

namespace waffle
{
    bool ExtendedComposer::check_gate_flag(const size_t gate_index, const GateFlags flag)
    {
        return (gate_flags[static_cast<size_t>(gate_index)] & static_cast<size_t>(flag)) != 0;
    }
    std::array<ExtendedComposer::extended_wire_properties, 4> ExtendedComposer::filter(
    const uint32_t l1,
    const uint32_t r1,
    const uint32_t o1,
    const uint32_t l2,
    const uint32_t r2,
    const uint32_t o2,
    const uint32_t removed_wire,
    const size_t gate_index)
    {
        auto search = [this, removed_wire](
            uint32_t target_wire,
            GateFlags gate_flag,
            WireType target_type,
            size_t target_gate_index,
            std::array<extended_wire_properties, 4> &accumulator,
            size_t &next_entry,
            fr::field_t *selector
        ) {
            if (removed_wire != target_wire)
            {
                auto wire_property = std::find_if(accumulator.begin(), accumulator.end(), [target_wire](auto x) { return x.index == target_wire; });
                if (wire_property == std::end(accumulator))
                {
                    accumulator[next_entry] = {!check_gate_flag(target_gate_index, gate_flag), target_wire, target_type, std::vector<fr::field_t*>(1, selector) };
                    ++next_entry;
                }
                else
                {
                    printf("modifying?\n");
                    wire_property->is_mutable = wire_property->is_mutable && (!check_gate_flag(target_gate_index, gate_flag));
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
        ASSERT(count == 4);
        return result;
    }

    bool is_isolated(std::vector<ComposerBase::epicycle> &epicycles, size_t gate_index)
    {
        auto compare_gates = [gate_index](const auto x) {
            return ((x.gate_index != gate_index) && (x.gate_index != gate_index + 1));
        };
        auto search_result = std::find_if(epicycles.begin(), epicycles.end(), compare_gates);
        return (search_result == std::end(epicycles));
    }

    std::vector<ComposerBase::epicycle> remove_permutation(const std::vector<ComposerBase::epicycle> &epicycles, size_t gate_index)
    {
        std::vector<ComposerBase::epicycle> out;
        std::copy_if(epicycles.begin(), epicycles.end(), std::back_inserter(out), [gate_index](const auto x) {
            return x.gate_index != gate_index;
        });
        return out;
    }

    void change_permutation(std::vector<ComposerBase::epicycle> &epicycles, const ComposerBase::epicycle old_epicycle, const ComposerBase::epicycle new_epicycle)
    {
        std::replace_if(epicycles.begin(), epicycles.end(), [old_epicycle](const auto x) { return x == old_epicycle; }, new_epicycle);
    }

    ExtendedComposer::extended_wire_properties ExtendedComposer::get_shared_wire(const size_t i) {

        auto search = [this, i](const uint32_t target, const std::array<const std::pair<uint32_t, bool>, 3> &source_wires, const GateFlags flag) {
            auto has_pair = [target](auto x) {
                return (x.second && (x.first == target));
            };
            auto it = std::find_if(source_wires.begin(), source_wires.end(), has_pair);
            if (!check_gate_flag(i, flag) && it != std::end(source_wires))
            {
                return static_cast<size_t>(std::distance(source_wires.begin(), it));
            }
            return static_cast<size_t>(-1);
        };

        const std::array<const std::pair<uint32_t, bool>, 3>
            second_gate_wires{ { { w_l[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_LEFT_WIRE) },
                                 { w_r[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_RIGHT_WIRE) },
                                 { w_o[i + 1], !check_gate_flag(i + 1, GateFlags::FIXED_OUTPUT_WIRE) } } };

        const std::array<fr::field_t*, 3> selectors {{ &q_l[i + 1], &q_r[i + 1], &q_o[i + 1] }};
        size_t found = search(w_l[i], second_gate_wires, GateFlags::FIXED_LEFT_WIRE);
        if (found != static_cast<size_t>(-1))
        {
            return { true, w_l[i], WireType::LEFT, { &q_l[i], selectors[found] } };
        }

        found = search(w_r[i], second_gate_wires, GateFlags::FIXED_RIGHT_WIRE);
        if (found != static_cast<size_t>(-1))
        {
            return { true, w_r[i], WireType::RIGHT, { &q_r[i], selectors[found]} };
        }

        found = search(w_o[i], second_gate_wires, GateFlags::FIXED_OUTPUT_WIRE);
        if (found != static_cast<size_t>(-1))
        {
            return { true, w_o[i], WireType::OUTPUT, { &q_o[i], selectors[found] } };
        }

        return { false, static_cast<uint32_t>(-1), WireType::NULL_WIRE, {} };
    }

    void ExtendedComposer::combine_linear_relations()
    {
        // for (size_t i = 0; i < n; ++i)
        // {
        //     printf("gate %lu, wire indices [%u, %u, %u]\n", i, w_l[i], w_r[i], w_o[i]);
        // }
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
                    std::array<size_t, 2>({i, i + 1}),
                    wire_match,
                    filter(w_l[i], w_r[i], w_o[i], w_l[i + 1], w_r[i + 1], w_o[i + 1], wire_match.index, i),
                });
                ++i; // skip over the next constraint as we've just added it to this quad
            }
            ++i;
        }

        deleted_gates = std::vector<bool>(w_l.size(), 0);
        //     for (size_t j = 0; j < potential_quads.size(); ++j)
        // {
        //     printf("potential quad indices at gate[%lu] = [%u, %u, %u, %u] \n", potential_quads[j].gate_indices[0], potential_quads[j].wires[0].index,potential_quads[j].wires[1].index,potential_quads[j].wires[2].index,potential_quads[j].wires[3].index);
        // }
        for (size_t j = potential_quads.size() - 1; j < potential_quads.size(); --j)
        {
            // printf("checking quad %lu\n", j);
            size_t next_gate_index = potential_quads[j].gate_indices[1] + 1;
            // bool next_gate_linear = barretenberg::fr::eq(q_m[next_gate_index], barretenberg::fr::zero());

            auto search = [](uint32_t target, std::array<extended_wire_properties, 4> & wires, bool next_gate_linear_constraint) {
                for (size_t k = 0; k < wires.size(); ++k)
                {
                    if ((target == (wires[k].index)) && ((wires[k].is_mutable || wires[k].wire_type == WireType::OUTPUT) && next_gate_linear_constraint))
                    {
                        return wires[k];
                    }
                }
                extended_wire_properties res {false, static_cast<uint32_t>(-1), WireType::NULL_WIRE, {}};
                return res;
            };
            bool left_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_LEFT_WIRE)) != 0;
            bool right_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_RIGHT_WIRE)) != 0;
            bool output_fixed = (gate_flags[next_gate_index] & static_cast<size_t>(GateFlags::FIXED_OUTPUT_WIRE)) != 0;

            extended_wire_properties lookahead_wire = search(w_l[next_gate_index], potential_quads[j].wires, !left_fixed && !output_fixed);
            if (lookahead_wire.index == static_cast<uint32_t>(-1))
            {
                lookahead_wire = search(w_r[next_gate_index], potential_quads[j].wires, !right_fixed && !output_fixed);
            }
            if (lookahead_wire.index == static_cast<uint32_t>(-1))
            {
                lookahead_wire = search(w_o[next_gate_index], potential_quads[j].wires, true);
            }
            // if (lookahead_wire.index == static_cast<uint32_t>(-1) && (j != 0) && (potential_quads[j - 1].gate_indices[1] + 1 == potential_quads[j].gate_indices[0]))
            // {
            //     uint32_t lookbehind_wire = search(potential_quads[j - 1].wires[0] & mask, potential_quads[j].wires, true);
            //     if (lookbehind_wire == static_cast<uint32_t>(-1))
            //     {
            //         lookbehind_wire = search(potential_quads[j - 1].wires[1] & mask, potential_quads[j].wires, true);
            //     }
            //     if (lookbehind_wire == static_cast<uint32_t>(-1))
            //     {
            //         lookbehind_wire = search(potential_quads[j - 1].wires[2] & mask, potential_quads[j].wires, true);
            //     }
            //     if (lookbehind_wire == static_cast<uint32_t>(-1))
            //     {
            //         lookbehind_wire = search(potential_quads[j - 1].wires[3] & mask, potential_quads[j].wires, true);
            //     }
            //     // blah.
            //     // TODO:
            //     // combine with the next code block to create something coherent...
            //     // if the next quad we scan, shares a common factor with this one, we can still elide out a gate
            //     // no bit this time, but does the quad above us share a common factor?
            // }
            // if (lookahead_wire.index == static_cast<uint32_t>(-1))
            // {
            //     size_t gate_1_index = next_gate_index - 2;
            //     size_t gate_2_index = next_gate_index - 1;
            //     printf("gate index = %lu, gate 1 = %lu, gate 2 = %lu, next gate = %lu\n", potential_quads[j].gate_indices[0], gate_1_index, gate_2_index, next_gate_index);
            //     printf("quad indices = %u, %u, %u, %u \n", potential_quads[j].wires[0].index,potential_quads[j].wires[1].index,potential_quads[j].wires[2].index,potential_quads[j].wires[3].index);
            //     printf("gate 1 indices = %u, %u, %u, %u \n", w_l[gate_1_index], w_r[gate_1_index], w_o[gate_1_index]);
            //     printf("gate 2 indices = %u, %u, %u, %u \n", w_l[gate_2_index], w_r[gate_2_index], w_o[gate_2_index]);
            //     printf("next gate indices = %u, %u, %u\n", w_l[next_gate_index], w_r[next_gate_index], w_o[next_gate_index]);
            // }
            if (lookahead_wire.index != static_cast<uint32_t>(-1))
            {
                // jackpot?
                size_t gate_1_index = next_gate_index - 2;
                size_t gate_2_index = next_gate_index - 1;
                // printf("found a match at gate index %lu\n", gate_1_index);
                bool left_swap = (w_l[next_gate_index] == (lookahead_wire.index)) && (!left_fixed);
                bool right_swap = (w_r[next_gate_index] == (lookahead_wire.index)) && (!right_fixed);

                if ((left_swap || right_swap) && !output_fixed)
                {
                    WireType swap_type = left_swap ? WireType::LEFT : WireType::RIGHT;
                    change_permutation(wire_epicycles[lookahead_wire.index], { static_cast<uint32_t>(next_gate_index), swap_type }, { static_cast<uint32_t>(next_gate_index), WireType::OUTPUT });
                    change_permutation(wire_epicycles[w_o[next_gate_index]], { static_cast<uint32_t>(next_gate_index), WireType::OUTPUT }, { static_cast<uint32_t>(next_gate_index), swap_type });
                    std::swap(left_swap ? w_l[next_gate_index] : w_r[next_gate_index], w_o[next_gate_index]);
                    barretenberg::fr::swap(left_swap ? q_l[next_gate_index] : q_r[next_gate_index], q_o[next_gate_index]);
                }

                auto assign = [](const fr::field_t &input)
                {
                    return (fr::eq(input, fr::zero())) ? fr::one() : input;
                };
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

                fr::copy(fr::zero(), q_oo[gate_1_index]);
                for (size_t k = 0; k < lookahead_wire.selectors.size(); ++k)
                {
                    fr::__add(q_oo[gate_1_index], *lookahead_wire.selectors[k], q_oo[gate_1_index]);
                }

                barretenberg::fr::field_t linear_selectors[3]{ barretenberg::fr::zero(), barretenberg::fr::zero(), barretenberg::fr::zero() };            
                uint32_t linear_wires[3];
                size_t linear_index = 0;
                std::vector<size_t> multiplicative_wires;

                bool gate_2_multiplicative = !fr::eq(q_m[gate_2_index], fr::zero()); 
                if (gate_2_multiplicative)
                {
                    barretenberg::fr::__add(q_m[gate_1_index], q_m[gate_2_index], q_m[gate_2_index]);
                }

                for (size_t k = 0; k < potential_quads[j].wires.size(); ++k)
                {
                    extended_wire_properties wire = potential_quads[j].wires[k];
                    
                    if (wire.index != lookahead_wire.index && (wire.index != potential_quads[j].removed_wire.index))
                    {
                        if (wire.wire_type != WireType::OUTPUT && !wire.is_mutable)
                        {
                            multiplicative_wires.push_back(linear_index);
                        }
                        for (size_t l = 0; l < wire.selectors.size(); ++l)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], *wire.selectors[l], linear_selectors[linear_index]);
                        }

                        linear_wires[linear_index] = wire.index;
                        linear_index++;
                    }
                }

                ASSERT(multiplicative_wires.size() == 0 || multiplicative_wires.size() == 2);

                wire_epicycles[w_l[gate_1_index]] = remove_permutation(wire_epicycles[w_l[gate_1_index]], gate_1_index);
                wire_epicycles[w_r[gate_1_index]] = remove_permutation(wire_epicycles[w_r[gate_1_index]], gate_1_index);
                wire_epicycles[w_o[gate_1_index]] = remove_permutation(wire_epicycles[w_o[gate_1_index]], gate_1_index);
                wire_epicycles[w_l[gate_2_index]] = remove_permutation(wire_epicycles[w_l[gate_2_index]], gate_2_index);
                wire_epicycles[w_r[gate_2_index]] = remove_permutation(wire_epicycles[w_r[gate_2_index]], gate_2_index);
                wire_epicycles[w_o[gate_2_index]] = remove_permutation(wire_epicycles[w_o[gate_2_index]], gate_2_index);

                if (multiplicative_wires.size() == 2)
                {
                    // TODO RENAME TO FIXED WIRES, REFACTOR
                    barretenberg::fr::copy(linear_selectors[multiplicative_wires[0]], q_l[gate_1_index]);
                    barretenberg::fr::copy(linear_selectors[multiplicative_wires[1]], q_r[gate_1_index]);
                    w_l[gate_1_index] = linear_wires[multiplicative_wires[0]];
                    w_r[gate_1_index] = linear_wires[multiplicative_wires[1]];
                    // size_t k = 0;
                    auto foo = [multiplicative_wires]()
                    {
                        for (size_t l = 0;  l < 3; ++l)
                        {
                            auto it = std::find_if(multiplicative_wires.begin(), multiplicative_wires.end(), [l](auto x) { return x == l; });
                            if (it == multiplicative_wires.end())
                            {
                                return l;
                            }
                        }
                        return static_cast<size_t>(-1);
                    };
                    size_t k = foo();
                    if (k == static_cast<size_t>(-1))
                    {
                        printf("invalid k!\n");
                    }
                    barretenberg::fr::copy(linear_selectors[k], q_o[gate_1_index]);
                    w_o[gate_1_index] = linear_wires[k];
                    // barretenberg::fr::copy(barretenberg::fr::zero(), q_m[gate_1_index]);// TODO REMOVE THIS

                }
                else
                {
                   barretenberg::fr::copy(linear_selectors[0], q_l[gate_1_index]);
                   barretenberg::fr::copy(linear_selectors[1], q_r[gate_1_index]);
                   barretenberg::fr::copy(linear_selectors[2], q_o[gate_1_index]);
                   barretenberg::fr::copy(barretenberg::fr::zero(), q_m[gate_1_index]);
                   w_l[gate_1_index] = linear_wires[0];
                   w_r[gate_1_index] = linear_wires[1];
                   w_o[gate_1_index] = linear_wires[2];
                }
                wire_epicycles[static_cast<uint32_t>(w_l[gate_1_index])].push_back({ static_cast<uint32_t>(gate_1_index), WireType::LEFT });
                wire_epicycles[static_cast<uint32_t>(w_r[gate_1_index])].push_back({ static_cast<uint32_t>(gate_1_index), WireType::RIGHT });
                wire_epicycles[static_cast<uint32_t>(w_o[gate_1_index])].push_back({ static_cast<uint32_t>(gate_1_index), WireType::OUTPUT });
                barretenberg::fr::__add(q_c[gate_1_index], q_c[gate_2_index], q_c[gate_1_index]);
                deleted_gates[potential_quads[j].gate_indices[1]] = true;
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


    void ExtendedComposer::compute_sigma_permutations(Prover &output_state)
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

        uint32_t* sigmas[3]{
            &output_state.sigma_1_mapping[0],
            &output_state.sigma_2_mapping[0],
            &output_state.sigma_3_mapping[0]
        };

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

                sigmas[static_cast<uint32_t>(current_epicycle.wire_type) >> 30U][current_gate_index] = next_gate_index + static_cast<uint32_t>(next_epicycle.wire_type);
            }
        }
    }

    Prover ExtendedComposer::preprocess()
    {
        combine_linear_relations();
    
        ASSERT(wire_epicycles.size() == variables.size());
        ASSERT(pending_bool_selectors.size() == variables.size());
        ASSERT(n == q_m.size());
        ASSERT(n == q_l.size());
        ASSERT(n == q_r.size());
        ASSERT(n == q_o.size());
        ASSERT(n == q_o.size());
        ASSERT(n == q_left_bools.size());
        ASSERT(n == q_right_bools.size());
        // we need to check our bool selectors to ensure that there aren't any straggleres that
        // we couldn't fit in.
        // TODO: hmm this is a lot of code duplication, should refactor once we have this working
        uint32_t pending_pair = static_cast<uint32_t>(-1);
        for (size_t i = 0; i < pending_bool_selectors.size(); ++i)
        {
            if (pending_bool_selectors[i] == true)
            {
                if (pending_pair == static_cast<uint32_t>(-1))
                {
                    pending_pair = static_cast<uint32_t>(i);
                }
                else
                {
                    q_m.emplace_back(fr::field_t({{0,0,0,0}}));
                    q_l.emplace_back(fr::field_t({{0,0,0,0}}));
                    q_r.emplace_back(fr::field_t({{0,0,0,0}}));
                    q_o.emplace_back(fr::field_t({{0,0,0,0}}));
                    q_c.emplace_back(fr::field_t({{0,0,0,0}}));
                    q_left_bools.emplace_back(fr::one());
                    q_right_bools.emplace_back(fr::one());
                    q_oo.emplace_back(fr::zero());
                    w_l.emplace_back(static_cast<uint32_t>(i));
                    w_r.emplace_back(static_cast<uint32_t>(pending_pair));
                    w_o.emplace_back(static_cast<uint32_t>(i));
                    epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
                    epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
                    epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
                    wire_epicycles[static_cast<size_t>(i)].emplace_back(left);
                    wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(right);
                    wire_epicycles[static_cast<size_t>(i)].emplace_back(out);
                    ++n;
                    pending_pair = static_cast<uint32_t>(-1);

                    adjusted_gate_indices.push_back(static_cast<uint32_t>(adjusted_n) + 1U);
                    deleted_gates.push_back(false);
                    ++adjusted_n;
                }
            }
        }
        if (pending_pair != static_cast<uint32_t>(-1))
        {
            q_m.emplace_back(fr::field_t({{0,0,0,0}}));
            q_l.emplace_back(fr::field_t({{0,0,0,0}}));
            q_r.emplace_back(fr::field_t({{0,0,0,0}}));
            q_o.emplace_back(fr::field_t({{0,0,0,0}}));
            q_c.emplace_back(fr::field_t({{0,0,0,0}}));
            q_left_bools.emplace_back(fr::one());
            q_right_bools.emplace_back(fr::field_t({{0,0,0,0}}));
            q_oo.emplace_back(fr::zero());
            w_l.emplace_back(static_cast<uint32_t>(pending_pair));
            w_r.emplace_back(static_cast<uint32_t>(pending_pair));
            w_o.emplace_back(static_cast<uint32_t>(pending_pair));
            epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
            epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
            epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
            wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(left);
            wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(right);
            wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(out);
            ++n;

            adjusted_gate_indices.push_back(static_cast<uint32_t>(adjusted_n) + 1U);
            deleted_gates.push_back(false);
            ++adjusted_n;
        }

        size_t log2_n = static_cast<size_t>(log2(static_cast<size_t>(adjusted_n + 1)));

        if ((1UL << log2_n) != (adjusted_n + 1))
        {
            ++log2_n;
        }
        size_t new_n = 1UL << log2_n;
        size_t n_delta = new_n - adjusted_n;


        for (size_t i = adjusted_n; i < new_n; ++i)
        {
            q_m.emplace_back(fr::field_t({{0,0,0,0}}));
            q_l.emplace_back(fr::field_t({{0,0,0,0}}));
            q_r.emplace_back(fr::field_t({{0,0,0,0}}));
            q_o.emplace_back(fr::field_t({{0,0,0,0}}));
            q_c.emplace_back(fr::field_t({{0,0,0,0}}));
            q_left_bools.emplace_back(fr::field_t({{0,0,0,0}}));
            q_right_bools.emplace_back(fr::field_t({{0,0,0,0}}));
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
            fr::copy(q_oo[i], sequential_widget->q_o_next[index]);
        }

        printf("arithmetic check...\n");
        for (size_t i = 0; i < output_state.n; ++i)
        {
            uint32_t mask = (1 << 28) - 1;

            fr::field_t left_copy; //= output_state.w_l[output_state.sigma_1_mapping[i]];
            fr::field_t right_copy;// = output_state.w_r[output_state.sigma_2_mapping[i]];
            fr::field_t output_copy;// = output_state.w_o[output_state.sigma_3_mapping[i]];
            if (output_state.sigma_1_mapping[i] >> 30 == 0)
            {
                left_copy = output_state.w_l[output_state.sigma_1_mapping[i] & mask];
            }
            else if (output_state.sigma_1_mapping[i] >> 30 == 1)
            {
                left_copy = output_state.w_r[output_state.sigma_1_mapping[i] & mask];
            }
            else
            {
                left_copy = output_state.w_o[output_state.sigma_1_mapping[i] & mask];
            }
            if (output_state.sigma_2_mapping[i] >> 30 == 0)
            {
                right_copy = output_state.w_l[output_state.sigma_2_mapping[i] & mask];
            }
            else if (output_state.sigma_2_mapping[i] >> 30 == 1)
            {
                right_copy = output_state.w_r[output_state.sigma_2_mapping[i] & mask];
            }
            else
            {
                right_copy = output_state.w_o[output_state.sigma_2_mapping[i] & mask];
            }
            if (output_state.sigma_3_mapping[i] >> 30 == 0)
            {
                output_copy = output_state.w_l[output_state.sigma_3_mapping[i] & mask];
            }
            else if (output_state.sigma_3_mapping[i] >> 30 == 1)
            {
                output_copy = output_state.w_r[output_state.sigma_3_mapping[i] & mask];
            }
            else
            {
                output_copy = output_state.w_o[output_state.sigma_3_mapping[i] & mask];
            }
            if (!fr::eq(left_copy, output_state.w_l[i]))
            {
                printf("left copy at index %lu fails... \n", i);
                for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
                {
                    if (i == adjusted_gate_indices[j])
                    {
                        printf("original index = %lu\n", j);
                        break;
                    }
                }
            }
            if (!fr::eq(right_copy, output_state.w_r[i]))
            {
                printf("right copy at index %lu fails. mapped to gate %lu. right wire and copy wire = \n", i, output_state.sigma_2_mapping[i] & mask);
                printf("raw value = %x \n", output_state.sigma_2_mapping[i]);
                fr::print(fr::from_montgomery_form(output_state.w_r[i]));
                fr::print(fr::from_montgomery_form(right_copy));
                for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
                {
                    if (i == adjusted_gate_indices[j])
                    {
                        printf("original index = %lu\n", j);
                        break;
                    }
                }
            }
            if (!fr::eq(output_copy, output_state.w_o[i]))
            {
                printf("output copy at index %lu fails. mapped to gate %lu. output wire and copy wire = \n", i, output_state.sigma_3_mapping[i] & mask);
                printf("raw value = %x \n", output_state.sigma_3_mapping[i]);
                fr::print(fr::from_montgomery_form(output_state.w_o[i]));
                fr::print(fr::from_montgomery_form(output_copy));
                for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
                {
                    if (i == adjusted_gate_indices[j])
                    {
                        printf("original index = %lu\n", j);
                        break;
                    }
                }
            }
        }
        for (size_t i = 0; i < output_state.n; ++i)
        {
            fr::field_t wlwr = fr::mul(output_state.w_l[i], output_state.w_r[i]);
            fr::field_t t0 = fr::mul(wlwr, arithmetic_widget->q_m[i]);
            fr::field_t t1 = fr::mul(output_state.w_l[i], arithmetic_widget->q_l[i]);
            fr::field_t t2 = fr::mul(output_state.w_r[i], arithmetic_widget->q_r[i]);
            fr::field_t t3 = fr::mul(output_state.w_o[i], arithmetic_widget->q_o[i]);
            size_t shifted_idx = (i == output_state.n - 1) ? 0 : i + 1;
            fr::field_t t4 = fr::mul(output_state.w_o[shifted_idx], sequential_widget->q_o_next[i]);
            fr::field_t result = fr::add(t0, t1);
            result = fr::add(result, t2);
            result = fr::add(result, t3);
            result = fr::add(result, t4);
            result = fr::add(result, arithmetic_widget->q_c[i]);
            if (!fr::eq(result, fr::zero()))
            {
                size_t failure_idx = i;
                size_t original_failure_idx;
                for (size_t j = 0; j < adjusted_gate_indices.size(); ++j)
                {
                    if (adjusted_gate_indices[j] == i)
                    {
                        original_failure_idx = j;
                        break;
                    }
                }
                printf("arithmetic gate failure at index i = %lu, original gate index = %lu \n", failure_idx, original_failure_idx);
                printf("selectors:\n");
                fr::print(fr::from_montgomery_form(arithmetic_widget->q_l[i]));
                fr::print(fr::from_montgomery_form(arithmetic_widget->q_r[i]));
                fr::print(fr::from_montgomery_form(arithmetic_widget->q_o[i]));
                fr::print(fr::from_montgomery_form(arithmetic_widget->q_c[i]));
                fr::print(fr::from_montgomery_form(arithmetic_widget->q_m[i]));
                fr::print(fr::from_montgomery_form(sequential_widget->q_o_next[i]));
                printf("witnesses: \n");
                fr::print(fr::from_montgomery_form(output_state.w_l[i]));
                fr::print(fr::from_montgomery_form(output_state.w_r[i]));
                fr::print(fr::from_montgomery_form(output_state.w_o[i]));
                fr::print(fr::from_montgomery_form(output_state.w_o[shifted_idx]));
            }
        }
        printf("bool wires...\n");
        for (size_t i = 0; i < bool_widget->q_bl.get_size(); ++i)
        {
            if (!fr::eq(fr::from_montgomery_form(bool_widget->q_bl[i]), fr::zero()))
            {
                fr::field_t t = output_state.w_l[i];
                fr::field_t u = fr::sub(fr::sqr(t), t);
                if (!fr::eq(u, fr::zero()))
                {
                    printf("bool fail? left \n");
                }
            }
            if (!fr::eq(fr::from_montgomery_form(bool_widget->q_br[i]), fr::zero()))
            {
                fr::field_t t = output_state.w_r[i];
                fr::field_t u = fr::sub(fr::sqr(t), t);
                if (!fr::eq(u, fr::zero()))
                {
                    printf("bool fail? right \n");
                }
            }
        }

        output_state.widgets.push_back(std::move(arithmetic_widget));

        output_state.widgets.push_back(std::move(sequential_widget));

        output_state.widgets.push_back(std::move(bool_widget));


        return output_state;
    }
}