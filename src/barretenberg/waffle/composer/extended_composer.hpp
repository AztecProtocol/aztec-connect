#pragma once

#include "./bool_composer.hpp"
#include <array>

namespace waffle {

class ExtendedComposer : public BoolComposer {
  public:
    struct extended_wire_properties {
        bool is_mutable = false;
        uint32_t index = static_cast<uint32_t>(-1);
        WireType wire_type = WireType::NULL_WIRE;
        std::vector<barretenberg::fr::field_t*> selectors;

        extended_wire_properties& operator=(const extended_wire_properties& other)
        {
            is_mutable = other.is_mutable;
            index = other.index;
            wire_type = other.wire_type;
            selectors = std::vector<barretenberg::fr::field_t*>();
            std::copy(other.selectors.begin(), other.selectors.end(), std::back_inserter(selectors));
            return *this;
        }
    };
    struct quad {
        std::array<size_t, 2> gate_indices;
        extended_wire_properties removed_wire;
        // std::array<uint32_t, 4> wires;
        std::array<extended_wire_properties, 4> wires;
    };

    ExtendedComposer(const size_t size_hint = 0)
        : BoolComposer(size_hint)
    {
        q_3_next.reserve(size_hint);
        features |= static_cast<size_t>(Features::EXTENDED_ARITHMETISATION);
        zero_selector = barretenberg::fr::zero;
    };
    ExtendedComposer(ExtendedComposer&& other) = default;
    ExtendedComposer& operator=(ExtendedComposer&& other) = default;
    ~ExtendedComposer() {}

    size_t get_num_gates() const override
    {
        if (adjusted_n > 0) {
            return adjusted_n;
        }
        return n;
    }

    bool is_gate_deleted(const size_t index) const { return deleted_gates[index]; }

    // virtual uint32_t add_variable(const barretenberg::fr::field_t &in) { return BoolComposer::add_variable(in); }
    bool check_gate_flag(const size_t gate_index, const GateFlags flag) const;
    std::array<extended_wire_properties, 4> filter(const uint32_t l1,
                                                   const uint32_t r1,
                                                   const uint32_t o1,
                                                   const uint32_t l2,
                                                   const uint32_t r2,
                                                   const uint32_t o2,
                                                   const uint32_t removed_wire,
                                                   const size_t gate_index);
    extended_wire_properties get_shared_wire(const size_t i);
    void combine_linear_relations();
    void compute_sigma_permutations(proving_key* key, const size_t width);

    std::shared_ptr<proving_key> compute_proving_key() override;
    std::shared_ptr<verification_key> compute_verification_key() override;
    std::shared_ptr<program_witness> compute_witness() override;
    ExtendedProver preprocess();

    uint32_t add_variable(const barretenberg::fr::field_t& in) override { return BoolComposer::add_variable(in); }

    void create_add_gate(const add_triple& in) override { BoolComposer::create_add_gate(in); };
    void create_mul_gate(const mul_triple& in) override { BoolComposer::create_mul_gate(in); };
    void create_bool_gate(const uint32_t a) override { BoolComposer::create_bool_gate(a); };
    void create_poly_gate(const poly_triple& in) override { BoolComposer::create_poly_gate(in); };

    virtual size_t get_num_constant_gates() const override { return StandardComposer::get_num_constant_gates(); }
    std::vector<barretenberg::fr::field_t> q_3_next;

    static transcript::Manifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        static const transcript::Manifest output = transcript::Manifest(
            { transcript::Manifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
              transcript::Manifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                           { "W_1", g1_size, false },
                                                           { "W_2", g1_size, false },
                                                           { "W_3", g1_size, false } },
                                                         "beta"),
              transcript::Manifest::RoundManifest({ {} }, "gamma"),
              transcript::Manifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
              transcript::Manifest::RoundManifest(
                  { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
              transcript::Manifest::RoundManifest({ { "w_1", fr_size, false },
                                                           { "w_2", fr_size, false },
                                                           { "w_3", fr_size, false },
                                                           { "w_3_omega", fr_size, false },
                                                           { "z_omega", fr_size, false },
                                                           { "sigma_1", fr_size, false },
                                                           { "sigma_2", fr_size, false },
                                                           { "r", fr_size, false },
                                                           { "t", fr_size, true } },
                                                         "nu"),
              transcript::Manifest::RoundManifest(
                  { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
        return output;
    }

  private:
    std::vector<bool> deleted_gates;
    std::vector<uint32_t> adjusted_gate_indices;
    barretenberg::fr::field_t zero_selector;
    size_t adjusted_n = 0;
};
} // namespace waffle
