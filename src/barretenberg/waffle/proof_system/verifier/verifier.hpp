#ifndef VERIFIER_HPP
#define VERIFIER_HPP

#include "../../waffle_types.hpp"
#include "../../../types.hpp"
#include "../widgets/base_widget.hpp"
#include "../../../groups/scalar_multiplication.hpp"
#include "../../reference_string/reference_string.hpp"

namespace waffle
{
class Verifier
{
public:
    Verifier(const size_t subgroup_size = 0);
    Verifier(Verifier &&other);
    Verifier(const Verifier &other) = delete;
    Verifier& operator=(const Verifier &other) = delete;
    Verifier& operator=(Verifier &&other);

    bool verify_proof(const plonk_proof &proof);

    ReferenceString reference_string;

    barretenberg::g1::affine_element SIGMA_1;
    barretenberg::g1::affine_element SIGMA_2;
    barretenberg::g1::affine_element SIGMA_3;
    std::vector<std::unique_ptr<VerifierBaseWidget> > verifier_widgets;
    size_t n;
};

} // namespace waffle

#endif