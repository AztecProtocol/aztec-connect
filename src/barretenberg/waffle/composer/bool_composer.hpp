#ifndef BOOL_COMPOSER_HPP
#define BOOL_COMPOSER_HPP

#include "./standard_composer.hpp"

namespace waffle
{

class BoolComposer : public StandardComposer
{
public:
    BoolComposer(const size_t size_hint = 0) : StandardComposer()
    {
        q_left_bools.reserve(size_hint);
        q_right_bools.reserve(size_hint);
        q_output_bools.reserve(size_hint);
        zero_idx = add_variable(barretenberg::fr::field_t({{0,0,0,0}}));
        features |= static_cast<size_t>(Features::BOOL_SELECTORS);
    };

    Prover preprocess() override;

    uint32_t add_variable(const barretenberg::fr::field_t &in) override
    {
        is_bool.push_back(false);
        return ComposerBase::add_variable(in);
    }

    void create_add_gate(const add_triple &in) override;
    void create_mul_gate(const mul_triple &in) override;
    void create_bool_gate(const uint32_t a) override;
    void create_poly_gate(const poly_triple &in) override;
    void create_dummy_gates();

    void process_bool_gates();
    size_t get_num_constant_gates() const override { return StandardComposer::get_num_constant_gates(); }

    std::vector<barretenberg::fr::field_t> q_left_bools;
    std::vector<barretenberg::fr::field_t> q_right_bools;
    std::vector<barretenberg::fr::field_t> q_output_bools;

    std::vector<bool> is_bool;
    uint32_t zero_idx;
};
}
#endif