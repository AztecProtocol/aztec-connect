#include "./bool_composer.hpp"

#include "../../assert.hpp"
#include "../../curves/bn254/fr.hpp"
#include "../proof_system/widgets/bool_widget.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"

#include <math.h>

using namespace barretenberg;

namespace waffle
{
    void BoolComposer::create_add_gate(const add_triple &in)
    {
        StandardComposer::create_add_gate(in);
    }

    void BoolComposer::create_mul_gate(const mul_triple &in)
    {
        StandardComposer::create_mul_gate(in);
    }

    void BoolComposer::create_bool_gate(const uint32_t variable_index)
    {
        if (is_bool[variable_index] == false)
        {
            is_bool[variable_index] = true;
        }
    }

    void BoolComposer::create_poly_gate(const poly_triple &in)
    {
        StandardComposer::create_poly_gate(in);
    }

    void BoolComposer::create_dummy_gates()
    {
        StandardComposer::create_dummy_gates();
        q_left_bools.emplace_back(fr::zero);
        q_right_bools.emplace_back(fr::zero);
        q_left_bools.emplace_back(fr::zero);
        q_right_bools.emplace_back(fr::zero);

        // add a dummy gate to ensure that left / right bool selectors are nonzero
        q_m.emplace_back(fr::field_t({{0,0,0,0}}));
        q_l.emplace_back(fr::field_t({{0,0,0,0}}));
        q_r.emplace_back(fr::field_t({{0,0,0,0}}));
        q_o.emplace_back(fr::field_t({{0,0,0,0}}));
        q_c.emplace_back(fr::field_t({{0,0,0,0}}));
        q_left_bools.emplace_back(fr::one);
        q_right_bools.emplace_back(fr::one);
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
    }

    void BoolComposer::process_bool_gates()
    {
        q_left_bools.reserve(n);
        q_right_bools.reserve(n);
        q_output_bools.reserve(n);
        for (size_t i = 0; i < n; ++i)
        {
            q_left_bools.emplace_back(is_bool[w_l[i]] ? fr::one : fr::zero);
            q_right_bools.emplace_back(is_bool[w_r[i]] ? fr::one : fr::zero);
            q_output_bools.emplace_back(is_bool[w_o[i]] ? fr::one : fr::zero);
        }
    }

    Prover BoolComposer::preprocess()
    {
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

        process_bool_gates();

        size_t log2_n = static_cast<size_t>(log2(static_cast<size_t>(n + 1)));

        if ((1UL << log2_n) != (n + 1))
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
            q_left_bools.emplace_back(fr::field_t({{0,0,0,0}}));
            q_right_bools.emplace_back(fr::field_t({{0,0,0,0}}));
            q_output_bools.emplace_back(fr::field_t({{0,0,0,0}}));
            w_l.emplace_back(zero_idx);
            w_r.emplace_back(zero_idx);
            w_o.emplace_back(zero_idx);
        }

        Prover output_state(new_n, create_manifest());
        compute_sigma_permutations(output_state);
    
        std::unique_ptr<ProverBoolWidget> bool_widget = std::make_unique<ProverBoolWidget>(new_n);
        std::unique_ptr<ProverArithmeticWidget> arithmetic_widget = std::make_unique<ProverArithmeticWidget>(new_n);

        output_state.w_l = polynomial(new_n);
        output_state.w_r = polynomial(new_n);
        output_state.w_o = polynomial(new_n);
        for (size_t i = 0; i < new_n; ++i)
        {
            fr::__copy(variables[w_l[i]], output_state.w_l[i]);
            fr::__copy(variables[w_r[i]], output_state.w_r[i]);
            fr::__copy(variables[w_o[i]], output_state.w_o[i]);
            fr::__copy(q_m[i], arithmetic_widget->q_m[i]);
            fr::__copy(q_l[i], arithmetic_widget->q_l[i]);
            fr::__copy(q_r[i], arithmetic_widget->q_r[i]);
            fr::__copy(q_o[i], arithmetic_widget->q_o[i]);
            fr::__copy(q_c[i], arithmetic_widget->q_c[i]);
            fr::__copy(q_left_bools[i], bool_widget->q_bl[i]);
            fr::__copy(q_right_bools[i], bool_widget->q_br[i]);
            fr::__copy(q_output_bools[i], bool_widget->q_bo[i]);
        }
        output_state.widgets.emplace_back(std::move(arithmetic_widget));
        output_state.widgets.emplace_back(std::move(bool_widget));

        return output_state;
    }
}