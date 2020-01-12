#pragma once

#include <string>
#include <vector>

namespace waffle
{
namespace transcript
{
class ProgramManifest
{
  public:
    struct ManifestEntry
    {
        std::string name;
        size_t num_bytes;
        bool derived_by_verifier;
    };
    struct RoundManifest
    {
        RoundManifest(std::initializer_list<ManifestEntry> element_names, const std::string challenge_name)
            : elements(element_names), challenge(challenge_name){};

        bool includes_element(const std::string& element_name)
        {
            for (auto ele : elements)
            {
                if (element_name == ele.name)
                {
                    return true;
                }
            }
            return false;
        }

        std::vector<ManifestEntry> elements;
        std::string challenge;
    };
    ProgramManifest(std::initializer_list<RoundManifest> _round_manifests)
        : round_manifests(_round_manifests), num_rounds(round_manifests.size()){};

    size_t get_num_rounds() const
    {
        return num_rounds;
    }

    RoundManifest get_round_manifest(const size_t idx) const
    {
        return round_manifests[idx];
    }

  private:
    std::vector<RoundManifest> round_manifests;
    size_t num_rounds;
};



inline ProgramManifest BoolManifest(const size_t num_public_inputs = 0)
{
    // add public inputs....
    constexpr size_t g1_size = 64;
    constexpr size_t fr_size = 32;
    const size_t public_input_size = fr_size * num_public_inputs;
    static const ProgramManifest output =
        ProgramManifest({ ProgramManifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
                          ProgramManifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                           { "W_1", g1_size, false },
                                                           { "W_2", g1_size, false },
                                                           { "W_3", g1_size, false } },
                                                         "beta"),
                          ProgramManifest::RoundManifest({ {} }, "gamma"),
                          ProgramManifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
                          ProgramManifest::RoundManifest(
                              { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
                          ProgramManifest::RoundManifest({ { "w_1", fr_size, false },
                                                           { "w_2", fr_size, false },
                                                           { "w_3", fr_size, false },
                                                           { "z_omega", fr_size, false },
                                                           { "sigma_1", fr_size, false },
                                                           { "sigma_2", fr_size, false },
                                                           { "r", fr_size, false },
                                                           { "t", fr_size, true } },
                                                         "nu"),
                          ProgramManifest::RoundManifest(
                              { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
    return output;
}

inline ProgramManifest ExtendedManifest(const size_t num_public_inputs = 0)
{
    // add public inputs....
    constexpr size_t g1_size = 64;
    constexpr size_t fr_size = 32;
    const size_t public_input_size = fr_size * num_public_inputs;
    static const ProgramManifest output =
        ProgramManifest({ ProgramManifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
                          ProgramManifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                           { "W_1", g1_size, false },
                                                           { "W_2", g1_size, false },
                                                           { "W_3", g1_size, false } },
                                                         "beta"),
                          ProgramManifest::RoundManifest({ {} }, "gamma"),
                          ProgramManifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
                          ProgramManifest::RoundManifest(
                              { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
                          ProgramManifest::RoundManifest({ { "w_1", fr_size, false },
                                                           { "w_2", fr_size, false },
                                                           { "w_3", fr_size, false },
                                                           { "w_3_omega", fr_size, false },
                                                           { "z_omega", fr_size, false },
                                                           { "sigma_1", fr_size, false },
                                                           { "sigma_2", fr_size, false },
                                                           { "r", fr_size, false },
                                                           { "t", fr_size, true } },
                                                         "nu"),
                          ProgramManifest::RoundManifest(
                              { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
    return output;
}

inline ProgramManifest MiMCManifest(const size_t num_public_inputs = 0)
{
    // add public inputs....
    constexpr size_t g1_size = 64;
    constexpr size_t fr_size = 32;
    const size_t public_input_size = fr_size * num_public_inputs;
    static const ProgramManifest output =
        ProgramManifest({ ProgramManifest::RoundManifest({ { "circuit_size", 4, false } }, "init"),
                          ProgramManifest::RoundManifest({ { "public_inputs", public_input_size, false },
                                                           { "W_1", g1_size, false },
                                                           { "W_2", g1_size, false },
                                                           { "W_3", g1_size, false } },
                                                         "beta"),
                          ProgramManifest::RoundManifest({ {} }, "gamma"),
                          ProgramManifest::RoundManifest({ { "Z", g1_size, false } }, "alpha"),
                          ProgramManifest::RoundManifest(
                              { { "T_1", g1_size, false }, { "T_2", g1_size, false }, { "T_3", g1_size, false } }, "z"),
                          ProgramManifest::RoundManifest({ { "w_1", fr_size, false },
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
                          ProgramManifest::RoundManifest(
                              { { "PI_Z", g1_size, false }, { "PI_Z_OMEGA", g1_size, false } }, "separator") });
    return output;
}
} // namespace transcript
} // namespace waffle