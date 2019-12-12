#ifndef STANDARD_COMPOSER_HPP
#define STANDARD_COMPOSER_HPP

#include "./composer_base.hpp"

namespace waffle
{
class StandardComposer : public ComposerBase
{
public:
    StandardComposer(const size_t size_hint = 0) : ComposerBase()
    {
        features |= static_cast<size_t>(Features::BASIC_ARITHMETISATION);
        w_l.reserve(size_hint);
        w_r.reserve(size_hint);
        w_o.reserve(size_hint);
        q_m.reserve(size_hint);
        q_l.reserve(size_hint);
        q_r.reserve(size_hint);
        q_o.reserve(size_hint);
        q_c.reserve(size_hint);
    };

    virtual Prover preprocess() override;

    void create_add_gate(const add_triple &in) override;
    void create_mul_gate(const mul_triple &in) override;
    void create_bool_gate(const uint32_t a) override;
    void create_poly_gate(const poly_triple &in) override;
    void create_dummy_gates();
    size_t get_num_constant_gates() const override { return 0; }

    size_t zero_idx;

    std::vector<barretenberg::fr::field_t> q_m;
    std::vector<barretenberg::fr::field_t> q_l;
    std::vector<barretenberg::fr::field_t> q_r;
    std::vector<barretenberg::fr::field_t> q_o;
    std::vector<barretenberg::fr::field_t> q_c;
};
}
#endif