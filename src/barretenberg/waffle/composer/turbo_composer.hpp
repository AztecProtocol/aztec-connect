#pragma once

#include "./composer_base.hpp"
#include <map>
#include <string>

namespace waffle
{
class TurboComposer : public ComposerBase
{
public:
    TurboComposer(const size_t size_hint = 0) : ComposerBase()
    {
        features |= static_cast<size_t>(Features::BASIC_ARITHMETISATION);
        w_l.reserve(size_hint);
        w_r.reserve(size_hint);
        w_o.reserve(size_hint);
        w_4.reserve(size_hint);
        q_m.reserve(size_hint);
        q_1.reserve(size_hint);
        q_2.reserve(size_hint);
        q_3.reserve(size_hint);
        q_4.reserve(size_hint);
        q_arith.reserve(size_hint);
        q_c.reserve(size_hint);
        q_4_next.reserve(size_hint);
        q_ecc_1.reserve(size_hint);

        zero_idx = add_variable(barretenberg::fr::zero);
    };
    TurboComposer(TurboComposer &&other) = default;
    TurboComposer& operator=(TurboComposer &&other) = default;
    ~TurboComposer() {}

    std::shared_ptr<proving_key> compute_proving_key() override;
    std::shared_ptr<verification_key> compute_verification_key() override;
    std::shared_ptr<program_witness> compute_witness() override;

    TurboProver preprocess();

    void create_add_gate(const add_triple &in) override;
    void create_big_add_gate(const add_quad &in);

    void create_mul_gate(const mul_triple &in) override;
    void create_bool_gate(const uint32_t a) override;
    void create_poly_gate(const poly_triple &in) override;
    void create_fixed_group_add_gate(const fixed_group_add_quad& in);
    void create_fixed_group_add_gate_with_init(const fixed_group_add_quad& in, const fixed_group_init_quad& init);
    void fix_witness(const uint32_t witness_index, const barretenberg::fr::field_t& witness_value);
    uint32_t put_constant_variable(const barretenberg::fr::field_t& variable);
 
    void create_dummy_gates();
    size_t get_num_constant_gates() const override { return 0; }

    size_t zero_idx;

    // these are variables that we have used a gate on, to enforce that they are equal to a defined value
    std::map<barretenberg::fr::field_t, uint32_t> constant_variables;

    std::vector<barretenberg::fr::field_t> q_m;
    std::vector<barretenberg::fr::field_t> q_c;
    std::vector<barretenberg::fr::field_t> q_1;
    std::vector<barretenberg::fr::field_t> q_2;
    std::vector<barretenberg::fr::field_t> q_3;
    std::vector<barretenberg::fr::field_t> q_4;
    std::vector<barretenberg::fr::field_t> q_arith;
    std::vector<barretenberg::fr::field_t> q_ecc_1;
    std::vector<barretenberg::fr::field_t> q_4_next;

    static transcript::Manifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        static const transcript::Manifest output =
            transcript::Manifest({ transcript::Manifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
                            transcript::Manifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                            { "W_1", g1_size, false },
                                                            { "W_2", g1_size, false },
                                                            { "W_3", g1_size, false },
                                                            { "W_4", g1_size, false } },
                                                            "beta"),
                            transcript::Manifest::RoundManifest({ {} }, "gamma"),
                            transcript::Manifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
                            transcript::Manifest::RoundManifest(
                                { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false }, { "T_4", g1_size, false } }, "z"),
                            transcript::Manifest::RoundManifest({ { "w_1", fr_size, false },
                                                            { "w_2", fr_size, false },
                                                            { "w_3", fr_size, false },
                                                            { "w_4", fr_size, false },
                                                            { "w_1_omega", fr_size, false },
                                                            { "w_2_omega", fr_size, false },
                                                            { "w_3_omega", fr_size, false },
                                                            { "w_4_omega", fr_size, false },
                                                            { "z_omega", fr_size, false },
                                                            { "sigma_1", fr_size, false },
                                                            { "sigma_2", fr_size, false },
                                                            { "q_arith", fr_size, false },
                                                            { "q_ecc_1", fr_size, false },
                                                            { "q_c", fr_size, false },
                                                            { "r", fr_size, false },
                                                            { "t", fr_size, true } },
                                                            "nu"),
                            transcript::Manifest::RoundManifest(
                                { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
        return output;
    }
};
}
