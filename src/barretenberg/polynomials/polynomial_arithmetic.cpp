#include "./polynomial_arithmetic.hpp"

#include "../curves/bn254/fr.hpp"

#include <math.h>
#include <memory.h>

namespace barretenberg
{
namespace polynomial_arithmetic
{
namespace
{
    static fr::field_t* working_memory = nullptr;
    static size_t current_size = 0;

    const auto init = []()
    {
        constexpr size_t max_num_elements = (1 << 20);
        working_memory = (fr::field_t*)(aligned_alloc(64, max_num_elements * 4 * sizeof(fr::field_t)));
        memset(working_memory, 1, max_num_elements * 4 * sizeof(fr::field_t));
        current_size = (max_num_elements * 4);
        return 1;
    }();

    fr::field_t* get_scratch_space(const size_t num_elements)
    {
        if (num_elements > current_size)
        {
            free(working_memory);
            working_memory = (fr::field_t*)(aligned_alloc(64, num_elements * sizeof(fr::field_t)));
            current_size = num_elements;
        }
        return working_memory;
    }

}
// namespace
// {
inline uint32_t reverse_bits(uint32_t x, uint32_t bit_length)
{
    x = (((x & 0xaaaaaaaa) >> 1) | ((x & 0x55555555) << 1));
    x = (((x & 0xcccccccc) >> 2) | ((x & 0x33333333) << 2));
    x = (((x & 0xf0f0f0f0) >> 4) | ((x & 0x0f0f0f0f) << 4));
    x = (((x & 0xff00ff00) >> 8) | ((x & 0x00ff00ff) << 8));
    return (((x >> 16) | (x << 16))) >> (32 - bit_length);
}

void copy_polynomial(fr::field_t* src, fr::field_t* dest, size_t num_src_coefficients, size_t num_target_coefficients)
{
    // TODO: fiddle around with avx asm to see if we can speed up
    memcpy((void*)dest, (void*)src, num_src_coefficients * sizeof(fr::field_t));

    if (num_target_coefficients > num_src_coefficients)
    {
        // fill out the polynomial coefficients with zeroes
        memset((void*)(dest + num_src_coefficients),
               0,
               (num_target_coefficients - num_src_coefficients) * sizeof(fr::field_t));
    }
}

void fft_inner_serial(fr::field_t* coeffs, const size_t domain_size, const std::vector<fr::field_t*>& root_table)
{
    fr::field_t temp;
    size_t log2_size = (size_t)log2(domain_size);
    // efficiently separate odd and even indices - (An introduction to algorithms, section 30.3)

    for (size_t i = 0; i <= domain_size; ++i)
    {
        uint32_t swap_index = (uint32_t)reverse_bits((uint32_t)i, (uint32_t)log2_size);
        // TODO: should probably use CMOV here insead of an if statement
        if (i < swap_index)
        {
            fr::__swap(coeffs[i], coeffs[swap_index]);
        }
    }

    // For butterfly operations, we use lazy reduction techniques.
    // Modulus is 254 bits, so we can 'overload' a field element by 4x and still fit it in 4 machine words.
    // We can validate that field elements are <2p and not risk overflowing. Means we can cut
    // two modular reductions from the main loop

    // perform first butterfly iteration explicitly: x0 = x0 + x1, x1 = x0 - x1
    for (size_t k = 0; k < domain_size; k += 2)
    {
        fr::__copy(coeffs[k + 1], temp);
        fr::__sub_with_coarse_reduction(coeffs[k], coeffs[k + 1], coeffs[k + 1]);
        fr::__add_with_coarse_reduction(temp, coeffs[k], coeffs[k]);
    }

    for (size_t m = 2; m < domain_size; m *= 2)
    {
        const size_t i = (size_t)log2(m);
        for (size_t k = 0; k < domain_size; k += (2 * m))
        {
            for (size_t j = 0; j < m; ++j)
            {
                fr::__mul_with_coarse_reduction(root_table[i - 1][j], coeffs[k + j + m], temp);
                fr::__sub_with_coarse_reduction(coeffs[k + j], temp, coeffs[k + j + m]);
                fr::__add_with_coarse_reduction(coeffs[k + j], temp, coeffs[k + j]);
            }
        }
    }
}

void scale_by_generator(fr::field_t* coeffs,
                        const evaluation_domain& domain,
                        const fr::field_t& generator_start,
                        const fr::field_t& generator_shift)
{
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < domain.num_threads; ++j)
    {
        fr::field_t work_generator;
        fr::field_t thread_shift;
        fr::__pow_small(generator_shift, j * domain.thread_size, thread_shift);
        fr::__mul_with_coarse_reduction(generator_start, thread_shift, work_generator);
        size_t offset = j * domain.thread_size;
        for (size_t i = offset; i < offset + domain.thread_size; ++i)
        {
            fr::__mul(coeffs[i], work_generator, coeffs[i]);
            fr::__mul_with_coarse_reduction(work_generator, generator_shift, work_generator);
        }
    }
}

void compute_multiplicative_subgroup(const size_t log2_subgroup_size,
                                     const evaluation_domain& src_domain,
                                     fr::field_t* subgroup_roots)
{
    size_t subgroup_size = 1UL << log2_subgroup_size;
    // Step 1: get primitive 4th root of unity
    fr::field_t subgroup_root;
    fr::__get_root_of_unity(log2_subgroup_size, subgroup_root);

    // Step 2: compute the cofactor term g^n
    fr::field_t accumulator;
    fr::__copy(fr::multiplicative_generator, accumulator);
    for (size_t i = 0; i < src_domain.log2_size; ++i)
    {
        fr::__sqr(accumulator, accumulator);
    }

    // Step 3: fill array with 4 values of (g.X)^n - 1, scaled by the cofactor
    fr::__copy(accumulator, subgroup_roots[0]); // subgroup_root, accumulator, subgroup_roots[1]);
    for (size_t i = 1; i < subgroup_size; ++i)
    {
        fr::__mul(subgroup_roots[i - 1], subgroup_root, subgroup_roots[i]);
    }
}

void fft_inner_parallel(fr::field_t* coeffs,
                        const evaluation_domain& domain,
                        const fr::field_t&,
                        const std::vector<fr::field_t*>& root_table)
{
  // hmm  // fr::field_t* scratch_space = (fr::field_t*)aligned_alloc(64, sizeof(fr::field_t) * domain.size);
    fr::field_t* scratch_space = get_scratch_space(domain.size);
#ifndef NO_MULTITHREADING
#pragma omp parallel
#endif
    {
// Step 1: perform bit-reverseal, so fft evaluations are 'in order'
// TODO: remove this part! Will need a refactor of prover.hpp
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t j = 0; j < domain.num_threads; ++j)
        {
            for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); ++i)
            {
                uint32_t next_index = (uint32_t)reverse_bits((uint32_t)i + 1, (uint32_t)domain.log2_size);
                __builtin_prefetch(&coeffs[next_index]);
                // in order to parallelize this part, we want to make sure that we're writing to memory in a sequential
                // manner so that we don't try to write the same cache line from two different threads (reading is
                // fine). We do a straight copy instead of a swap, so that there's no inter-thread communication
                uint32_t swap_index = (uint32_t)reverse_bits((uint32_t)i, (uint32_t)domain.log2_size);
                fr::__copy(coeffs[swap_index], scratch_space[i]);
            }
        }

