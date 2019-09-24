#include "./polynomials.hpp"

namespace barretenberg
{
namespace polynomials
{
namespace
{
inline uint32_t reverse_bits(uint32_t x, uint32_t bit_length)
{
    x = (((x & 0xaaaaaaaa) >> 1) | ((x & 0x55555555) << 1));
    x = (((x & 0xcccccccc) >> 2) | ((x & 0x33333333) << 2));
    x = (((x & 0xf0f0f0f0) >> 4) | ((x & 0x0f0f0f0f) << 4));
    x = (((x & 0xff00ff00) >> 8) | ((x & 0x00ff00ff) << 8));
    return (((x >> 16) | (x << 16))) >> (32 - bit_length);
}

// TODO: need to compare the following:
//  1. Compute all of the roots of unity over and over again like it's groundhog day
//  2. Compute a lookup table of the roots of unity, and suffer through cache misses from nonlinear access patterns
void fft_inner_serial(fr::field_t *coeffs, const fr::field_t &root, const size_t domain_size)
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
            fr::swap(coeffs[i], coeffs[swap_index]);
        }
    }

    // For butterfly operations, we use lazy reduction techniques.
    // Modulus is 254 bits, so we can 'overload' a field element by 4x and still fit it in 4 machine words.
    // We can validate that field elements are <2p and not risk overflowing. Means we can cut
    // two modular reductions from the main loop

    // perform first butterfly iteration explicitly: x0 = x0 + x1, x1 = x0 - x1
    for (size_t k = 0; k < domain_size; k += 2)
    {
        fr::copy(coeffs[k + 1], temp);
        fr::sub_with_coarse_reduction(coeffs[k], coeffs[k + 1], coeffs[k + 1]);
        fr::add_with_coarse_reduction(temp, coeffs[k], coeffs[k]);
    }
    fr::field_t round_root;
    fr::field_t work_root;
    for (size_t m = 2; m < domain_size; m *= 2)
    {
        fr::copy(root, round_root);
        fr::pow_small(round_root, (domain_size / (2 * m)), round_root);
        for (size_t k = 0; k < domain_size; k += (2 * m))
        {
            // TODO: special case for j = 0, k = 0
            fr::one(work_root);
            for (size_t j = 0; j < m; ++j)
            {
                fr::mul_without_reduction(work_root, coeffs[k + j + m], temp);
                fr::sub_with_coarse_reduction(coeffs[k + j], temp, coeffs[k + j + m]);
                fr::add_with_coarse_reduction(coeffs[k + j], temp, coeffs[k + j]);
                fr::mul_without_reduction(work_root, round_root, work_root);
            }
        }
    }
}

void fft_inner_parallel(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &root)
{
    if (domain.num_threads >= domain.size)
    {
        fft_inner_serial(coeffs, root, domain.size);

        for (size_t i = 0; i < domain.size; ++i)
        {
            fr::reduce_once(coeffs[i], coeffs[i]);
        }
        return;
    }

    fr::field_t *thread_coeffs = (fr::field_t *)aligned_alloc(32, sizeof(fr::field_t) * domain.size);
    // TODO: do we care about core sizes that aren't powers of 2?
    // ASSERT(2 ** log2_num_threads == num_threads);

    fr::field_t thread_omega;
    fr::pow_small(root, (1UL << domain.log2_num_threads), thread_omega);

#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t i = 0; i < domain.num_threads; ++i)
    {
        fr::field_t work_root;
        fr::field_t work_step;
        fr::pow_small(root, i, work_root);
        fr::pow_small(root, (i << domain.log2_thread_size), work_step);

        fr::field_t accumulator = fr::one();
        size_t index_mask = domain.size - 1;
        size_t thread_coeffs_index = i * domain.thread_size;
        fr::field_t T0;
        fr::field_t T1;
        for (size_t j = 0; j < (1UL << domain.log2_thread_size); ++j)
        {
            fr::zero(T0);
            for (size_t k = 0; k < domain.size; k += domain.thread_size)
            {
                size_t idx = (j + k) & index_mask;
                fr::mul_without_reduction(coeffs[idx], accumulator, T1);
                fr::add_with_coarse_reduction(T0, T1, T0);
                fr::mul_without_reduction(accumulator, work_step, accumulator);
            }
            fr::copy(T0, thread_coeffs[thread_coeffs_index + j]);
            fr::mul_without_reduction(accumulator, work_root, accumulator);
        }

        fft_inner_serial(&thread_coeffs[thread_coeffs_index], thread_omega, domain.thread_size);
    }

    // We need to copy our redults from the temporary array, into our coefficient array.
    // We also need to correct for lazy reduction - coefficients may be p greater than the actual value
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t i = 0; i < domain.num_threads; ++i)
    {
        for (size_t j = 0; j < domain.thread_size; ++j)
        {
            fr::reduce_once(thread_coeffs[i * domain.thread_size + j], coeffs[(j << domain.log2_num_threads) + i]);
        }
    }

    free(thread_coeffs);
}

