#pragma once

#include "../../curves/bn254/fr.hpp"
#include "../../curves/bn254/scalar_multiplication/scalar_multiplication.hpp"
#include "../../polynomials/polynomial.hpp"
#include "../../transcript/manifest.hpp"
#include "../../types.hpp"
#include "../proof_system/permutation.hpp"
#include "../proof_system/prover/prover.hpp"
#include <memory>
#include <vector>

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

struct add_quad
{
    uint32_t a;
    uint32_t b;
    uint32_t c;
    uint32_t d;
    barretenberg::fr::field_t a_scaling;
    barretenberg::fr::field_t b_scaling;
    barretenberg::fr::field_t c_scaling;
    barretenberg::fr::field_t d_scaling;
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

struct fixed_group_add_quad
{
    uint32_t a;
    uint32_t b;
    uint32_t c;
    uint32_t d;
    barretenberg::fr::field_t q_x_1;
    barretenberg::fr::field_t q_x_2;
    barretenberg::fr::field_t q_y_1;
    barretenberg::fr::field_t q_y_2;
};

struct fixed_group_init_quad
{
    barretenberg::fr::field_t q_x_1;
    barretenberg::fr::field_t q_x_2;
    barretenberg::fr::field_t q_y_1;
    barretenberg::fr::field_t q_y_2;
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
    enum GateFlags
    {
        NONE = 0x00,
        IS_ARITHMETIC_GATE = 0x01,
        IS_MIMC_GATE = 0x02,
        IS_LEFT_BOOL_GATE = 0x04,
        IS_RIGHT_BOOL_GATE = 0x08,
        IS_ECC_GATE = 0x10,
        IS_FIXED_ECC_GATE = 0x20,
        HAS_SEQUENTIAL_LEFT_WIRE = 0x40,
        HAS_SEQUENTIAL_RIGHT_WIRE = 0x80,
        HAS_SEQUENTIAL_OUTPUT_WIRE = 0x100,
        FIXED_LEFT_WIRE = 0x200,
        FIXED_RIGHT_WIRE = 0x400,
        FIXED_OUTPUT_WIRE = 0x800,
    };
    enum WireType
    {
        LEFT = 0U,
        RIGHT = (1U << 30U),
        OUTPUT = (1U << 31U),
        FOURTH = 0xc0000000,
        NULL_WIRE
    };
    struct epicycle
    {
        uint32_t gate_index;
        WireType wire_type;

        epicycle(const uint32_t a, const WireType b) : gate_index(a), wire_type(b)
        {
        }
        epicycle(const epicycle& other) : gate_index(other.gate_index), wire_type(other.wire_type)
        {
        }
        epicycle(epicycle&& other) : gate_index(other.gate_index), wire_type(other.wire_type)
        {
        }
        epicycle& operator=(const epicycle& other)
        {
            gate_index = other.gate_index;
            wire_type = other.wire_type;
            return *this;
        }
        bool operator==(const epicycle& other) const
        {
            return ((gate_index == other.gate_index) && (wire_type == other.wire_type));
        }
    };
    ComposerBase() : n(0) {};
    ComposerBase(ComposerBase &&other) = default;
    ComposerBase& operator=(ComposerBase &&other) = default;
    virtual ~ComposerBase() {};

    virtual size_t get_num_gates() const { return n; }
    virtual size_t get_num_variables() const { return variables.size(); }
    virtual std::shared_ptr<proving_key> compute_proving_key() = 0;
    virtual std::shared_ptr<verification_key> compute_verification_key() = 0;
    virtual std::shared_ptr<program_witness> compute_witness() = 0;

    virtual bool supports_feature(const Features target_feature)
    {
        return ((features & static_cast<size_t>(target_feature)) != 0);
    }

    virtual void create_add_gate(const add_triple& in) = 0;
    virtual void create_mul_gate(const mul_triple& in) = 0;
    virtual void create_bool_gate(const uint32_t a) = 0;
    virtual void create_poly_gate(const poly_triple& in) = 0;
    virtual size_t get_num_constant_gates() const = 0;

    void add_gate_flag(const size_t idx, const GateFlags new_flag)
    {
        gate_flags[idx] = gate_flags[idx] | static_cast<size_t>(new_flag);
    }

    barretenberg::fr::field_t get_variable(const uint32_t index) const
    {
        ASSERT(variables.size() > index);
        return variables[index];
    }

    virtual uint32_t add_variable(const barretenberg::fr::field_t& in)
    {
        variables.emplace_back(in);
        wire_epicycles.push_back(std::vector<epicycle>());
        return static_cast<uint32_t>(variables.size()) - 1U;
    }

