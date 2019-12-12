#pragma once

#include <cstddef>

#include "../../curves/bn254/g1.hpp"
#include "../../curves/bn254/g2.hpp"
#include "../../curves/bn254/pairing.hpp"

namespace waffle
{
class ReferenceString
{
public:

    ReferenceString();
    ReferenceString(const size_t num_points);
    ReferenceString(const ReferenceString &other);
    ReferenceString(ReferenceString &&other);

    ReferenceString & operator=(const ReferenceString& other);
    ReferenceString & operator=(ReferenceString &&other);

    ~ReferenceString();

    ReferenceString get_verifier_reference_string() const;

    barretenberg::g1::affine_element *monomials;
    barretenberg::g2::affine_element g2_x;

    barretenberg::pairing::miller_lines *precomputed_g2_lines;

    size_t degree;
};
}