void scale_by_generator(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &generator_start, const fr::field_t &generator_shift)
{
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < domain.num_threads; ++j)
    {
        fr::field_t work_generator;
        fr::field_t thread_shift;
        fr::pow_small(generator_shift, j * domain.thread_size, thread_shift);
        fr::mul_without_reduction(generator_start, thread_shift, work_generator);
        size_t offset = j * domain.thread_size;
        for (size_t i = offset; i < offset + domain.thread_size; ++i)
        {
            fr::mul(coeffs[i], work_generator, coeffs[i]);
            fr::mul_without_reduction(work_generator, generator_shift, work_generator);
        }
    }
}

void compute_multiplicative_subgroup(const size_t log2_subgroup_size, const evaluation_domain &src_domain, fr::field_t *subgroup_roots)
{
    size_t subgroup_size = 1UL << log2_subgroup_size;
    // Step 1: get primitive 4th root of unity
    fr::field_t subgroup_root;
    fr::get_root_of_unity(log2_subgroup_size, subgroup_root);

    // Step 2: compute the cofactor term g^n
    fr::field_t accumulator;
    fr::copy(fr::multiplicative_generator(), accumulator);
    for (size_t i = 0; i < src_domain.log2_size; ++i)
    {
        fr::sqr(accumulator, accumulator);
    }

    // Step 3: fill array with 4 values of (g.X)^n - 1, scaled by the cofactor
    fr::copy(accumulator, subgroup_roots[0]); // subgroup_root, accumulator, subgroup_roots[1]);
    for (size_t i = 1; i < subgroup_size; ++i)
    {
        fr::mul(subgroup_roots[i - 1], subgroup_root, subgroup_roots[i]);
    }
}
} // namespace

evaluation_domain get_domain(size_t num_elements)
{
    size_t n = (size_t)log2(num_elements);
    if ((1UL << n) != num_elements)
    {
        ++n;
    }
    evaluation_domain domain;
    domain.size = 1UL << n;
    domain.log2_size = n;
    fr::get_root_of_unity(domain.log2_size, domain.root);
    fr::invert(domain.root, domain.root_inverse);
    domain.domain = {.data = {domain.size, 0, 0, 0}};
    fr::to_montgomery_form(domain.domain, domain.domain);
    fr::invert(domain.domain, domain.domain_inverse);
    domain.generator = fr::multiplicative_generator();
    domain.generator_inverse = fr::multiplicative_generator_inverse();
#ifndef NO_MULTITHREADING
    domain.num_threads = (size_t)omp_get_max_threads();
#else
    domain.num_threads = 1;
#endif
    if (domain.num_threads >= domain.size)
    {
        domain.num_threads = 1;
    }
    domain.log2_num_threads = (size_t)log2(domain.num_threads);
    domain.log2_thread_size = domain.log2_size - domain.log2_num_threads;
    domain.thread_size = 1UL << domain.log2_thread_size;
    return domain;
}

void copy_polynomial(fr::field_t *src, fr::field_t *dest, size_t num_src_coefficients, size_t num_target_coefficients)
{
    // TODO: fiddle around with avx asm to see if we can speed up
    memcpy((void *)dest, (void *)src, num_src_coefficients * sizeof(fr::field_t));

    if (num_target_coefficients > num_src_coefficients)
    {
        // fill out the polynomial coefficients with zeroes
        memset((void *)(dest + num_src_coefficients), 0, (num_target_coefficients - num_src_coefficients) * sizeof(fr::field_t));
    }
}

void fft(fr::field_t *coeffs, const evaluation_domain &domain)
{
    fft_inner_parallel(coeffs, domain, domain.root);
}

