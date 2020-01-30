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
        q_1.reserve(size_hint);
        q_2.reserve(size_hint);
        q_3.reserve(size_hint);
        q_c.reserve(size_hint);
        zero_idx = add_variable(barretenberg::fr::field_t({{0,0,0,0}}));
    };
    StandardComposer(StandardComposer &&other) = default;
    StandardComposer& operator=(StandardComposer &&other) = default;
    ~StandardComposer() {}

    virtual std::shared_ptr<proving_key> compute_proving_key() override;
    virtual std::shared_ptr<verification_key> compute_verification_key() override;
    virtual std::shared_ptr<program_witness> compute_witness() override;
    Prover preprocess();

    void create_add_gate(const add_triple &in) override;
    void create_mul_gate(const mul_triple &in) override;
    void create_bool_gate(const uint32_t a) override;
    void create_poly_gate(const poly_triple &in) override;
    void create_dummy_gates();
    size_t get_num_constant_gates() const override { return 0; }

    uint32_t zero_idx;

    std::vector<barretenberg::fr::field_t> q_m;
    std::vector<barretenberg::fr::field_t> q_1;
    std::vector<barretenberg::fr::field_t> q_2;
    std::vector<barretenberg::fr::field_t> q_3;
    std::vector<barretenberg::fr::field_t> q_c;

    static transcript::Manifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        static const transcript::Manifest output =
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
