#ifndef PERMUTATION
#define PERMUTATION

#include "stdint.h"
#include "stdlib.h"

#include "../../types.hpp"
#include "../../fields/fr.hpp"
#include "../../polynomials/polynomial.hpp"

namespace waffle
{
inline void compute_permutation_lagrange_base_single(barretenberg::polynomial &output, const std::vector<uint32_t> &permutation, const barretenberg::evaluation_domain& small_domain)
{
    if (output.get_size() < permutation.size())
    {
        output.resize_unsafe(permutation.size());
    }
    barretenberg::fr::field_t k1 = barretenberg::fr::multiplicative_generator();
    barretenberg::fr::field_t k2 = barretenberg::fr::alternate_multiplicative_generator();

    // permutation encoding:
    // low 28 bits defines the location in witness polynomial
    // upper 2 bits defines the witness polynomial:
    // 0 = left
    // 1 = right
    // 2 = output
    const uint32_t mask = (1U << 29) - 1;
    const barretenberg::fr::field_t *roots = small_domain.get_round_roots()[small_domain.log2_size - 2];
    ITERATE_OVER_DOMAIN_START(small_domain);
        const size_t raw_idx = (size_t)(permutation[i]) & (size_t)(mask);
        const bool negative_idx = raw_idx >= (small_domain.size >> 1UL);

        // TODO see if this commented line works
        // const size_t idx = raw_idx - static_cast<size_t>(negative_idx) * (small_domain.size >> 1UL);
        const size_t idx = negative_idx ? raw_idx - (small_domain.size >> 1UL): raw_idx;
        barretenberg::fr::__conditionally_subtract_double_modulus(roots[idx], output.at(i), static_cast<uint64_t>(negative_idx));

        // TODO: try this
        /*
        switch ((permutation[i] >> 30U) & 0x3U)
        {
            case 2U:
            {
                barretenberg::fr::__mul(output.at(i), k2, output.at(i));
                break;
            }
            case 1U:
            {
                barretenberg::fr::__mul(output.at(i), k1, output.at(i));
                break;
            }
            default:
            {
                break;
            }
        }
        */
        if (((permutation[i] >> 30U) & 1) == 1)
        {
            barretenberg::fr::__mul(output.at(i), k1, output.at(i));
        }
        else if (((permutation[i] >> 31U) & 1) == 1)
        {
            barretenberg::fr::__mul(output.at(i), k2, output.at(i));
        }
    ITERATE_OVER_DOMAIN_END;
}
}

#endif