void ifft(fr::field_t *coeffs, const evaluation_domain &domain)
{
    fft_inner_parallel(coeffs, domain, domain.root_inverse);
    ITERATE_OVER_DOMAIN_START(domain);
        fr::mul(coeffs[i], domain.domain_inverse, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void ifft_with_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &value)
{
    fft_inner_parallel(coeffs, domain, domain.root_inverse);
    fr::field_t T0;
    fr::mul(domain.domain_inverse, value, T0);
    ITERATE_OVER_DOMAIN_START(domain);
        fr::mul(coeffs[i], T0, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void fft_with_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &value)
{
    fft_inner_parallel(coeffs, domain, domain.root);
     ITERATE_OVER_DOMAIN_START(domain);
        fr::mul(coeffs[i], value, coeffs[i]);
    ITERATE_OVER_DOMAIN_END;   
}

void fft_with_coset(fr::field_t *coeffs, const evaluation_domain &domain)
{
    scale_by_generator(coeffs, domain, fr::one(), fr::multiplicative_generator());
    fft(coeffs, domain);
}

void fft_with_coset_and_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &constant)
{
    fr::field_t start = fr::one();
    fr::mul(start, constant, start);
    scale_by_generator(coeffs, domain, start, fr::multiplicative_generator());
    fft(coeffs, domain);
}

void ifft_with_coset(fr::field_t *coeffs, const evaluation_domain &domain)
{
    ifft(coeffs, domain);
    scale_by_generator(coeffs, domain, fr::one(), fr::multiplicative_generator_inverse());
}

void add(fr::field_t *a_coeffs, fr::field_t *b_coeffs, fr::field_t *r_coeffs, const evaluation_domain &domain)
{
    ITERATE_OVER_DOMAIN_START(domain);
        fr::add(a_coeffs[i], b_coeffs[i], r_coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}

void mul(fr::field_t *a_coeffs, fr::field_t *b_coeffs, fr::field_t *r_coeffs, const evaluation_domain &domain)
{
    ITERATE_OVER_DOMAIN_START(domain);
        fr::mul(a_coeffs[i], b_coeffs[i], r_coeffs[i]);
    ITERATE_OVER_DOMAIN_END;
}


fr::field_t evaluate(fr::field_t *coeffs, const fr::field_t &z, const size_t n)
{
#ifndef NO_MULTITHREADING
size_t num_threads = (size_t)omp_get_max_threads();
#else
size_t num_threads = 1;
#endif

    size_t range_per_thread = n / num_threads;
    size_t leftovers = n - (range_per_thread * num_threads);
    fr::field_t evaluations[num_threads];
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < num_threads; ++j)
    {
        fr::field_t z_acc;
        fr::field_t work_var;
        fr::pow_small(z, j * range_per_thread, z_acc);
        size_t offset = j * range_per_thread;
        evaluations[j] = fr::zero();
        size_t end = (j == num_threads - 1) ? offset + range_per_thread + leftovers : offset + range_per_thread;
        for (size_t i = offset; i < end; ++i)
        {
            fr::mul(coeffs[i], z_acc, work_var);
            fr::add(evaluations[j], work_var, evaluations[j]);
            fr::mul_without_reduction(z_acc, z, z_acc);
        }
    }

    fr::field_t r = fr::zero();
    for (size_t j = 0; j < num_threads; ++j)
    {
        fr::add(r, evaluations[j], r);
    }
    return r;
}

// For L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
// Compute the 2n-fft of L_1(X)
// We can use this to compute the 2n-fft evaluations of any L_i(X).
// We can consider `l_1_coefficients` to be a 2n-sized vector of the evaluations of L_1(X),
// for all X = 2n'th roots of unity.
// To compute the vector for the 2n-fft transform of L_i(X), we perform a (2i)-left-shift of this vector
void compute_lagrange_polynomial_fft(fr::field_t *l_1_coefficients, const evaluation_domain &src_domain, const evaluation_domain &target_domain, fr::field_t *scratch_memory)
{
    // L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
    // when evaluated at the 2n'th roots of unity, the term X^{n} forms a subgroup of order 2
    // w = n'th root of unity
    // w' = 2n'th root of unity = w^{1/2}
    // for even powers of w', X^{n} = w^{2in/2} = 1
    // for odd powers of w', X = w^{i}w^{n/2} -> X^{n} = w^{in}w^{n/2} = -w

    // We also want to compute fft using subgroup union a coset (the multiplicative generator g), so we're not dividing by zero

    // Step 1: compute the denominator for each evaluation: 1 / (X.g - 1)
    // fr::field_t work_root;
    fr::field_t one = fr::one();
    fr::field_t multiplicand;
    fr::copy(target_domain.root, multiplicand);


#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t j = 0; j < target_domain.num_threads; ++j)
    {
        fr::field_t work_root;
        fr::field_t root_shift;
        fr::pow_small(multiplicand, j * target_domain.thread_size, root_shift);
        fr::mul(fr::multiplicative_generator(), root_shift, work_root);
        size_t offset = j * target_domain.thread_size;
        for (size_t i = offset; i < offset + target_domain.thread_size; ++i)
        {
            fr::sub(work_root, one, l_1_coefficients[i]);
            fr::mul_without_reduction(work_root, multiplicand, work_root);
        }
    }

    // use Montgomery's trick to invert all of these at once
    fr::batch_invert(l_1_coefficients, target_domain.size, scratch_memory);

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

    fr::field_t subgroup_roots[subgroup_size];
    compute_multiplicative_subgroup(log2_subgroup_size, src_domain, &subgroup_roots[0]);

    // Each element of `subgroup_roots[i]` contains some root wi^n
    // want to compute (1/n)(wi^n - 1)
    for (size_t i = 0; i < subgroup_size; ++i)
    {
        fr::sub(subgroup_roots[i], fr::one(), subgroup_roots[i]);
        fr::mul(subgroup_roots[i], src_domain.domain_inverse, subgroup_roots[i]);
    }

    // TODO: this is disgusting! Fix it fix it fix it fix it...
    if (subgroup_size >= target_domain.thread_size)
    {
        for (size_t i = 0; i < target_domain.size; i += subgroup_size)
        {
            for (size_t j = 0; j < subgroup_size; ++j)
            {
                fr::mul(l_1_coefficients[i + j], subgroup_roots[j], l_1_coefficients[i + j]);
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
                    fr::mul(l_1_coefficients[i + j], subgroup_roots[j], l_1_coefficients[i + j]);
                }
            }
        }
    }
}

