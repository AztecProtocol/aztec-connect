#ifndef PERMUTATION
#define PERMUTATION

#include "stdint.h"
#include "stdlib.h"

#include "../types.hpp"
#include "../fields/fr.hpp"
#include "../polynomials/polynomials.hpp"

namespace waffle
{
using namespace barretenberg;

inline void compute_permutation_lagrange_base(const fr::field_t* roots, fr::field_t* output, const uint32_t* permutation, const polynomials::evaluation_domain& domain)
{
    fr::field_t gen = fr::multiplicative_generator();
    fr::field_t seven = fr::multiplicative_generator(); // TODO: hardcode a constant for 7 :/
    fr::add(seven, fr::one(), seven);
    fr::add(seven, fr::one(), seven);

    // permutation encoding:
    // low 28 bits defines the location in witness polynomial
    // upper 2 bits defines the witness polynomial:
    // 0 = left
    // 1 = right
    // 2 = output
    const uint32_t mask = (1U << 29) - 1;
    ITERATE_OVER_DOMAIN_START(domain);
        const size_t idx = (size_t)(permutation[i]) & (size_t)(mask);
        fr::copy(roots[idx], output[i]);
        if (((permutation[i] >> 30U) & 1) == 1)
        {
            fr::mul(output[i], gen, output[i]);
        }
        else if (((permutation[i] >> 31U) & 1) == 1)
        {
            fr::mul(output[i], seven, output[i]);
        }
    ITERATE_OVER_DOMAIN_END;
}

inline void convert_permutations_into_lagrange_base_form(circuit_state& state)
{
    fr::field_t* roots = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * state.small_domain.size);
    fr::copy(fr::one(), roots[0]);
    for (size_t i = 1; i < state.small_domain.size; ++i)
    {
        fr::mul(roots[i-1], state.small_domain.root, roots[i]);
    }

    compute_permutation_lagrange_base(roots, state.sigma_1, state.sigma_1_mapping, state.small_domain);
    compute_permutation_lagrange_base(roots, state.sigma_2, state.sigma_2_mapping, state.small_domain);
    compute_permutation_lagrange_base(roots, state.sigma_3, state.sigma_3_mapping, state.small_domain);
    free(roots);
}
}

#endif