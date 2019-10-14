#ifndef PERMUTATION
#define PERMUTATION

#include "stdint.h"
#include "stdlib.h"

#include "../types.hpp"
#include "../fields/fr.hpp"
#include "../polynomials/polynomial.hpp"

namespace waffle
{
using namespace barretenberg;


inline void compute_permutation_lagrange_base_single(polynomial &output, const std::vector<uint32_t> &permutation, const evaluation_domain& small_domain)
{
    if (output.get_size() < permutation.size())
    {
        output.resize_unsafe(permutation.size());
    }
    fr::field_t k1 = fr::multiplicative_generator();
    fr::field_t k2 = fr::alternate_multiplicative_generator();

    // permutation encoding:
    // low 28 bits defines the location in witness polynomial
    // upper 2 bits defines the witness polynomial:
    // 0 = left
    // 1 = right
    // 2 = output
    const uint32_t mask = (1U << 29) - 1;
    const fr::field_t *roots = small_domain.get_round_roots()[small_domain.log2_size - 2];
    ITERATE_OVER_DOMAIN_START(small_domain);
        const size_t raw_idx = (size_t)(permutation[i]) & (size_t)(mask);
        const bool negative_idx = raw_idx >= (small_domain.size >> 1UL);
        const size_t idx = negative_idx ? raw_idx - (small_domain.size >> 1UL): raw_idx;
        fr::__conditionally_subtract_double_modulus(roots[idx], output.at(i), static_cast<uint64_t>(negative_idx));

        if (((permutation[i] >> 30U) & 1) == 1)
        {
            fr::__mul(output.at(i), k1, output.at(i));
        }
        else if (((permutation[i] >> 31U) & 1) == 1)
        {
            fr::__mul(output.at(i), k2, output.at(i));
        }
    ITERATE_OVER_DOMAIN_END;
}
}

#endif