void divide_by_pseudo_vanishing_polynomial(fr::field_t *coeffs, evaluation_domain &src_domain, evaluation_domain &target_domain)
{
    // the PLONK divisor polynomial is equal to the vanishing polynomial divided by the vanishing polynomial for the last subgroup element
    // Z_H(X) = \prod_{i=1}^{n-1}(X - w^i) = (X^n - 1) / (X - w^{n-1})
    // i.e. we divide by vanishing polynomial, then multiply by degree-1 polynomial (X - w^{n-1})

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

    fr::field_t subgroup_roots[subgroup_size];
    compute_multiplicative_subgroup(log2_subgroup_size, src_domain, &subgroup_roots[0]);

    // Step 3: fill array with values of (g.X)^n - 1, scaled by the cofactor
    for (size_t i = 0; i < subgroup_size; ++i)
    {
        fr::sub(subgroup_roots[i], fr::one(), subgroup_roots[i]);
    }

    // Step 4: invert array entries to compute denominator term of 1/Z_H*(X)
    fr::field_t scratch_data[subgroup_size];
    fr::batch_invert(&subgroup_roots[0], subgroup_size, &scratch_data[0]);

    // The numerator term of Z_H*(X) is the polynomial (X - w^{n-1})
    // => (g.w_i - w^{n-1})
    fr::field_t numerator_constant;

    // Compute w^{n-1}
    fr::neg(src_domain.root_inverse, numerator_constant);
    // Compute first value of g.w_i

    // Step 5: iterate over point evaluations, scaling each one by the inverse of the vanishing polynomial
    if (subgroup_size >= target_domain.thread_size)
    {
        fr::field_t work_root;
        fr::copy(fr::multiplicative_generator(), work_root);
        fr::field_t T0;
        for (size_t i = 0; i < target_domain.size; i += subgroup_size)
        {
            for (size_t j = 0; j < subgroup_size; ++j)
            {
                fr::mul(coeffs[i + j], subgroup_roots[j], coeffs[i + j]);
                fr::add_without_reduction(work_root, numerator_constant, T0);
                fr::mul(coeffs[i + j], T0, coeffs[i + j]);
                fr::mul_without_reduction(work_root, target_domain.root, work_root);
            }
        }
    }
#ifndef NO_MULTITHREADING
#pragma omp parallel for
#endif
    for (size_t k = 0; k < target_domain.num_threads; ++k)
    {
        size_t offset = k * target_domain.thread_size;
        fr::field_t root_shift;
        fr::field_t work_root;
        fr::pow_small(target_domain.root, offset, root_shift);
        fr::mul(fr::multiplicative_generator(), root_shift, work_root);
        fr::field_t T0;
        for (size_t i = offset; i < offset + target_domain.thread_size; i += subgroup_size)
        {
            for (size_t j = 0; j < subgroup_size; ++j)
            {
                fr::mul(coeffs[i + j], subgroup_roots[j], coeffs[i + j]);
                fr::add(work_root, numerator_constant, T0);
                fr::mul(coeffs[i + j], T0, coeffs[i + j]);
                fr::mul_without_reduction(work_root, target_domain.root, work_root);
            }
        }
    }
}

