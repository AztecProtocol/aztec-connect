#pragma once

#include "../../../types.hpp"

#include "../../reference_string/reference_string.hpp"
#include "../../waffle_types.hpp"

#include "../widgets/base_widget.hpp"

#include "../../../transcript/manifest.hpp"
#include "../../../transcript/transcript.hpp"
namespace waffle
{
template <typename program_settings>
class VerifierBase
{
  public:
    VerifierBase(const size_t subgroup_size = 0, const transcript::Manifest &manifest = transcript::Manifest({}), bool has_fourth_wire = false);
    VerifierBase(VerifierBase&& other);
    VerifierBase(const VerifierBase& other) = delete;
    VerifierBase& operator=(const VerifierBase& other) = delete;
    VerifierBase& operator=(VerifierBase&& other);

    bool verify_proof(const waffle::plonk_proof& proof);

    ReferenceString reference_string;

    std::array<barretenberg::g1::affine_element, 3 /*TODO REPLACE*/> SIGMA;

    std::vector<std::unique_ptr<VerifierBaseWidget>> verifier_widgets;
    size_t n;

    transcript::Manifest manifest;

    bool __DEBUG_HAS_FOURTH_WIRE;
};

typedef VerifierBase<standard_settings> Verifier;
typedef VerifierBase<extended_settings> ExtendedVerifier;
typedef VerifierBase<turbo_settings> TurboVerifier;

} // namespace waffle

#include "./verifier.tcc"
