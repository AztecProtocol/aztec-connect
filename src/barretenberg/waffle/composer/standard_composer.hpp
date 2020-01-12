#pragma once

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
    StandardComposer(StandardComposer &&other) = default;
    StandardComposer& operator=(StandardComposer &&other) = default;
    ~StandardComposer() {}

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