fr::field_t compute_kate_opening_coefficients(fr::field_t *coeffs, const fr::field_t &z, const size_t n)
{
    // if `coeffs` represents F(X), we want to compute W(X)
    // where W(X) = F(X) - F(z) / (X - z)
    // i.e. divide by the degree-1 polynomial [-z, 1]

    // We assume that the commitment is well-formed and that there is no remainder term.
    // Under these conditions we can perform this polynomial division in linear time with good constants

    fr::field_t f = evaluate(coeffs, z, n);
    // compute (1 / -z)
    fr::field_t divisor;
    fr::neg(z, divisor);
    fr::invert(divisor, divisor);

    // we're about to shove these coefficients into a pippenger multi-exponentiation routine, where we need
    // to convert out of montgomery form. So, we can use lazy reduction techniques here without triggering overflows
    fr::sub_with_coarse_reduction(coeffs[0], f, coeffs[0]);
    fr::mul_without_reduction(coeffs[0], divisor, coeffs[0]);
    for (size_t i = 1; i < n; ++i)
    {
        fr::sub_with_coarse_reduction(coeffs[i], coeffs[i - 1], coeffs[i]);
        fr::mul_without_reduction(coeffs[i], divisor, coeffs[i]);
    }

    return f;
}

// compute Z_H*(z), l_1(z), l_{n-1}(z)
lagrange_evaluations get_lagrange_evaluations(const fr::field_t &z, evaluation_domain &domain)
{
    fr::field_t one = fr::one();
    fr::field_t z_pow;
    fr::copy(z, z_pow);
    for (size_t i = 0; i < domain.log2_size; ++i)
    {
        fr::sqr(z_pow, z_pow);
    }

    fr::field_t numerator;
    fr::sub(z_pow, one, numerator);

    fr::field_t denominators[6];
    fr::sub(z, one, denominators[1]);

    fr::mul(z, domain.root, denominators[2]);
    fr::mul(denominators[2], domain.root, denominators[2]);
    fr::sub(denominators[2], one, denominators[2]);

    fr::sub(z, domain.root_inverse, denominators[0]);
    // fr::mul(z, domain.short_root_inverse, denominators[0]);
    // fr::sub(denominators[0], one, denominators[0]);

    fr::batch_invert(denominators, 3, &denominators[3]);

    lagrange_evaluations result;
    fr::mul(numerator, denominators[0], result.vanishing_poly);

    fr::mul(numerator, domain.domain_inverse, numerator);
    fr::mul(numerator, denominators[1], result.l_1);
    fr::mul(numerator, denominators[2], result.l_n_minus_1);
    return result;
}

// Convert an fft with `current_size` point evaluations, to one with `current_size >> compress_factor` point evaluations
void compress_fft(const fr::field_t *src, fr::field_t *dest, const size_t current_size, const size_t compress_factor)
{
    // iterate from top to bottom, allows `dest` to overlap with `src`
    size_t log2_compress_factor = (size_t)log2(compress_factor);
    ASSERT(1 << log2_compress_factor == compress_factor);
    size_t new_size = current_size >> log2_compress_factor;
    for (size_t i = 0; i < new_size; ++i)
    {
        fr::copy(src[i << log2_compress_factor], dest[i]);
    }
}

} // namespace polynomials
} // namespace barretenberg