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
        add_variable(barretenberg::fr::field_t({{0,0,0,0}}));
        zero_idx = 0;
        features |= static_cast<size_t>(Features::BOOL_SELECTORS);
    };

    ~BoolComposer() {};

    Prover preprocess();

    virtual uint32_t add_variable(const barretenberg::fr::field_t &in)
    {
        pending_bool_selectors.emplace_back(false);
        return ComposerBase::add_variable(in);
    }

    void create_add_gate(const add_triple &in);
    void create_mul_gate(const mul_triple &in);
    void create_bool_gate(const uint32_t a);
    void create_poly_gate(const poly_triple &in);

    std::vector<barretenberg::fr::field_t> q_left_bools;
    std::vector<barretenberg::fr::field_t> q_right_bools;

    std::vector<bool> pending_bool_selectors;
    uint32_t zero_idx;
};
}
#endif