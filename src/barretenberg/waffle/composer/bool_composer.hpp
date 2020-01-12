#pragma once 

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
    BoolComposer(BoolComposer &&other) = default;
    BoolComposer& operator=(BoolComposer &&other) = default;
    ~BoolComposer() {}

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

    static transcript::ProgramManifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        static const transcript::ProgramManifest output =
            transcript::ProgramManifest({ transcript::ProgramManifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
                            transcript::ProgramManifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                            { "W_1", g1_size, false },
                                                            { "W_2", g1_size, false },
                                                            { "W_3", g1_size, false } },
                                                            "beta"),
                            transcript::ProgramManifest::RoundManifest({ {} }, "gamma"),
                            transcript::ProgramManifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
                            transcript::ProgramManifest::RoundManifest(
                                { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
                            transcript::ProgramManifest::RoundManifest({ { "w_1", fr_size, false },
                                                            { "w_2", fr_size, false },
                                                            { "w_3", fr_size, false },
                                                            { "z_omega", fr_size, false },
                                                            { "sigma_1", fr_size, false },
                                                            { "sigma_2", fr_size, false },
                                                            { "r", fr_size, false },
                                                            { "t", fr_size, true } },
                                                            "nu"),
                            transcript::ProgramManifest::RoundManifest(
                                { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
        return output;
    }
};
}