    virtual uint32_t add_public_variable(const barretenberg::fr::field_t& in)
    {
        variables.emplace_back(in);
        wire_epicycles.push_back(std::vector<epicycle>());
        const uint32_t index = static_cast<uint32_t>(variables.size()) - 1U;
        public_inputs.emplace_back(index);
        return index;
    }

    void set_public_input(const uint32_t witness_index)
    {
        bool does_not_exist = true;
        for (size_t i = 0; i < public_inputs.size(); ++i)
        {
            does_not_exist = does_not_exist && (public_inputs[i] != witness_index);
        }
        if (does_not_exist)
        {
            public_inputs.emplace_back(witness_index);
        }
    }

    virtual void assert_equal(const uint32_t a_idx, const uint32_t b_idx)
    {
        ASSERT(barretenberg::fr::eq(variables[a_idx], variables[b_idx]));
        for (size_t i = 0; i < wire_epicycles[b_idx].size(); ++i)
        {
            wire_epicycles[a_idx].emplace_back(wire_epicycles[b_idx][i]);
            if (wire_epicycles[b_idx][i].wire_type == WireType::LEFT)
            {
                w_l[wire_epicycles[b_idx][i].gate_index] = a_idx;
            }
            else if (wire_epicycles[b_idx][i].wire_type == WireType::RIGHT)
            {
                w_r[wire_epicycles[b_idx][i].gate_index] = a_idx;
            }
            else
            {
                w_o[wire_epicycles[b_idx][i].gate_index] = a_idx;
            }
        }
        wire_epicycles[b_idx] = std::vector<epicycle>();
    }

    template <size_t program_width>
    void compute_sigma_permutations(proving_key* key)
    {
        std::array<std::vector<uint32_t>, program_width> sigma_mappings;
        std::array<uint32_t, 4> wire_offsets{ 0U, 0x40000000, 0x80000000, 0xc0000000 };
        const uint32_t num_public_inputs = static_cast<uint32_t>(public_inputs.size());

        for (size_t i = 0; i < program_width; ++i)
        {
            sigma_mappings[i].reserve(key->n);
        }
        for (size_t i = 0; i < program_width; ++i)
        {
            for (size_t j = 0; j < key->n; ++j)
            {
                sigma_mappings[i].emplace_back(j + wire_offsets[i]);
            }
        }

        for (size_t i = 0; i < wire_epicycles.size(); ++i)
        {
            for (size_t j = 0; j < wire_epicycles[i].size(); ++j)
            {
                epicycle current_epicycle = wire_epicycles[i][j];
                size_t epicycle_index = j == wire_epicycles[i].size() - 1 ? 0 : j + 1;
                epicycle next_epicycle = wire_epicycles[i][epicycle_index];
                sigma_mappings[static_cast<uint32_t>(current_epicycle.wire_type) >> 30U][current_epicycle.gate_index + num_public_inputs] =
                    next_epicycle.gate_index + static_cast<uint32_t>(next_epicycle.wire_type) + num_public_inputs;   
            }
        }

        for (size_t i = 0; i < program_width; ++i)
        {
            std::string index = std::to_string(i + 1);
            barretenberg::polynomial sigma_polynomial(key->n);
            compute_permutation_lagrange_base_single<standard_settings>(sigma_polynomial, sigma_mappings[i], key->small_domain);
            barretenberg::polynomial sigma_polynomial_lagrange_base(sigma_polynomial);
            key->permutation_selectors_lagrange_base.insert({ "sigma_" + index, std::move(sigma_polynomial_lagrange_base) });
            sigma_polynomial.ifft(key->small_domain);
            barretenberg::polynomial sigma_fft(sigma_polynomial, key->large_domain.size);
            sigma_fft.coset_fft(key->large_domain);
            key->permutation_selectors.insert({ "sigma_" + index, std::move(sigma_polynomial) });
            key->permutation_selector_ffts.insert({ "sigma_" + index + "_fft", std::move(sigma_fft) });
        }
    }

  public:
    size_t n;
    std::vector<uint32_t> w_l;
    std::vector<uint32_t> w_r;
    std::vector<uint32_t> w_o;
    std::vector<uint32_t> w_4;
    std::vector<size_t> gate_flags;
    std::vector<uint32_t> public_inputs;
    std::vector<barretenberg::fr::field_t> variables;
    std::vector<std::vector<epicycle>> wire_epicycles;
    size_t features = static_cast<size_t>(Features::SAD_TROMBONE);

    bool computed_proving_key = false;
    std::shared_ptr<proving_key> circuit_proving_key;

    bool computed_verification_key = false;
    std::shared_ptr<verification_key> circuit_verification_key;

    bool computed_witness = false;
    std::shared_ptr<program_witness> witness;
};
} // namespace waffle