// First FFT round is a special case - no need to multiply by root table, because all entries are 1
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
        for (size_t j = 0; j < domain.num_threads; ++j)
        {
            fr::field_t temp;
            for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); i += 2)
            {
                fr::__copy(scratch_space[i + 1], temp);
                fr::__sub_with_coarse_reduction(scratch_space[i], scratch_space[i + 1], scratch_space[i + 1]);
                fr::__add_with_coarse_reduction(temp, scratch_space[i], scratch_space[i]);
            }
        }

        // hard code exception for when the domain size is tiny - we won't execute the next loop, so need to manually
        // reduce + copy
        if (domain.size <= 2)
        {
            fr::reduce_once(scratch_space[0], coeffs[0]);
            fr::reduce_once(scratch_space[1], coeffs[1]);
        }

        // outer FFT loop
        for (size_t m = 2; m < (domain.size); m <<= 1)
        {
#ifndef NO_MULTITHREADING
#pragma omp for
#endif
            for (size_t j = 0; j < domain.num_threads; ++j)
            {
                fr::field_t temp;

                // Ok! So, what's going on here? This is the inner loop of the FFT algorithm, and we want to break it
                // out into multiple independent threads. For `num_threads`, each thread will evaluation `domain.size /
                // num_threads` of the polynomial. The actual iteration length will be half of this, because we leverage
                // the fact that \omega^{n/2} = -\omega (where \omega is a root of unity)

                // Here, `start` and `end` are used as our iterator limits, so that we can use our iterator `i` to
                // directly access the roots of unity lookup table
                const size_t start = j * (domain.thread_size >> 1);
                const size_t end = (j + 1) * (domain.thread_size >> 1);

                // For all but the last round of our FFT, the roots of unity that we need, will be a subset of our
                // lookup table. e.g. for a size 2^n FFT, the 2^n'th roots create a multiplicative subgroup of order 2^n
                //      the 1st round will use the roots from the multiplicative subgroup of order 2 : the 2'th roots of
                //      unity the 2nd round will use the roots from the multiplicative subgroup of order 4 : the 4'th
                //      roots of unity
                // i.e. each successive FFT round will double the set of roots that we need to index.
                // We have already laid out the `root_table` container so that each FFT round's roots are linearly
                // ordered in memory. For all FFT rounds, the number of elements we're iterating over is greater than
                // the size of our lookup table. We need to access this table in a cyclical fasion - i.e. for a subgroup
                // of size x, the first x iterations will index the subgroup elements in order, then for the next x
                // iterations, we loop back to the start.

                // We could implement the algorithm by having 2 nested loops (where the inner loop iterates over the
                // root table), but we want to flatten this out - as for the first few rounds, the inner loop will be
                // tiny and we'll have quite a bit of unneccesary branch checks For each iteration of our flattened
                // loop, indexed by `i`, the element of the root table we need to access will be `i % (current round
                // subgroup size)` Given that each round subgroup size is `m`, which is a power of 2, we can index the
                // root table with a very cheap `i & (m - 1)` Which is why we have this odd `block_mask` variable
                const size_t block_mask = m - 1;

                // The next problem to tackle, is we now need to efficiently index the polynomial element in
                // `scratch_space` in our flattened loop If we used nested loops, the outer loop (e.g. `y`) iterates
                // from 0 to 'domain size', in steps of 2 * m, with the inner loop (e.g. `z`) iterating from 0 to m. We
                // have our inner loop indexer with `i & (m - 1)`. We need to add to this our outer loop indexer, which
                // is equivalent to taking our indexer `i`, masking out the bits used in the 'inner loop', and doubling
                // the result. i.e. polynomial indexer = (i & (m - 1)) + ((i & ~(m - 1)) >> 1) To simplify this, we
                // cache index_mask = ~block_mask, meaning that our indexer is just `((i & index_mask) << 1 + (i &
                // block_mask)`
                const size_t index_mask = ~block_mask;

                // `round_roots` fetches the pointer to this round's lookup table. We use `log2(m) - 1` as our indexer,
                // because we don't store the precomputed root values for the 1st round (because they're all 1).
                const fr::field_t* round_roots = root_table[static_cast<size_t>(log2(m)) - 1];

                // Finally, we want to treat the final round differently from the others,
                // so that we can reduce out of our 'coarse' reduction and store the output in `coeffs` instead of
                // `scratch_space`
                if (m != (domain.size >> 1))
                {
                    for (size_t i = start; i < end; ++i)
                    {
                        size_t k1 = (i & index_mask) << 1;
                        size_t j1 = i & block_mask;
                        fr::__mul_with_coarse_reduction(round_roots[j1], scratch_space[k1 + j1 + m], temp);
                        fr::__sub_with_coarse_reduction(scratch_space[k1 + j1], temp, scratch_space[k1 + j1 + m]);
                        fr::__add_with_coarse_reduction(scratch_space[k1 + j1], temp, scratch_space[k1 + j1]);
                    }
                }
                else
                {
                    for (size_t i = start; i < end; ++i)
                    {
                        size_t k1 = (i & index_mask) << 1;
                        size_t j1 = i & block_mask;
                        fr::__mul_with_coarse_reduction(round_roots[j1], scratch_space[k1 + j1 + m], temp);
                        fr::__sub_with_coarse_reduction(scratch_space[k1 + j1], temp, scratch_space[k1 + j1 + m]);
                        fr::reduce_once(scratch_space[k1 + j1 + m], coeffs[k1 + j1 + m]);
                        fr::__add_with_coarse_reduction(scratch_space[k1 + j1], temp, scratch_space[k1 + j1]);
                        fr::reduce_once(scratch_space[k1 + j1], coeffs[k1 + j1]);
                    }
                }
            }
        }
    }
}

