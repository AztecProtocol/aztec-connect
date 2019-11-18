#include "./extended_composer.hpp"

#include "../../assert.hpp"
#include "../../fields/fr.hpp"
#include "../proof_system/widgets/sequential_widget.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"

#include "math.h"

using namespace barretenberg;

namespace waffle
{
    std::array<uint32_t, 4> ExtendedComposer::filter(
    const uint32_t l1,
    const uint32_t r1,
    const uint32_t o1,
    const uint32_t l2,
    const uint32_t r2,
    const uint32_t o2,
    const uint32_t target_wire,
    const size_t gate_index)
    {
        std::vector<uint32_t> temp;
        if (target_wire != l1)
        {
            temp.push_back(l1);
        }
        if (target_wire != r1 || (r1 == l1))
        {
            temp.push_back(r1);
        }
        if (target_wire != o1 || (o1 == r1) || (o1 == l1))
        {
            temp.push_back(r1);
        }
        if (target_wire != l2)
        {
            temp.push_back(l2);
        }
        if (target_wire != r2 || (r2 == l2))
        {
            temp.push_back(r2);
        }
        if (target_wire != o2 || (o2 == r2) || (o2 == l2))
        {
            temp.push_back(o2);
        }
        std::array<uint32_t, 4> result{{temp[0], temp[1], temp[2], temp[3]}};
        for (size_t i = 0; i < result.size(); ++i)
        {
            if (w_l[gate_index] == result[i])
            {
                uint32_t multiplicative_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_m[gate_index + 1])) << 24U;
                uint32_t left_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_l[gate_index + 1])) << 25U;
                result[i] = result[i] | multiplicative_term | left_linear_term;
            }
            if (w_r[gate_index] == result[i])
            {
                uint32_t multiplicative_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_m[gate_index + 1])) << 24U;
                uint32_t right_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_r[gate_index + 1])) << 26U;
                result[i] = result[i] | multiplicative_term | right_linear_term;
            }
            if (w_o[gate_index] == result[i])
            {
                uint32_t output_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_o[gate_index + 1])) << 27U;
                result[i] = result[i] | output_linear_term;
            }
            if (w_l[gate_index + 1] == result[i])
            {
                uint32_t multiplicative_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_m[gate_index + 1])) << 28U;
                uint32_t left_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_l[gate_index + 1])) << 29U;
                result[i] = result[i] | multiplicative_term | left_linear_term;
            }
            if (w_r[gate_index + 1] == result[i])
            {
                uint32_t multiplicative_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_m[gate_index + 1])) << 28U;
                uint32_t right_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_r[gate_index + 1])) << 30U;
                result[i] = result[i] | multiplicative_term | right_linear_term;
            }
            if (w_o[gate_index + 1] == result[i])
            {
                uint32_t output_linear_term = static_cast<uint32_t>(!barretenberg::fr::eq(barretenberg::fr::zero(), q_o[gate_index + 1])) << 31U;
                result[i] = result[i] | output_linear_term;
            }
        }
        return result;
    }

    bool is_isolated(std::vector<ComposerBase::epicycle> &epicycles, size_t gate_index)
    {
        bool isolated = true;
        for (size_t j = 0; j < epicycles.size(); ++j)
        {
            bool t0 = (epicycles[j].gate_index == static_cast<uint32_t>(gate_index));
            bool t1 = (epicycles[j].gate_index == static_cast<uint32_t>(gate_index + 1));
            isolated = isolated && (t0 || t1);
        }
        return isolated;
    }

    std::vector<ComposerBase::epicycle> remove_permutation(const std::vector<ComposerBase::epicycle> &epicycles, size_t gate_index)
    {
        std::vector<ComposerBase::epicycle> out;
        for (size_t j = 0; j < epicycles.size(); ++j)
        {
            if (epicycles[j].gate_index != gate_index)
            {
                out.push_back(epicycles[j]);
            }
        }
        return out;
    }

    void change_permutation(std::vector<ComposerBase::epicycle> &epicycles, const ComposerBase::epicycle old_epicycle, const ComposerBase::epicycle new_epicycle)
    {
        for (size_t j = 0; j < epicycles.size(); ++j)
        {
            if (epicycles[j].gate_index == old_epicycle.gate_index && epicycles[j].wire_type == old_epicycle.wire_type)
            {
                epicycles[j] = new_epicycle;
            }
        }
    }

    uint32_t ExtendedComposer::get_shared_wire(const size_t i) {
        uint32_t l1 = w_l[i];
        uint32_t r1 = w_r[i];
        uint32_t o1 = w_o[i];
        uint32_t l2 = w_l[i + 1];
        uint32_t r2 = w_r[i + 1];
        uint32_t o2 = w_o[i + 1];
        bool gate_1_left_fixed = (gate_flags[i] & static_cast<size_t>(GateFlags::FIXED_LEFT_WIRE)) != 0UL;
        bool gate_1_right_fixed = (gate_flags[i] & static_cast<size_t>(GateFlags::FIXED_RIGHT_WIRE)) != 0UL;
        bool gate_1_output_fixed = (gate_flags[i] & static_cast<size_t>(GateFlags::FIXED_OUTPUT_WIRE)) != 0UL;
        bool gate_2_left_fixed = (gate_flags[i + 1] & static_cast<size_t>(GateFlags::FIXED_LEFT_WIRE)) != 0UL;
        bool gate_2_right_fixed = (gate_flags[i + 1] & static_cast<size_t>(GateFlags::FIXED_RIGHT_WIRE)) != 0UL;
        bool gate_2_output_fixed = (gate_flags[i + 1] & static_cast<size_t>(GateFlags::FIXED_OUTPUT_WIRE)) != 0UL;

        // bool gate_1_linear = barretenberg::fr::eq(q_m[i], barretenberg::fr::zero());
        // bool gate_2_linear = barretenberg::fr::eq(q_m[i + 1], barretenberg::fr::zero());
        // if (!gate_1_linear && !gate_2_linear)
        // {
        //     // if both gates contain a multiplicative term, we won't be able to remove
        //     return static_cast<uint32_t>(-1);
        // }
        bool l1_match = (l1 == l2) && (!gate_1_left_fixed && !gate_2_left_fixed);
        l1_match = l1_match || ((l1 == r2) && (!gate_1_left_fixed && !gate_2_right_fixed));
        l1_match = l1_match || ((l1 == o2) && (!gate_1_left_fixed && !gate_2_output_fixed));

        bool r1_match = (r1 == l2) && (!gate_1_right_fixed && !gate_2_left_fixed);
        r1_match = r1_match || ((r1 == r2) && (!gate_1_right_fixed && !gate_2_right_fixed));
        r1_match = r1_match || ((r1 == o2) && (!gate_1_right_fixed && !gate_2_output_fixed));

        bool o1_match = (o1 == l2) && (!gate_1_output_fixed && !gate_2_left_fixed);
        o1_match = o1_match || ((o1 == r2) && (!gate_1_output_fixed && !gate_2_right_fixed));
        o1_match = o1_match || ((o1 == o2) && (!gate_1_output_fixed && !gate_2_output_fixed));

        if (is_isolated(wire_epicycles[l1], i) && l1_match)
        {
            return l1;
        }
        if (is_isolated(wire_epicycles[r1], i) && r1_match)
        {
            return r1;
        }
        if (is_isolated(wire_epicycles[o1], i) && o1_match)
        {
            return o1;
        }
        return static_cast<uint32_t>(-1);
    }

    void ExtendedComposer::combine_linear_relations()
    {
        q_oo.resize(n);
        std::vector<quad> potential_quads;
        size_t i = 0;

        while (i < (w_l.size() - 1))
        {
            uint32_t wire_match = get_shared_wire(i);

            if (wire_match != static_cast<uint32_t>(-1))
            {
                std::array<barretenberg::fr::field_t, 2> removed_selectors;
                for (size_t j = 0; j < 2; ++j)
                {
                    if (w_o[i + j] == wire_match)
                    {
                        removed_selectors[j] = q_o[i];
                    }
                    else if (w_r[i + j] == wire_match)
                    {
                        removed_selectors[j] = q_r[i];
                    }
                    else if (w_l[i + j] == wire_match)
                    {
                        removed_selectors[j] = q_l[i];
                    }
                }
                potential_quads.push_back({
                    std::array<size_t, 2>({i, i + 1}),
                    wire_match,
                    filter(w_l[i], w_r[i], w_o[i], w_l[i + 1], w_r[i + 1], w_o[i + 1], wire_match, i),
                    removed_selectors
                });
                ++i; // skip over the next constraint as we've just added it to this quad
            }
            ++i;
        }

        deleted_gates = std::vector<bool>(w_l.size(), 0);

        for (size_t j = potential_quads.size() - 1; j < potential_quads.size(); --j)
        {

            size_t next_gate_index = potential_quads[j].gate_indices[1] + 1;
            bool next_gate_linear = barretenberg::fr::eq(q_m[next_gate_index], barretenberg::fr::zero());
            // TODO:
            // we can remove a gate, IF, the following gate contains a linear wire value that matches
            // any of the linear wire values in our quad term

            uint32_t mask = (1U << 24U) - 1;
            auto search = [mask](uint32_t target, std::array<uint32_t, 4> & wires, bool next_gate_linear_constraint) {
                for (size_t k = 0; k < wires.size(); ++k)
                {
                    if ((target == (wires[k] & mask)) && ((wires[k] & 0x11000000U) == 0) && next_gate_linear_constraint)
                    {
                        return wires[k];
                    }
                }
                return static_cast<uint32_t>(-1);
            };
            uint32_t lookahead_wire = search(w_l[next_gate_index], potential_quads[j].wires, next_gate_linear);
            if (lookahead_wire == static_cast<uint32_t>(-1))
            {
                lookahead_wire = search(w_r[next_gate_index], potential_quads[j].wires, next_gate_linear);
            }
            if (lookahead_wire == static_cast<uint32_t>(-1))
            {
                lookahead_wire = search(w_o[next_gate_index], potential_quads[j].wires, false);
            }
            if (lookahead_wire != static_cast<uint32_t>(-1))
            {
                // jackpot?
                size_t gate_1_index = next_gate_index - 2;
                size_t gate_2_index = next_gate_index - 1;
                bool left_swap = w_l[next_gate_index] == (lookahead_wire & mask) && next_gate_linear;
                bool right_swap = w_r[next_gate_index] == (lookahead_wire & mask) && next_gate_linear;
                if (left_swap || right_swap)
                {
                    WireType swap_type = left_swap ? WireType::LEFT : WireType::RIGHT;
                    change_permutation(wire_epicycles[lookahead_wire & mask], { static_cast<uint32_t>(next_gate_index), swap_type }, { static_cast<uint32_t>(next_gate_index), WireType::OUTPUT });
                    change_permutation(wire_epicycles[w_o[next_gate_index]], { static_cast<uint32_t>(next_gate_index), WireType::OUTPUT }, { static_cast<uint32_t>(next_gate_index), swap_type });
                    std::swap(left_swap ? w_l[next_gate_index] : w_r[next_gate_index], w_o[next_gate_index]);
                    barretenberg::fr::swap(left_swap ? q_l[next_gate_index] : q_r[next_gate_index], q_o[next_gate_index]);
                }
                // next step:
                barretenberg::fr::field_t lookahead_term = barretenberg::fr::zero();
                // TODO: VALIDATE REMOVED WIRE SELECTOR POLYNOMIAL IS NOT ZERO
                // TODO: CHECK THAT WE'RE NOT REMOVING MORE THAN 1 WIRE PER OPERATION
                barretenberg::fr::__mul(q_m[gate_1_index], potential_quads[j].removed_selectors[1], q_m[gate_1_index]);
                barretenberg::fr::__mul(q_l[gate_1_index], potential_quads[j].removed_selectors[1], q_l[gate_1_index]);
                barretenberg::fr::__mul(q_r[gate_1_index], potential_quads[j].removed_selectors[1], q_r[gate_1_index]);
                barretenberg::fr::__mul(q_o[gate_1_index], potential_quads[j].removed_selectors[1], q_o[gate_1_index]);
                barretenberg::fr::__mul(q_c[gate_1_index], potential_quads[j].removed_selectors[1], q_c[gate_1_index]);
                barretenberg::fr::__mul(q_m[gate_2_index], fr::neg(potential_quads[j].removed_selectors[0]), q_m[gate_2_index]);
                barretenberg::fr::__mul(q_l[gate_2_index], fr::neg(potential_quads[j].removed_selectors[0]), q_l[gate_2_index]);
                barretenberg::fr::__mul(q_r[gate_2_index], fr::neg(potential_quads[j].removed_selectors[0]), q_r[gate_2_index]);
                barretenberg::fr::__mul(q_o[gate_2_index], fr::neg(potential_quads[j].removed_selectors[0]), q_o[gate_2_index]);
                barretenberg::fr::__mul(q_c[gate_2_index], fr::neg(potential_quads[j].removed_selectors[0]), q_c[gate_2_index]);

                bool lookahead_left_linear_a = (lookahead_wire & (1U << 25U)) != 0;
                bool lookahead_right_linear_a = (lookahead_wire & (1U << 26U)) != 0;
                bool lookahead_output_linear_a = (lookahead_wire & (1U << 27U)) != 0;
                bool lookahead_left_linear_b = (lookahead_wire & (1U << 29U)) != 0;
                bool lookahead_right_linear_b = (lookahead_wire & (1U << 30U)) != 0;
                bool lookahead_output_linear_b = (lookahead_wire & (1U << 31U)) != 0;
                // ok...so...what do we do if our lookahead wire dips into multiple wire types?
                if (lookahead_left_linear_a)
                {
                    barretenberg::fr::__add(lookahead_term, q_l[gate_1_index], lookahead_term);
                }
                if (lookahead_right_linear_a)
                {
                    barretenberg::fr::__add(lookahead_term, q_r[gate_1_index], lookahead_term);
                }
                if (lookahead_output_linear_a)
                {
                    barretenberg::fr::__add(lookahead_term, q_o[gate_1_index], lookahead_term);
                }
                if (lookahead_left_linear_b)
                {
                    barretenberg::fr::__add(lookahead_term, q_l[gate_2_index], lookahead_term);
                }
                if (lookahead_right_linear_b)
                {
                    barretenberg::fr::__add(lookahead_term, q_r[gate_2_index], lookahead_term);
                }
                if (lookahead_output_linear_b)
                {
                    barretenberg::fr::__add(lookahead_term, q_o[gate_2_index], lookahead_term);
                }

                barretenberg::fr::copy(lookahead_term, q_oo[gate_1_index]);

                barretenberg::fr::field_t linear_selectors[3]{ barretenberg::fr::zero(), barretenberg::fr::zero(), barretenberg::fr::zero() };            
                uint32_t linear_wires[3];
                size_t linear_index = 0;
                std::vector<size_t> multiplicative_wires;

                for (size_t k = 0; k < potential_quads[k].wires.size(); ++k)
                {
                    uint32_t wire = potential_quads[j].wires[k];
                    if (potential_quads[j].wires[k] != lookahead_wire && potential_quads[j].wires[k] != potential_quads[j].removed_wire)
                    {
                        bool left_linear_a = (wire & (1U << 25U));
                        bool right_linear_a = (wire & (1U << 26U));
                        bool output_linear_a = (wire & (1U << 27U));
                        bool left_linear_b = (wire & (1U << 29U));
                        bool right_linear_b = (wire & (1U << 30U));
                        bool output_linear_b = (wire & (1U << 31U));
                        bool multiplicative_a = (wire & (1U << 24U));
                        bool multiplicative_b = (wire & (1U << 28U));

                        if (multiplicative_b)
                        {
                            barretenberg::fr::__add(q_m[gate_1_index], q_m[gate_2_index], q_m[gate_2_index]);
                        }
                        if (multiplicative_a || multiplicative_b)
                        {
                            multiplicative_wires.push_back(linear_index);
                        }
                        if (left_linear_a)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_l[gate_1_index], linear_selectors[linear_index]);
                        }
                        if (right_linear_a)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_r[gate_1_index], linear_selectors[linear_index]);
                        }
                        if (output_linear_a)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_o[gate_1_index], linear_selectors[linear_index]);
                        }
                        if (left_linear_b)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_l[gate_2_index], linear_selectors[linear_index]);
                        }
                        if (right_linear_b)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_r[gate_2_index], linear_selectors[linear_index]);
                        }
                        if (output_linear_b)
                        {
                            barretenberg::fr::__add(linear_selectors[linear_index], q_o[gate_2_index], linear_selectors[linear_index]);
                        }
                        linear_wires[linear_index] = wire & mask;
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
                    barretenberg::fr::copy(linear_selectors[multiplicative_wires[0]], q_l[gate_1_index]);
                    barretenberg::fr::copy(linear_selectors[multiplicative_wires[1]], q_r[gate_1_index]);
                    w_l[gate_1_index] = linear_wires[multiplicative_wires[0]];
                    w_r[gate_1_index] = linear_wires[multiplicative_wires[1]];
                    size_t k = 0;
                    if (multiplicative_wires[0] == 0 || multiplicative_wires[1] == 0)
                    {
                        ++k;
                    }
                    if (multiplicative_wires[0] == 1 || multiplicative_wires[1] == 1)
                    {
                        ++k;
                    }
                    barretenberg::fr::copy(linear_selectors[k], q_o[gate_1_index]);
                    w_o[gate_1_index] = linear_wires[k];
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
        // (9 constraints * 18 = 162)
        // (4 * 46 = 184)
        // (hmhmhmhmhmhmhm )
        // Q: MiMC x^137 requires 18 rounds, vs the 46 required for x^7
        // 2, 4, 8, 16, 32, 64, 128, 136, 137
        // = 9 multiplications
        // 2, 4, 6, 7
        // = 4 multiplications
        // 4 * 46 = 184
        // 9 * 18 = 162
        // huh!

        // x
        // p x x : x2 x (9 + mm)
        // p x2 : x4 x (6 + mm)
        // p x4 : x8 x (6 + mm)
        // p x8 x8 : x16 x8 x (9 + mm)
        // p x16 : x32 x8 x (6 + mm)
        // p x32 : x64 x8 x (6 + mm)
        // p x64 : x128 x8 x (6 + mm)
        // p : x136 (3 + mm)
        // p : x137 (3 + mm)
        // 9 mulmod + 54
        // 72 + 54 = 126
        // + k + ci = +9
        // 135 per round
        // 135 * 18 = 1350 + 800 + 240 + 40 = 1350 + 1080 = 2430 gas per field element
        // first hash requires (3 * 18 = 54) less gas because no key = 2376
        // => hashing two field elements requires 4806
        // => 2^30 merkle tree = 4806 * 30 = 48060 * 3 = 120000 + 24000 + 180 = 144180 gas for one state update. yikes

        // TODO: iterate over the deleted gates array, and use to create a vector of offsets that map `gate_index` in our permutation,
        // to a gate index that accounts for the deleted entries.
    }
    Prover ExtendedComposer::preprocess()
    {
        return Prover(0);
    //     ASSERT(wire_epicycles.size() == variables.size());
    //     ASSERT(pending_bool_selectors.size() == variables.size());
    //     ASSERT(n == q_m.size());
    //     ASSERT(n == q_l.size());
    //     ASSERT(n == q_r.size());
    //     ASSERT(n == q_o.size());
    //     ASSERT(n == q_o.size());
    //     ASSERT(n == q_left_bools.size());
    //     ASSERT(n == q_right_bools.size());
    //     // we need to check our bool selectors to ensure that there aren't any straggleres that
    //     // we couldn't fit in.
    //     // TODO: hmm this is a lot of code duplication, should refactor once we have this working
    //     uint32_t pending_pair = static_cast<uint32_t>(-1);
    //     for (size_t i = 0; i < pending_bool_selectors.size(); ++i)
    //     {
    //         if (pending_bool_selectors[i] == true)
    //         {
    //             if (pending_pair == static_cast<uint32_t>(-1))
    //             {
    //                 pending_pair = static_cast<uint32_t>(i);
    //             }
    //             else
    //             {
    //                 q_m.emplace_back(fr::field_t({{0,0,0,0}}));
    //                 q_l.emplace_back(fr::field_t({{0,0,0,0}}));
    //                 q_r.emplace_back(fr::field_t({{0,0,0,0}}));
    //                 q_o.emplace_back(fr::field_t({{0,0,0,0}}));
    //                 q_c.emplace_back(fr::field_t({{0,0,0,0}}));
    //                 q_left_bools.emplace_back(fr::one());
    //                 q_right_bools.emplace_back(fr::one());
    //                 w_l.emplace_back(static_cast<uint32_t>(i));
    //                 w_r.emplace_back(static_cast<uint32_t>(pending_pair));
    //                 w_o.emplace_back(static_cast<uint32_t>(i));
    //                 epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
    //                 epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
    //                 epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
    //                 wire_epicycles[static_cast<size_t>(i)].emplace_back(left);
    //                 wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(right);
    //                 wire_epicycles[static_cast<size_t>(i)].emplace_back(out);
    //                 ++n;
    //                 pending_pair = static_cast<uint32_t>(-1);
    //             }
    //         }
    //     }
    //     if (pending_pair != static_cast<uint32_t>(-1))
    //     {
    //         q_m.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_l.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_r.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_o.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_c.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_left_bools.emplace_back(fr::one());
    //         q_right_bools.emplace_back(fr::field_t({{0,0,0,0}}));
    //         w_l.emplace_back(static_cast<uint32_t>(pending_pair));
    //         w_r.emplace_back(static_cast<uint32_t>(pending_pair));
    //         w_o.emplace_back(static_cast<uint32_t>(pending_pair));
    //         epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
    //         epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
    //         epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
    //         wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(left);
    //         wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(right);
    //         wire_epicycles[static_cast<size_t>(pending_pair)].emplace_back(out);
    //         ++n;
    //     }

    //     // add a dummy gate to ensure bool selector polynomials are non-zero
    //     create_dummy_gates();

    //     size_t log2_n = static_cast<size_t>(log2(static_cast<size_t>(n + 1)));

    //     if ((1UL << log2_n) != (n + 1))
    //     {
    //         ++log2_n;
    //     }
    //     size_t new_n = 1UL << log2_n;

    //     for (size_t i = n; i < new_n; ++i)
    //     {
    //         q_m.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_l.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_r.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_o.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_c.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_left_bools.emplace_back(fr::field_t({{0,0,0,0}}));
    //         q_right_bools.emplace_back(fr::field_t({{0,0,0,0}}));
    //         w_l.emplace_back(zero_idx);
    //         w_r.emplace_back(zero_idx);
    //         w_o.emplace_back(zero_idx);
    //     }

    //     Prover output_state(new_n);
    //     compute_sigma_permutations(output_state);
    
    //     std::unique_ptr<ProverBoolWidget> bool_widget = std::make_unique<ProverBoolWidget>(new_n);
    //     std::unique_ptr<ProverArithmeticWidget> arithmetic_widget = std::make_unique<ProverArithmeticWidget>(new_n);

    //     output_state.w_l = polynomial(new_n);
    //     output_state.w_r = polynomial(new_n);
    //     output_state.w_o = polynomial(new_n);
    //     for (size_t i = 0; i < new_n; ++i)
    //     {
    //         fr::copy(variables[w_l[i]], output_state.w_l[i]);
    //         fr::copy(variables[w_r[i]], output_state.w_r[i]);
    //         fr::copy(variables[w_o[i]], output_state.w_o[i]);
    //         fr::copy(q_m[i], arithmetic_widget->q_m[i]);
    //         fr::copy(q_l[i], arithmetic_widget->q_l[i]);
    //         fr::copy(q_r[i], arithmetic_widget->q_r[i]);
    //         fr::copy(q_o[i], arithmetic_widget->q_o[i]);
    //         fr::copy(q_c[i], arithmetic_widget->q_c[i]);
    //         fr::copy(q_left_bools[i], bool_widget->q_bl[i]);
    //         fr::copy(q_right_bools[i], bool_widget->q_br[i]);
    //     }
    //     output_state.widgets.emplace_back(std::move(arithmetic_widget));
    //     output_state.widgets.emplace_back(std::move(bool_widget));
    //     return output_state;
    }
}