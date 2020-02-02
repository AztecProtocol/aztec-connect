#pragma once

#include <barretenberg/waffle/composer/standard_composer.hpp>
#include <barretenberg/transcript/transcript.hpp>
#include <barretenberg/transcript/manifest.hpp>

namespace test_helpers
{
inline transcript::Transcript create_dummy_standard_transcript()
{
    std::vector<uint8_t> g1_vector(64);
    std::vector<uint8_t> fr_vector(32);

    for (size_t i = 0; i < g1_vector.size(); ++i)
    {
        g1_vector[i] = 1;
    }

    for (size_t i = 0; i < fr_vector.size(); ++i)
    {
        fr_vector[i] = 1;
    }

    transcript::Transcript transcript = transcript::Transcript(waffle::StandardComposer::create_manifest(0));
    transcript.add_element("circuit_size", { 1, 2, 3, 4});
    transcript.apply_fiat_shamir("init");

    transcript.add_element("public_inputs", {});
    transcript.add_element("W_1", g1_vector);
    transcript.add_element("W_2", g1_vector);
    transcript.add_element("W_3", g1_vector);
    transcript.apply_fiat_shamir("beta");
    transcript.apply_fiat_shamir("gamma");

    transcript.add_element("Z", g1_vector);
    transcript.apply_fiat_shamir("alpha");
    return transcript;
}
}