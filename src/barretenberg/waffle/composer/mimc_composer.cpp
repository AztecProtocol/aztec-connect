#include "./mimc_composer.hpp"

#include "../../assert.hpp"
#include "../../fields/fr.hpp"
#include "../proof_system/widgets/mimc_widget.hpp"

#include "math.h"

using namespace barretenberg;

namespace waffle
{
    void MiMCComposer::create_add_gate(const add_triple &in)
    {
        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            create_noop_gate();
        }
        StandardComposer::create_add_gate(in);
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        current_output_wire = static_cast<uint32_t>(-1);
    }

    void MiMCComposer::create_mul_gate(const mul_triple &in)
    {
        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            create_noop_gate();
        }
        StandardComposer::create_mul_gate(in);
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        current_output_wire = static_cast<uint32_t>(-1);
    }

    void MiMCComposer::create_bool_gate(const uint32_t variable_index)
    {
        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            create_noop_gate();
        }
        StandardComposer::create_bool_gate(variable_index);
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        current_output_wire = static_cast<uint32_t>(-1);
    }

    void MiMCComposer::create_poly_gate(const poly_triple &in)
    {
        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            create_noop_gate();
        }
        StandardComposer::create_poly_gate(in);
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        current_output_wire = static_cast<uint32_t>(-1);
    }

    void MiMCComposer::create_mimc_gate(const mimc_quadruplet &in)
    {
        if ((current_output_wire != static_cast<uint32_t>(-1)) && (in.x_in_idx != current_output_wire))
        {
            create_noop_gate();
        }
        w_o.emplace_back(in.x_in_idx);
        w_l.emplace_back(in.k_idx);
        w_r.emplace_back(in.x_cubed_idx);
        current_output_wire = in.x_out_idx;

        q_m.emplace_back(fr::field_t({{0,0,0,0}}));
        q_l.emplace_back(fr::field_t({{0,0,0,0}}));
        q_r.emplace_back(fr::field_t({{0,0,0,0}}));
        q_o.emplace_back(fr::field_t({{0,0,0,0}}));
        q_c.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_coefficient.emplace_back(in.mimc_constant);
        q_mimc_selector.emplace_back(fr::one());

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        wire_epicycles[static_cast<size_t>(in.k_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(in.x_cubed_idx)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(in.x_in_idx)].emplace_back(out);
        ++n;
    }

    void MiMCComposer::create_noop_gate()
    {
        q_m.emplace_back(fr::field_t({{0,0,0,0}}));
        q_l.emplace_back(fr::field_t({{0,0,0,0}}));
        q_r.emplace_back(fr::field_t({{0,0,0,0}}));
        q_o.emplace_back(fr::field_t({{0,0,0,0}}));
        q_c.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);

        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            w_o.emplace_back(current_output_wire);
            wire_epicycles[static_cast<size_t>(current_output_wire)].emplace_back(out);
            current_output_wire = static_cast<uint32_t>(-1);
        }
        else
        {
            w_o.emplace_back(zero_idx);
            wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(out);
        }
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(right);

        ++n;
    }

    void MiMCComposer::create_dummy_gates()
    {
        StandardComposer::create_dummy_gates();
        q_mimc_coefficient.emplace_back(fr::zero());
        q_mimc_selector.emplace_back(fr::zero());
        q_mimc_coefficient.emplace_back(fr::zero());
        q_mimc_selector.emplace_back(fr::zero());


        // add in dummy gates to ensure that all of our polynomials are not zero and not identical
        // TODO: sanitise this :/
        q_m.emplace_back(fr::field_t({{0,0,0,0}}));
        q_l.emplace_back(fr::field_t({{0,0,0,0}}));
        q_r.emplace_back(fr::field_t({{0,0,0,0}}));
        q_o.emplace_back(fr::field_t({{0,0,0,0}}));
        q_c.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_selector.emplace_back(fr::one());
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
        epicycle left{static_cast<uint32_t>(n), WireType::LEFT};
        epicycle right{static_cast<uint32_t>(n), WireType::RIGHT};
        epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(out);

        ++n;

        q_m.emplace_back(fr::field_t({{0,0,0,0}}));
        q_l.emplace_back(fr::field_t({{0,0,0,0}}));
        q_r.emplace_back(fr::field_t({{0,0,0,0}}));
        q_o.emplace_back(fr::field_t({{0,0,0,0}}));
        q_c.emplace_back(fr::field_t({{0,0,0,0}}));
        q_mimc_coefficient.emplace_back(fr::one());
        q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
    
        // add a permutation on zero_idx to ensure SIGMA_1, SIGMA_2, SIGMA_3 are well formed
        left = {static_cast<uint32_t>(n), WireType::LEFT};
        right = {static_cast<uint32_t>(n), WireType::RIGHT};
        out = {static_cast<uint32_t>(n), WireType::OUTPUT};
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(left);
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(right);
        wire_epicycles[static_cast<size_t>(zero_idx)].emplace_back(out);
        ++n;
    }

    Prover MiMCComposer::preprocess()
    {
        ASSERT(wire_epicycles.size() == variables.size());
        ASSERT(n == q_m.size());
        ASSERT(n == q_l.size());
        ASSERT(n == q_r.size());
        ASSERT(n == q_o.size());
        ASSERT(n == q_o.size());
        ASSERT(n == q_mimc_coefficient.size());
        ASSERT(n == q_mimc_selector.size());

        if (current_output_wire != static_cast<uint32_t>(-1))
        {
            w_o.emplace_back(current_output_wire);
            w_l.emplace_back(zero_idx);
            w_r.emplace_back(zero_idx);
            q_m.emplace_back(fr::field_t({{0,0,0,0}}));
            q_l.emplace_back(fr::field_t({{0,0,0,0}}));
            q_r.emplace_back(fr::field_t({{0,0,0,0}}));
            q_o.emplace_back(fr::field_t({{0,0,0,0}}));
            q_c.emplace_back(fr::field_t({{0,0,0,0}}));
            q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
            q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
            epicycle out{static_cast<uint32_t>(n), WireType::OUTPUT};
            wire_epicycles[static_cast<size_t>(current_output_wire)].emplace_back(out);
            ++n;
        }


        size_t log2_n = static_cast<size_t>(log2(n));
        if ((1UL << log2_n) != n)
        {
            ++log2_n;
        }
        size_t new_n = 1UL << log2_n;

        for (size_t i = n; i < new_n; ++i)
        {
            q_m.emplace_back(fr::field_t({{0,0,0,0}}));
            q_l.emplace_back(fr::field_t({{0,0,0,0}}));
            q_r.emplace_back(fr::field_t({{0,0,0,0}}));
            q_o.emplace_back(fr::field_t({{0,0,0,0}}));
            q_c.emplace_back(fr::field_t({{0,0,0,0}}));
            q_mimc_coefficient.emplace_back(fr::field_t({{0,0,0,0}}));
            q_mimc_selector.emplace_back(fr::field_t({{0,0,0,0}}));
            w_l.emplace_back(zero_idx);
            w_r.emplace_back(zero_idx);
            w_o.emplace_back(zero_idx);
        }
        Prover output_state(new_n);
    
        compute_sigma_permutations(output_state);
    
        std::unique_ptr<ProverMiMCWidget> mimc_widget = std::make_unique<ProverMiMCWidget>(new_n);
        std::unique_ptr<ProverArithmeticWidget> arithmetic_widget = std::make_unique<ProverArithmeticWidget>(new_n);

        output_state.w_l = polynomial(new_n);
        output_state.w_r = polynomial(new_n);
        output_state.w_o = polynomial(new_n);
 
        for (size_t i = 0; i < new_n; ++i)
        {
            fr::copy(variables[w_l[i]], output_state.w_l[i]);
            fr::copy(variables[w_r[i]], output_state.w_r[i]);
            fr::copy(variables[w_o[i]], output_state.w_o[i]);

            fr::copy(q_m[i], arithmetic_widget->q_m[i]);
            fr::copy(q_l[i], arithmetic_widget->q_l[i]);
            fr::copy(q_r[i], arithmetic_widget->q_r[i]);
            fr::copy(q_o[i], arithmetic_widget->q_o[i]);
            fr::copy(q_c[i], arithmetic_widget->q_c[i]);
            fr::copy(q_mimc_coefficient[i], mimc_widget->q_mimc_coefficient[i]);
            fr::copy(q_mimc_selector[i], mimc_widget->q_mimc_selector[i]);
        }

        output_state.widgets.emplace_back(std::move(arithmetic_widget));
        output_state.widgets.emplace_back(std::move(mimc_widget));
        return output_state;
    }
}