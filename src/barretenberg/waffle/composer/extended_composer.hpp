#ifndef EXTENDED_COMPOSER_HPP
#define EXTENDED_COMPOSER_HPP

#include "./bool_composer.hpp"

namespace waffle
{

class ExtendedComposer : public BoolComposer
{
public:
    struct quad
    {
        std::array<size_t, 2> gate_indices;
        uint32_t removed_wire;
        std::array<uint32_t, 4> wires;
        // std::array<constraint_type, 4> wire_constraint_type;
        std::array<barretenberg::fr::field_t, 2> removed_selectors;
    };

    ExtendedComposer(const size_t size_hint = 0) : BoolComposer()
    {
        q_oo.reserve(size_hint);
        zero_idx = add_variable(barretenberg::fr::field_t({{0,0,0,0}}));
        features |= static_cast<size_t>(Features::EXTENDED_ARITHMETISATION);
    };

    ~ExtendedComposer() {};

    std::array<uint32_t, 4> filter(const uint32_t l1, const uint32_t r1, const uint32_t o1, const uint32_t l2, const uint32_t r2, const uint32_t o2, const uint32_t target_wire, const size_t gate_index);
    uint32_t get_shared_wire(const size_t i);
    void combine_linear_relations();
    Prover preprocess();

    virtual uint32_t add_variable(const barretenberg::fr::field_t &in)
    {
        return BoolComposer::add_variable(in);
    }

    // void create_add_gate(const add_triple &in);
    // void create_mul_gate(const mul_triple &in);
    // void create_bool_gate(const uint32_t a);
    // void create_poly_gate(const poly_triple &in);
    // void create_dummy_gates();
    virtual size_t get_num_constant_gates() { return StandardComposer::get_num_constant_gates() + 1; }

    std::vector<barretenberg::fr::field_t> q_oo;
    std::vector<bool> deleted_gates;

    uint32_t zero_idx;
};
}
#endif