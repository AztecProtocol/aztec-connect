#pragma once

#include "./standard_composer.hpp"

namespace waffle {
struct mimc_quadruplet {
    uint32_t x_in_idx;
    uint32_t x_cubed_idx;
    uint32_t k_idx;
    uint32_t x_out_idx;
    barretenberg::fr::field_t mimc_constant;
};

class MiMCComposer : public StandardComposer {
  public:
    MiMCComposer(const size_t size_hint = 0)
        : StandardComposer()
    {
        q_mimc_coefficient.reserve(size_hint);
        q_mimc_selector.reserve(size_hint);
        add_variable(barretenberg::fr::field_t({ { 0, 0, 0, 0 } }));
        zero_idx = 0;
        features |= static_cast<size_t>(Features::MIMC_SELECTORS);
    };
    MiMCComposer(MiMCComposer&& other) = default;
    MiMCComposer& operator=(MiMCComposer&& other) = default;

    ~MiMCComposer() {}

    Prover preprocess() override;

    void create_add_gate(const add_triple& in) override;
    void create_mul_gate(const mul_triple& in) override;
    void create_bool_gate(const uint32_t a) override;
    void create_poly_gate(const poly_triple& in) override;
    void create_mimc_gate(const mimc_quadruplet& in);
    void create_noop_gate();
    void create_dummy_gates();
    size_t get_num_constant_gates() const override { return StandardComposer::get_num_constant_gates(); }

    std::vector<barretenberg::fr::field_t> q_mimc_coefficient;
    std::vector<barretenberg::fr::field_t> q_mimc_selector;

    uint32_t current_output_wire = static_cast<uint32_t>(-1);
    uint32_t zero_idx;

    static transcript::ProgramManifest create_manifest(const size_t num_public_inputs = 0)
    {
        // add public inputs....
        constexpr size_t g1_size = 64;
        constexpr size_t fr_size = 32;
        const size_t public_input_size = fr_size * num_public_inputs;
        static const transcript::ProgramManifest output = transcript::ProgramManifest(
            { transcript::ProgramManifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
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
                                                           { "w_3_omega", fr_size, false },
                                                           { "z_omega", fr_size, false },
                                                           { "sigma_1", fr_size, false },
                                                           { "sigma_2", fr_size, false },
                                                           { "r", fr_size, false },
                                                           { "q_mimc_coefficient", fr_size, false },
                                                           { "t", fr_size, true } },
                                                         "nu"),
              transcript::ProgramManifest::RoundManifest(
                  { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
        return output;
    }
};
} // namespace waffle