void fft(fr::field_t* coeffs, const evaluation_domain& domain)
{
    fft_inner_parallel(coeffs, domain, domain.root, domain.get_round_roots());
}

void ifft(fr::field_t* coeffs, const evaluation_domain& domain)
{
    fft_inner_parallel(coeffs, domain, domain.root_inverse, domain.get_inverse_round_roots());
    ITERATE_OVER_DOMAIN_START(domain);
    fr::__mul(coeffs[i], domain.domain_inverse, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void fft_with_constant(fr::field_t* coeffs, const evaluation_domain& domain, const fr::field_t& value)
{
    fft_inner_parallel(coeffs, domain, domain.root, domain.get_round_roots());
    ITERATE_OVER_DOMAIN_START(domain);
    fr::__mul(coeffs[i], value, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void coset_fft(fr::field_t* coeffs, const evaluation_domain& domain)
{
    scale_by_generator(coeffs, domain, fr::one, fr::multiplicative_generator);
    fft(coeffs, domain);
}

void coset_fft_with_constant(fr::field_t* coeffs, const evaluation_domain& domain, const fr::field_t& constant)
{
    fr::field_t start = fr::one;
    fr::__mul(start, constant, start);
    scale_by_generator(coeffs, domain, start, fr::multiplicative_generator);
    fft(coeffs, domain);
}

void ifft_with_constant(fr::field_t* coeffs, const evaluation_domain& domain, const fr::field_t& value)
{
    fft_inner_parallel(coeffs, domain, domain.root_inverse, domain.get_inverse_round_roots());
    fr::field_t T0;
    fr::__mul(domain.domain_inverse, value, T0);
    ITERATE_OVER_DOMAIN_START(domain);
    fr::__mul(coeffs[i], T0, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void coset_ifft(fr::field_t* coeffs, const evaluation_domain& domain)
{
    ifft(coeffs, domain);
    scale_by_generator(coeffs, domain, fr::one, fr::multiplicative_generator_inverse);
}

void add(const fr::field_t* a_coeffs,
         const fr::field_t* b_coeffs,
         fr::field_t* r_coeffs,
         const evaluation_domain& domain)
{
    ITERATE_OVER_DOMAIN_START(domain);
    fr::__add(a_coeffs[i], b_coeffs[i], r_coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void mul(const fr::field_t* a_coeffs,
         const fr::field_t* b_coeffs,
         fr::field_t* r_coeffs,
         const evaluation_domain& domain)
{
    ITERATE_OVER_DOMAIN_START(domain);
    fr::__mul(a_coeffs[i], b_coeffs[i], r_coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

fr::field_t evaluate(const fr::field_t* coeffs, const fr::field_t& z, const size_t n)
{
#ifndef NO_MULTITHREADING
    size_t num_threads = (size_t)omp_get_max_threads();
#else
    size_t num_threads = 1;
#endif
    size_t range_per_thread = n / num_threads;
    size_t leftovers = n - (range_per_thread * num_threads);
    fr::field_t* evaluations = new fr::field_t[num_threads];
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < num_threads; ++j)
    {
        fr::field_t z_acc;
        fr::field_t work_var;
        fr::__pow_small(z, j * range_per_thread, z_acc);
        size_t offset = j * range_per_thread;
        evaluations[j] = fr::zero;
        size_t end = (j == num_threads - 1) ? offset + range_per_thread + leftovers : offset + range_per_thread;
        for (size_t i = offset; i < end; ++i)
        {
            fr::__mul(coeffs[i], z_acc, work_var);
            fr::__add(evaluations[j], work_var, evaluations[j]);
            fr::__mul_with_coarse_reduction(z_acc, z, z_acc);
        }
    }

    fr::field_t r = fr::zero;
    for (size_t j = 0; j < num_threads; ++j)
    {
        fr::__add(r, evaluations[j], r);
    }
    delete[] evaluations;
    return r;
}

// For L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
// Compute the 2n-fft of L_1(X)
// We can use this to compute the 2n-fft evaluations of any L_i(X).
// We can consider `l_1_coefficients` to be a 2n-sized vector of the evaluations of L_1(X),
// for all X = 2n'th roots of unity.
// To compute the vector for the 2n-fft transform of L_i(X), we perform a (2i)-left-shift of this vector
void compute_lagrange_polynomial_fft(fr::field_t* l_1_coefficients,
                                     const evaluation_domain& src_domain,
                                     const evaluation_domain& target_domain)
{
    // L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
    // when evaluated at the 2n'th roots of unity, the term X^{n} forms a subgroup of order 2
    // w = n'th root of unity
    // w' = 2n'th root of unity = w^{1/2}
    // for even powers of w', X^{n} = w^{2in/2} = 1
    // for odd powers of w', X = w^{i}w^{n/2} -> X^{n} = w^{in}w^{n/2} = -w

    // We also want to compute fft using subgroup union a coset (the multiplicative generator g), so we're not dividing
    // by zero

    // Step 1: compute the denominator for each evaluation: 1 / (X.g - 1)
    // fr::field_t work_root;
    fr::field_t one = fr::one;
    fr::field_t multiplicand;
    fr::__copy(target_domain.root, multiplicand);

#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < target_domain.num_threads; ++j)
    {
        fr::field_t work_root;
        fr::field_t root_shift;
        fr::__pow_small(multiplicand, j * target_domain.thread_size, root_shift);
        fr::__mul(fr::multiplicative_generator, root_shift, work_root);
        size_t offset = j * target_domain.thread_size;
        for (size_t i = offset; i < offset + target_domain.thread_size; ++i)
        {
            fr::__sub(work_root, one, l_1_coefficients[i]);
            fr::__mul_with_coarse_reduction(work_root, multiplicand, work_root);
        }
    }

    // use Montgomery's trick to invert all of these at once
    fr::batch_invert(l_1_coefficients, target_domain.size);

    // next: compute numerator multiplicand: w'^{n}.g^n
    // Here, w' is the primitive 2n'th root of unity
    // and w is the primitive n'th root of unity
    // i.e. w' = w^{1/2}
    // The polynomial X^n, when evaluated at all 2n'th roots of unity, forms a subgroup of order 2.
    // For even powers of w', X^n = w'^{2in} = w^{in} = 1
    // For odd powers of w', X^n = w'^{1 + 2in} = w^{n/2}w^{in} = w^{n/2} = -1

    // The numerator term, therefore, can only take two values
    // For even indices: (X^{n} - 1)/n = (g^n - 1)/n
    // For odd indices: (X^{n} - 1)/n = (-g^n - 1)/n

    size_t log2_subgroup_size = target_domain.log2_size - src_domain.log2_size;
    size_t subgroup_size = 1UL << log2_subgroup_size;
    ASSERT(target_domain.log2_size >= src_domain.log2_size);

    fr::field_t* subgroup_roots = new fr::field_t[subgroup_size];
    compute_multiplicative_subgroup(log2_subgroup_size, src_domain, &subgroup_roots[0]);

    // Each element of `subgroup_roots[i]` contains some root wi^n
    // want to compute (1/n)(wi^n - 1)
    for (size_t i = 0; i < subgroup_size; ++i)
    {
        fr::__sub(subgroup_roots[i], fr::one, subgroup_roots[i]);
        fr::__mul(subgroup_roots[i], src_domain.domain_inverse, subgroup_roots[i]);
    }
    // TODO: this is disgusting! Fix it fix it fix it fix it...
    if (subgroup_size >= target_domain.thread_size)
    {
        for (size_t i = 0; i < target_domain.size; i += subgroup_size)
        {
            for (size_t j = 0; j < subgroup_size; ++j)
            {
                fr::__mul(l_1_coefficients[i + j], subgroup_roots[j], l_1_coefficients[i + j]);
            }
        }
    }
    else
    {
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
        for (size_t k = 0; k < target_domain.num_threads; ++k)
        {
            size_t offset = k * target_domain.thread_size;
            for (size_t i = offset; i < offset + target_domain.thread_size; i += subgroup_size)
            {
                for (size_t j = 0; j < subgroup_size; ++j)
                {
                    fr::__mul(l_1_coefficients[i + j], subgroup_roots[j], l_1_coefficients[i + j]);
                }
            }
        }
    }
    delete[] subgroup_roots;
}

void divide_by_pseudo_vanishing_polynomial(fr::field_t* coeffs,
                                           const evaluation_domain& src_domain,
                                           const evaluation_domain& target_domain)
{
    // the PLONK divisor polynomial is equal to the vanishing polynomial divided by the vanishing polynomial for the
    // last subgroup element Z_H(X) = \prod_{i=1}^{n-1}(X - w^i) = (X^n - 1) / (X - w^{n-1}) i.e. we divide by vanishing
    // polynomial, then multiply by degree-1 polynomial (X - w^{n-1})

    // `coeffs` should be in point-evaluation form, evaluated at the 4n'th roots of unity
    // P(X) = X^n - 1 will form a subgroup of order 4 when evaluated at these points
    // If X = w^i, P(X) = 1
    // If X = w^{i + j/4}, P(X) = w^{n/4} = w^{n/2}^{n/2} = sqrt(-1)
    // If X = w^{i + j/2}, P(X) = -1
    // If X = w^{i + j/2 + k/4}, P(X) = w^{n/4}.-1 = -w^{i} = -sqrt(-1)
    // i.e. the 4th roots of unity
    size_t log2_subgroup_size = target_domain.log2_size - src_domain.log2_size;
    size_t subgroup_size = 1UL << log2_subgroup_size;
    ASSERT(target_domain.log2_size >= src_domain.log2_size);

    fr::field_t* subgroup_roots = new fr::field_t[subgroup_size];
    compute_multiplicative_subgroup(log2_subgroup_size, src_domain, &subgroup_roots[0]);

    // Step 3: fill array with values of (g.X)^n - 1, scaled by the cofactor
    for (size_t i = 0; i < subgroup_size; ++i)
    {
        fr::__sub(subgroup_roots[i], fr::one, subgroup_roots[i]);
    }

    // Step 4: invert array entries to compute denominator term of 1/Z_H*(X)
    fr::batch_invert(&subgroup_roots[0], subgroup_size);

    // The numerator term of Z_H*(X) is the polynomial (X - w^{n-1})
    // => (g.w_i - w^{n-1})
    fr::field_t numerator_constant;

    // Compute w^{n-1}
    fr::__neg(src_domain.root_inverse, numerator_constant);
    // Compute first value of g.w_i

    // Step 5: iterate over point evaluations, scaling each one by the inverse of the vanishing polynomial
    if (subgroup_size >= target_domain.thread_size)
    {
        fr::field_t work_root;
        fr::__copy(fr::multiplicative_generator, work_root);
        fr::field_t T0;
        for (size_t i = 0; i < target_domain.size; i += subgroup_size)
        {
            for (size_t j = 0; j < subgroup_size; ++j)
            {
                fr::__mul(coeffs[i + j], subgroup_roots[j], coeffs[i + j]);
                fr::__add_without_reduction(work_root, numerator_constant, T0);
                fr::__mul(coeffs[i + j], T0, coeffs[i + j]);
                fr::__mul_with_coarse_reduction(work_root, target_domain.root, work_root);
            }
        }
    }
    else
    {
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
        for (size_t k = 0; k < target_domain.num_threads; ++k)
        {
            size_t offset = k * target_domain.thread_size;
            fr::field_t root_shift;
            fr::field_t work_root;
            fr::__pow_small(target_domain.root, offset, root_shift);
            fr::__mul(fr::multiplicative_generator, root_shift, work_root);
            fr::field_t T0;
            for (size_t i = offset; i < offset + target_domain.thread_size; i += subgroup_size)
            {
                for (size_t j = 0; j < subgroup_size; ++j)
                {
                    fr::__mul(coeffs[i + j], subgroup_roots[j], coeffs[i + j]);
                    fr::__add(work_root, numerator_constant, T0);
                    fr::__mul(coeffs[i + j], T0, coeffs[i + j]);
                    fr::__mul_with_coarse_reduction(work_root, target_domain.root, work_root);
                }
            }
        }
    }
    delete[] subgroup_roots;
}

fr::field_t compute_kate_opening_coefficients(const fr::field_t* src,
                                              fr::field_t* dest,
                                              const fr::field_t& z,
                                              const size_t n)
{
    // if `coeffs` represents F(X), we want to compute W(X)
    // where W(X) = F(X) - F(z) / (X - z)
    // i.e. divide by the degree-1 polynomial [-z, 1]


    fr::field_t y{{ 0x833fc48d823f272cUL, 0x2d270d45f1181294UL, 0xcf135e7506a45d63UL, 0x02UL }};
    y = fr::to_montgomery_form(y);
    fr::field_t b{{ 17, 0, 0, 0 }};
    b = fr::to_montgomery_form(b);
    b = fr::neg(b);

    // We assume that the commitment is well-formed and that there is no remainder term.
    // Under these conditions we can perform this polynomial division in linear time with good constants

    fr::field_t f = evaluate(src, z, n);
    // compute (1 / -z)
    fr::field_t divisor;
    fr::__neg(z, divisor);
    fr::__invert(divisor, divisor);

    // we're about to shove these coefficients into a pippenger multi-exponentiation routine, where we need
    // to convert out of montgomery form. So, we can use lazy reduction techniques here without triggering overflows
    fr::__sub_with_coarse_reduction(src[0], f, dest[0]);
    fr::__mul_with_coarse_reduction(dest[0], divisor, dest[0]);
    for (size_t i = 1; i < n; ++i)
    {
        fr::__sub_with_coarse_reduction(src[i], dest[i - 1], dest[i]);
        fr::__mul_with_coarse_reduction(dest[i], divisor, dest[i]);
    }

    return f;
}

// compute Z_H*(z), l_1(z), l_{n-1}(z)
barretenberg::polynomial_arithmetic::lagrange_evaluations get_lagrange_evaluations(const fr::field_t& z,
                                                                                   const evaluation_domain& domain)
{
    fr::field_t one = fr::one;
    fr::field_t z_pow;
    fr::__copy(z, z_pow);
    for (size_t i = 0; i < domain.log2_size; ++i)
    {
        fr::__sqr(z_pow, z_pow);
    }

    fr::field_t numerator;
    fr::__sub(z_pow, one, numerator);

    fr::field_t denominators[3];
    fr::__sub(z, one, denominators[1]);

    fr::__mul(z, domain.root, denominators[2]);
    fr::__mul(denominators[2], domain.root, denominators[2]);
    fr::__sub(denominators[2], one, denominators[2]);

    fr::__sub(z, domain.root_inverse, denominators[0]);

    fr::batch_invert(denominators, 3);

    barretenberg::polynomial_arithmetic::lagrange_evaluations result;
    fr::__mul(numerator, denominators[0], result.vanishing_poly);

    fr::__mul(numerator, domain.domain_inverse, numerator);
    fr::__mul(numerator, denominators[1], result.l_1);
    fr::__mul(numerator, denominators[2], result.l_n_minus_1);
    return result;
}

// Convert an fft with `current_size` point evaluations, to one with `current_size >> compress_factor` point evaluations
void compress_fft(const fr::field_t* src, fr::field_t* dest, const size_t current_size, const size_t compress_factor)
{
    // iterate from top to bottom, allows `dest` to overlap with `src`
    size_t log2_compress_factor = (size_t)log2(compress_factor);
    ASSERT(1UL << log2_compress_factor == compress_factor);
    size_t new_size = current_size >> log2_compress_factor;
    for (size_t i = 0; i < new_size; ++i)
    {
        fr::__copy(src[i << log2_compress_factor], dest[i]);
    }
}

} // namespace polynomial_arithmetic
} // namespace barretenberg
  /*
  
  void fft_inner_parallel_old(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &, const
  fr::field_t** root_table)
  {
      if (domain.size < 32)
      {
          fft_inner_serial(coeffs, domain.size, root_table);
          for (size_t i = 0; i < domain.size; ++i)
          {
              fr::reduce_once(coeffs[i], coeffs[i]);
          }
          return;
      }
      size_t log2_size = (size_t)log2(domain.size);
      // efficiently separate odd and even indices - (An introduction to algorithms, section 30.3)
  
      fr::field_t* scratch_space = (fr::field_t*)aligned_alloc(64, sizeof(fr::field_t) * domain.size);
  #ifndef NO_MULTITHREADING
  #pragma omp parallel for
  #endif
      for (size_t j = 0; j < domain.num_threads; ++j)
      {
          for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); ++i)
          {
              uint32_t swap_index = (uint32_t)reverse_bits((uint32_t)i, (uint32_t)log2_size);
              fr::__copy(coeffs[i], scratch_space[swap_index]);
          }
      }
  
  #ifndef NO_MULTITHREADING
  #pragma omp parallel for
  #endif
      for (size_t j = 0; j < domain.num_threads; ++j)
      {
          fr::field_t temp;
          for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); i += 2)
          {
              fr::__copy(scratch_space[i + 1], temp);
              fr::__sub_with_coarse_reduction(scratch_space[i], scratch_space[i + 1], scratch_space[i + 1]);
              fr::__add_with_coarse_reduction(temp, scratch_space[i], scratch_space[i]);
          }
      }
  
     // size_t end = domain.size >> 1;
      //size_t thread_end = domain.thread_size >> 1;
      size_t thread_step = domain.thread_size >> 1;
      for (size_t m = 2; m < (domain.size >> 1); m <<= 1)
      {
  #ifndef NO_MULTITHREADING
  #pragma omp parallel for
  #endif
          for (size_t q = 0; q < domain.num_threads; ++q)
          {
              const size_t i = (size_t)log2(m);
              const size_t block_mask = m - 1;
              fr::field_t temp1;
              // fr::field_t temp2;
              size_t thread_end = (q + 1) * thread_step;
              const fr::field_t* roots = root_table[i - 1];
              for (size_t z = (q * (thread_step)); z < thread_end; ++z)
              {
                  size_t k1 = z >> i << (i + 1); // (z / (m)) * (m * 2);        // k
                  size_t j1 = z & block_mask; // j
                  // if ((k + j) == m - 1 || (k + j) == m - 2)
                  // {
                  //     printf("thread %lu. k = %lu, j = %lu, k + j = %lu\n", q, k, j, k+j);
                  // }
                  // __builtin_prefetch(&scratch_space[k1 + j1 + 2]);
                  // __builtin_prefetch(&scratch_space[k1 + j1 + m + 2]);
                  fr::__mul_with_coarse_reduction(roots[j1], scratch_space[k1 + j1 + m], temp1);
                  // fr::__mul_with_coarse_reduction(roots[j1 + 1], scratch_space[k1 + j1 + m + 1], temp2);
                  fr::__sub_with_coarse_reduction(scratch_space[k1 + j1], temp1, scratch_space[k1 + j1 + m]);
                  fr::__add_with_coarse_reduction(scratch_space[k1 + j1], temp1, scratch_space[k1 + j1]);
                  // fr::__sub_with_coarse_reduction(scratch_space[k1 + j1 + 1], temp2, scratch_space[k1 + j1 + m + 1]);
                  // fr::__add_with_coarse_reduction(scratch_space[k1 + j1 + 1], temp2, scratch_space[k1 + j1 + 1]);
              }
          }
      }
  
      if (domain.size < 4) // disgusting! TODO: fix ugly exception
      {
          for (size_t i = 0; i < domain.size; ++i)
          {
              fr::reduce_once(scratch_space[i], coeffs[i]);
          }
          aligned_free(scratch_space);
          return;
      }
  
      size_t m = domain.size / 2;
  
  #ifndef NO_MULTITHREADING
  #pragma omp parallel for
  #endif
      for (size_t q = 0; q < domain.num_threads; ++q)
      {
          size_t thread_end = (q + 1) * thread_step;
          fr::field_t temp;
          const size_t i = (size_t)log2(m);
          const size_t block_mask = m - 1;
          for (size_t z = (q * (thread_step)); z < thread_end; ++z)
          {
              size_t k = z >> i << (i + 1); // (z / (m)) * (m * 2);        // k
              size_t j = z & block_mask;      // j
              // printf("thread %lu. k = %lu, j = %lu, k + j = %lu\n", q, k, j, k+j);
              fr::__mul_with_coarse_reduction(root_table[i - 1][j], scratch_space[k + j + m], temp);
              fr::__sub_with_coarse_reduction(scratch_space[k + j], temp, scratch_space[k + j + m]);
              fr::reduce_once(scratch_space[k + j + m], coeffs[k + j + m]);
              fr::__add_with_coarse_reduction(scratch_space[k + j], temp, scratch_space[k + j]);
              fr::reduce_once(scratch_space[k + j], coeffs[k + j]);
          }
      }
      aligned_free(scratch_space);
  }
  */