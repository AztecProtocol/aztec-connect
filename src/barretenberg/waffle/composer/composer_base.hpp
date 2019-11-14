#ifndef COMPOSER_BASE_HPP
#define COMPOSER_BASE_HPP

#include "../../types.hpp"
#include "../../polynomials/polynomial.hpp"

#include "../proof_system/prover/prover.hpp"

namespace waffle
{
struct add_triple
{
    uint32_t a;
    uint32_t b;
    uint32_t c;
    barretenberg::fr::field_t a_scaling;
    barretenberg::fr::field_t b_scaling;
    barretenberg::fr::field_t c_scaling;
    barretenberg::fr::field_t const_scaling;
};

struct mul_triple
{
    uint32_t a;
    uint32_t b;
    uint32_t c;
    barretenberg::fr::field_t mul_scaling;
    barretenberg::fr::field_t c_scaling;
    barretenberg::fr::field_t const_scaling;
};

struct poly_triple
{
    uint32_t a;
    uint32_t b;
    uint32_t c;
    barretenberg::fr::field_t q_m;
    barretenberg::fr::field_t q_l;
    barretenberg::fr::field_t q_r;
    barretenberg::fr::field_t q_o;
    barretenberg::fr::field_t q_c;
};

class ComposerBase
{
public:
    enum Features
    {
        SAD_TROMBONE = 0x00,
        BASIC_ARITHMETISATION = 0x01,
        EXTENDED_ARITHMETISATION = 0x02,
        BOOL_SELECTORS = 0x04,
        MIMC_SELECTORS = 0x08,
        ECC_SELECTORS = 0x10
    };
    enum WireType
    {
        LEFT = 0U,
        RIGHT = (1U << 30U),
        OUTPUT = (1U << 31U)
    };
    struct epicycle
    {
        uint32_t gate_index;
        WireType wire_type;
    };
    ComposerBase() {};
    ~ComposerBase() {};

    virtual Prover preprocess() = 0;

    virtual bool supports_feature(const Features target_feature)
    {
        return ((features & static_cast<size_t>(target_feature)) != 0);
    }

    virtual void create_add_gate(const add_triple &in) = 0;
    virtual void create_mul_gate(const mul_triple &in) = 0;
    virtual void create_bool_gate(const uint32_t a) = 0;
    virtual void create_poly_gate(const poly_triple &in) = 0;    
    virtual size_t get_num_constant_gates() = 0;

    barretenberg::fr::field_t get_variable(const uint32_t index) const
    {
        ASSERT(variables.size() > index);
        return variables[index];
    }

    virtual uint32_t add_variable(const barretenberg::fr::field_t &in)
    {
        variables.emplace_back(in);
        wire_epicycles.push_back(std::vector<epicycle>());
        return static_cast<uint32_t>(variables.size()) - 1U;
    }

    virtual void assert_equal(const uint32_t a_idx, const uint32_t b_idx)
    {
        ASSERT(barretenberg::fr::eq(variables[a_idx], variables[b_idx]));
        for (size_t i = 0; i < wire_epicycles[b_idx].size(); ++i)
        {
            wire_epicycles[a_idx].emplace_back(wire_epicycles[b_idx][i]);
        }
        wire_epicycles[b_idx] = std::vector<epicycle>();
    }

    void compute_sigma_permutations(Prover &output_state)
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
                sigmas[static_cast<uint32_t>(current_epicycle.wire_type) >> 30U][current_epicycle.gate_index] = next_epicycle.gate_index + static_cast<uint32_t>(next_epicycle.wire_type);;
            }
        }
    }

protected:
    std::vector<barretenberg::fr::field_t> variables;
    std::vector<std::vector<epicycle> > wire_epicycles;
    size_t features = static_cast<size_t>(Features::SAD_TROMBONE);
};
}

#endif