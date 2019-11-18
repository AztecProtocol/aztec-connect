#include "./standard_composer.hpp"

#include "../../assert.hpp"
#include "../../fields/fr.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"

#include "math.h"

using namespace barretenberg;

namespace waffle
{
    void StandardComposer::create_add_gate(const add_triple &in)
    {
        gate_flags.push_back(0);
        w_l.emplace_back(in.a);
        w_r.emplace_back(in.b);
        w_o.emplace_back(in.c);
        q_m.emplace_back(fr::zero());
        q_l.emplace_back(in.a_scaling);
        q_r.emplace_back(in.b_scaling);
        q_o.emplace_back(in.c_scaling);
        q_c.emplace_back(in.const_scaling);

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > in.a);
        ASSERT(wire_epicycles.size() > in.b);
        ASSERT(wire_epicycles.size() > in.c);
        wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
        ++n;
    }

    void StandardComposer::create_mul_gate(const mul_triple &in)
    {
        gate_flags.push_back(0);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
        w_l.emplace_back(in.a);
        w_r.emplace_back(in.b);
        w_o.emplace_back(in.c);
        q_m.emplace_back(in.mul_scaling);
        q_l.emplace_back(fr::zero());
        q_r.emplace_back(fr::zero());
        q_o.emplace_back(in.c_scaling);
        q_c.emplace_back(in.const_scaling);

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > in.a);
        ASSERT(wire_epicycles.size() > in.b);
        ASSERT(wire_epicycles.size() > in.c);
        wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
        ++n;
    }

    void StandardComposer::create_bool_gate(const uint32_t variable_index)
    {
        gate_flags.push_back(0);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
        w_l.emplace_back(variable_index);
        w_r.emplace_back(variable_index);
        w_o.emplace_back(variable_index);

        q_m.emplace_back(fr::one());
        q_l.emplace_back(fr::zero());
        q_r.emplace_back(fr::zero());
        q_o.emplace_back(fr::neg_one());
        q_c.emplace_back(fr::zero());

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > variable_index);
        wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(out);
        ++n;
    }

    void StandardComposer::create_poly_gate(const poly_triple &in)
    {
        gate_flags.push_back(0);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
        add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
        w_l.emplace_back(in.a);
        w_r.emplace_back(in.b);
        w_o.emplace_back(in.c);
        q_m.emplace_back(in.q_m);
        q_l.emplace_back(in.q_l);
        q_r.emplace_back(in.q_r);
        q_o.emplace_back(in.q_o);
        q_c.emplace_back(in.q_c);

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > in.a);
        ASSERT(wire_epicycles.size() > in.b);
        ASSERT(wire_epicycles.size() > in.c);
        wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
        ++n;
    }

    void StandardComposer::create_dummy_gates()
    {
        gate_flags.push_back(0);
        // add in a dummy gate to ensure that all of our polynomials are not zero and not identical
        q_m.emplace_back(fr::to_montgomery_form({{1,0,0,0}}));
        q_l.emplace_back(fr::to_montgomery_form({{2,0,0,0}}));
        q_r.emplace_back(fr::to_montgomery_form({{3,0,0,0}}));
        q_o.emplace_back(fr::to_montgomery_form({{4,0,0,0}}));
        q_c.emplace_back(fr::to_montgomery_form({{5,0,0,0}}));

        uint32_t a_idx = add_variable(fr::to_montgomery_form({{6,0,0,0}}));
        uint32_t b_idx = add_variable(fr::to_montgomery_form({{7,0,0,0}}));
        uint32_t c_idx = add_variable(fr::neg(fr::to_montgomery_form({{20,0,0,0}})));

        w_l.emplace_back(a_idx);
        w_r.emplace_back(b_idx);
        w_o.emplace_back(c_idx);

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > a_idx);
        ASSERT(wire_epicycles.size() > b_idx);
        ASSERT(wire_epicycles.size() > c_idx);
        wire_epicycles[static_cast<size_t>(a_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(b_idx)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(c_idx)].emplace_back(out);
        ++n;

        // add a second dummy gate the ensure our permutation polynomials are also
        // distinct from the identity permutation
        q_m.emplace_back(fr::to_montgomery_form({{1,0,0,0}}));
        q_l.emplace_back(fr::to_montgomery_form({{1,0,0,0}}));
        q_r.emplace_back(fr::to_montgomery_form({{1,0,0,0}}));
        q_o.emplace_back(fr::to_montgomery_form({{1,0,0,0}}));
        q_c.emplace_back((fr::to_montgomery_form({{127,0,0,0}})));

        w_l.emplace_back(c_idx);
        w_r.emplace_back(a_idx);
        w_o.emplace_back(b_idx);

        left = {static_cast<uint32_t>(n), WireType::LEFT};
        right = {static_cast<uint32_t>(n), WireType::RIGHT};
        out = {static_cast<uint32_t>(n), WireType::OUTPUT};
        ASSERT(wire_epicycles.size() > c_idx);
        ASSERT(wire_epicycles.size() > a_idx);
        ASSERT(wire_epicycles.size() > b_idx);
        wire_epicycles[static_cast<size_t>(c_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(a_idx)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(b_idx)].emplace_back(out);
        ++n;
    }

    Prover StandardComposer::preprocess()
    {
        ASSERT(wire_epicycles.size() == variables.size());
        ASSERT(n == q_m.size());
        ASSERT(n == q_l.size());
        ASSERT(n == q_r.size());
        ASSERT(n == q_o.size());
        ASSERT(n == q_o.size());

        // ensure witness / instance polynomials are non-zero
        create_dummy_gates();
        size_t log2_n = static_cast<size_t>(log2(n + 1));
        if ((1UL << log2_n) != (n + 1))
        {
            ++log2_n;
        }
        size_t new_n = 1UL << log2_n;
        variables.emplace_back(fr::zero());
        zero_idx = variables.size() - 1;
        for (size_t i = n; i < new_n; ++i)
        {
            q_m.emplace_back(fr::zero());
            q_l.emplace_back(fr::zero());
            q_r.emplace_back(fr::zero());
            q_o.emplace_back(fr::zero());
            q_c.emplace_back(fr::zero());
            w_l.emplace_back(zero_idx);
            w_r.emplace_back(zero_idx);
            w_o.emplace_back(zero_idx);
        }
        Prover output_state(new_n);
    
        compute_sigma_permutations(output_state);
    
        std::unique_ptr<ProverArithmeticWidget> widget = std::make_unique<ProverArithmeticWidget>(new_n);

        output_state.w_l = polynomial(new_n);
        output_state.w_r = polynomial(new_n);
        output_state.w_o = polynomial(new_n);
 
        for (size_t i = 0; i < new_n; ++i)
        {
            fr::copy(variables[w_l[i]], output_state.w_l.at(i));
            fr::copy(variables[w_r[i]], output_state.w_r.at(i));
            fr::copy(variables[w_o[i]], output_state.w_o.at(i));

            fr::copy(q_m[i], widget->q_m.at(i));
            fr::copy(q_l[i], widget->q_l.at(i));
            fr::copy(q_r[i], widget->q_r.at(i));
            fr::copy(q_o[i], widget->q_o.at(i));
            fr::copy(q_c[i], widget->q_c.at(i));
        }

        output_state.widgets.emplace_back(std::move(widget));
        return output_state;
    }
}