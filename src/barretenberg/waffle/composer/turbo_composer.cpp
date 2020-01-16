#include "./turbo_composer.hpp"

#include <math.h>

#include "../../assert.hpp"
#include "../../curves/bn254/fr.hpp"
#include "../proof_system/widgets/turbo_fixed_base_widget.hpp"
#include "../proof_system/widgets/turbo_arithmetic_widget.hpp"

using namespace barretenberg;

namespace waffle {
void TurboComposer::create_add_gate(const add_triple& in)
{
    gate_flags.push_back(0);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    w_4.emplace_back(zero_idx);
    q_m.emplace_back(fr::zero);
    q_1.emplace_back(in.a_scaling);
    q_2.emplace_back(in.b_scaling);
    q_3.emplace_back(in.c_scaling);
    q_c.emplace_back(in.const_scaling);
    q_arith.emplace_back(fr::one);
    q_4.emplace_back(fr::zero);
    q_4_next.emplace_back(fr::zero);
    q_ecc_1.emplace_back(fr::zero);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}

void TurboComposer::create_mul_gate(const mul_triple& in)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    w_4.emplace_back(zero_idx);
    q_m.emplace_back(in.mul_scaling);
    q_1.emplace_back(fr::zero);
    q_2.emplace_back(fr::zero);
    q_3.emplace_back(in.c_scaling);
    q_c.emplace_back(in.const_scaling);
    q_arith.emplace_back(fr::one);
    q_4.emplace_back(fr::zero);
    q_4_next.emplace_back(fr::zero);
    q_ecc_1.emplace_back(fr::zero);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}

void TurboComposer::create_bool_gate(const uint32_t variable_index)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(variable_index);
    w_r.emplace_back(variable_index);
    w_o.emplace_back(variable_index);
    w_4.emplace_back(zero_idx);
    q_arith.emplace_back(fr::one);
    q_4.emplace_back(fr::zero);
    q_4_next.emplace_back(fr::zero);
    q_ecc_1.emplace_back(fr::zero);

    q_m.emplace_back(fr::one);
    q_1.emplace_back(fr::zero);
    q_2.emplace_back(fr::zero);
    q_3.emplace_back(fr::neg_one());
    q_c.emplace_back(fr::zero);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > variable_index);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(out);
    ++n;
}

void TurboComposer::create_poly_gate(const poly_triple& in)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    w_4.emplace_back(zero_idx);
    q_m.emplace_back(in.q_m);
    q_1.emplace_back(in.q_l);
    q_2.emplace_back(in.q_r);
    q_3.emplace_back(in.q_o);
    q_c.emplace_back(in.q_c);

    q_arith.emplace_back(fr::one);
    q_4.emplace_back(fr::zero);
    q_4_next.emplace_back(fr::zero);
    q_ecc_1.emplace_back(fr::zero);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}


Prover TurboComposer::preprocess()
{
    ASSERT(wire_epicycles.size() == variables.size());
    ASSERT(n == q_m.size());
    ASSERT(n == q_1.size());
    ASSERT(n == q_2.size());
    ASSERT(n == q_3.size());
    ASSERT(n == q_3.size());
    ASSERT(n == q_4.size());
    ASSERT(n == q_4_next.size());
    ASSERT(n == q_arith.size());
    ASSERT(n == q_ecc_1.size());

    size_t log2_n = static_cast<size_t>(log2(n + 1));
    if ((1UL << log2_n) != (n + 1)) {
        ++log2_n;
    }
    size_t new_n = 1UL << log2_n;

    for (size_t i = n; i < new_n; ++i) {
        q_m.emplace_back(fr::zero);
        q_1.emplace_back(fr::zero);
        q_2.emplace_back(fr::zero);
        q_3.emplace_back(fr::zero);
        q_c.emplace_back(fr::zero);
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
        w_4.emplace_back(zero_idx);
        q_4.emplace_back(fr::zero);
        q_4_next.emplace_back(fr::zero);
        q_arith.emplace_back(fr::zero);
        q_ecc_1.emplace_back(fr::zero);
    }
    Prover output_state(new_n, create_manifest(), true);

    compute_sigma_permutations(output_state);

    std::unique_ptr<ProverTurboFixedBaseWidget> widget = std::make_unique<ProverTurboFixedBaseWidget>(new_n);

    output_state.w_l = polynomial(new_n);
    output_state.w_r = polynomial(new_n);
    output_state.w_o = polynomial(new_n);
    output_state.w_4 = polynomial(new_n);

    for (size_t i = 0; i < new_n; ++i) {
        fr::__copy(variables[w_l[i]], output_state.w_l.at(i));
        fr::__copy(variables[w_r[i]], output_state.w_r.at(i));
        fr::__copy(variables[w_o[i]], output_state.w_o.at(i));

        fr::__copy(variables[w_4[i]], output_state.w_4.at(i));
        fr::__copy(q_m[i], widget->q_m.at(i));
        fr::__copy(q_1[i], widget->q_1.at(i));
        fr::__copy(q_2[i], widget->q_2.at(i));
        fr::__copy(q_3[i], widget->q_3.at(i));
        fr::__copy(q_c[i], widget->q_c.at(i));
        fr::__copy(q_4[i], widget->q_4[i]);
        fr::__copy(q_4_next[i], widget->q_4_next[i]);
        fr::__copy(q_arith[i], widget->q_arith[i]);
        fr::__copy(q_ecc_1[i], widget->q_ecc_1[i]);
    }
    output_state.widgets.emplace_back(std::move(widget));
    return output_state;
}
} // namespace waffle