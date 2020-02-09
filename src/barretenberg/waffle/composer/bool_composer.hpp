#pragma once 

#include "./standard_composer.hpp"

#include "../../transcript/manifest.hpp"

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
        features |= static_cast<size_t>(Features::BOOL_SELECTORS);
        is_bool.push_back(false);
    };
    BoolComposer(BoolComposer &&other) = default;
    BoolComposer& operator=(BoolComposer &&other) = default;
    ~BoolComposer() {}

    virtual std::shared_ptr<proving_key> compute_proving_key() override;
    virtual std::shared_ptr<verification_key> compute_verification_key() override;
    virtual std::shared_ptr<program_witness> compute_witness() override;
    Prover preprocess();
    Verifier create_verifier();

    uint32_t add_variable(const barretenberg::fr::field_t &in) override
    {
        is_bool.push_back(false);
        return ComposerBase::add_variable(in);
    }

    uint32_t add_public_variable(const barretenberg::fr::field_t& in)
    {
        variables.emplace_back(in);
        is_bool.push_back(false);
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
            is_bool.push_back(false);
        }
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

    static transcript::Manifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        const transcript::Manifest output =
            transcript::Manifest({ transcript::Manifest::RoundManifest({ { "circuit_size", 4, true }, { "public_input_size", 4, true } }, "init"),
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
};
}