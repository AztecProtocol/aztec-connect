#pragma once

#include <stdint.h>
#include <math.h>

#include "../groups/g1.hpp"
#include "../fields/fr.hpp"

namespace polynomials
{
struct evaluation_domain
{
    size_t short_domain; // size n
    size_t mid_domain;   // size 2n
    size_t long_domain;  // size 4n
    size_t log2_short_domain;
    size_t log2_mid_domain;
    size_t log2_long_domain;
    fr::field_t short_root;
    fr::field_t mid_root;
    fr::field_t long_root;
    fr::field_t short_root_inverse;
    fr::field_t mid_root_inverse;
    fr::field_t long_root_inverse;
    fr::field_t generator;
    fr::field_t generator_inverse;
    fr::field_t short_domain_inverse;
    fr::field_t mid_domain_inverse;
    fr::field_t long_domain_inverse;
};

inline void copy_polynomial(fr::field_t *src, fr::field_t *dest, size_t num_src_coefficients, size_t num_target_coefficients)
{
    // TODO: fiddle around with avx2 asm to see if we can speed up
    memcpy((void *)dest, (void *)src, num_src_coefficients * sizeof(fr::field_t));

    if (num_target_coefficients > num_src_coefficients)
    {
        // fill out the polynomial coefficients with zeroes
        memset((void *)(dest + num_src_coefficients), 0, (num_target_coefficients - num_src_coefficients) * sizeof(fr::field_t));
    }
}

inline evaluation_domain get_domain(size_t num_elements)
{
    size_t n = log2(num_elements);
    if ((1UL << n) != num_elements)
    {
        ++n;
    }
    evaluation_domain domain;
    domain.short_domain = 1UL << n;
    domain.mid_domain = 2 * domain.short_domain;
    domain.long_domain = 4 * domain.short_domain;
    domain.log2_short_domain = n;
    domain.log2_mid_domain = n + 1;
    domain.log2_long_domain = n + 2;

    fr::get_root_of_unity(domain.log2_short_domain, domain.short_root);
    fr::get_root_of_unity(domain.log2_mid_domain, domain.mid_root);
    fr::get_root_of_unity(domain.log2_long_domain, domain.long_root);
    fr::invert(domain.short_root, domain.short_root_inverse);
    fr::invert(domain.mid_root, domain.mid_root_inverse);
    fr::invert(domain.long_root, domain.long_root_inverse);
    fr::field_t domain_inverse = {.data = {domain.short_domain, 0, 0, 0}};
    fr::to_montgomery_form(domain_inverse, domain_inverse);
    fr::invert(domain_inverse, domain.short_domain_inverse);
    domain_inverse = {.data = {domain.mid_domain, 0, 0, 0}};
    fr::to_montgomery_form(domain_inverse, domain_inverse);
    fr::invert(domain_inverse, domain.mid_domain_inverse);
    domain_inverse = {.data = {domain.long_domain, 0, 0, 0}};
    fr::to_montgomery_form(domain_inverse, domain_inverse);
    fr::invert(domain_inverse, domain.long_domain_inverse);

    domain.generator = fr::multiplicative_generator();
    domain.generator_inverse = fr::multiplicative_generator_inverse();

    return domain;
}

inline uint32_t reverse_bits(uint32_t x, uint32_t bit_length)
{
    x = (((x & 0xaaaaaaaa) >> 1) | ((x & 0x55555555) << 1));
    x = (((x & 0xcccccccc) >> 2) | ((x & 0x33333333) << 2));
    x = (((x & 0xf0f0f0f0) >> 4) | ((x & 0x0f0f0f0f) << 4));
    x = (((x & 0xff00ff00) >> 8) | ((x & 0x00ff00ff) << 8));
    return (((x >> 16) | (x << 16))) >> (32 - bit_length);
}

inline void eval(fr::field_t *coeffs, const fr::field_t &z, const size_t n, fr::field_t &r)
{
    fr::field_t work_var;
    fr::field_t z_acc;
    fr::zero(work_var);
    fr::zero(r);
    fr::one(z_acc);
    for (size_t i = 0; i < n; ++i)
    {
        fr::mul(coeffs[i], z_acc, work_var);
        fr::add(r, work_var, r);
        fr::mul(z_acc, z, z_acc);
    }
}

inline void scale_by_generator(fr::field_t *coeffs, const size_t n, const fr::field_t &generator_start, const fr::field_t &generator_shift)
{
    fr::field_t work_generator;
    fr::copy(generator_start, work_generator);
    for (size_t i = 0; i < n - 1; ++i)
    {
        fr::mul(coeffs[i], work_generator, coeffs[i]);
        fr::mul(work_generator, generator_shift, work_generator);
    }
    fr::mul(coeffs[n - 1], work_generator, coeffs[n - 1]);
}

inline void fft(fr::field_t *coeffs, const fr::field_t &root, const size_t domain_size)
{
    uint32_t log_n = log2(domain_size);
    fr::field_t temp;

    // efficiently separate odd and even indices - (An introduction to algorithms, section 30.3)
    for (size_t i = 0; i <= domain_size; ++i)
    {
        uint32_t swap_index = (uint32_t)reverse_bits((uint32_t)i, log_n);
        if (i < swap_index)
        {
            fr::swap(coeffs[i], coeffs[swap_index]);
        }
    }

    // TODO: defer modular reductions
    // perform first butterfly iteration explicitly: x0 = x0 + x1, x1 = x0 - x1
    for (size_t k = 0; k < domain_size; k += 2)
    {
        fr::copy(coeffs[k + 1], temp);
        fr::sub(coeffs[k], coeffs[k + 1], coeffs[k + 1]);
        fr::add(temp, coeffs[k], coeffs[k]);
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
                fr::mul(work_root, coeffs[k + j + m], temp);
                fr::sub(coeffs[k + j], temp, coeffs[k + j + m]);
                fr::add(coeffs[k + j], temp, coeffs[k + j]);
                fr::mul(work_root, round_root, work_root);
            }
        }
    }
}

inline void ifft(fr::field_t *coeffs, const fr::field_t &root_inverse, const size_t domain_size)
{
    fr::field_t domain_inverse = {.data = {domain_size, 0, 0, 0}};
    fr::to_montgomery_form(domain_inverse, domain_inverse);
    fr::invert(domain_inverse, domain_inverse);
    fft(coeffs, root_inverse, domain_size);
    for (size_t i = 0; i < domain_size; ++i)
    {
        fr::mul(coeffs[i], domain_inverse, coeffs[i]);
    }
}

inline void fft_with_coset(fr::field_t *coeffs, const fr::field_t &root, const fr::field_t &generator, const size_t domain_size)
{
    scale_by_generator(coeffs, domain_size, fr::one(), generator);
    fft(coeffs, root, domain_size);
}

inline void fft_with_coset_and_constant(fr::field_t *coeffs, const fr::field_t &root, const fr::field_t &generator, const fr::field_t &constant, const size_t domain_size)
{
    fr::field_t start = fr::one();
    fr::mul(start, constant, start);
    scale_by_generator(coeffs, domain_size, start, generator);
    fft(coeffs, root, domain_size);
}

inline void ifft_with_coset(fr::field_t *coeffs, const fr::field_t &root_inverse, const fr::field_t &generator_inverse, const size_t domain_size)
{
    ifft(coeffs, root_inverse, domain_size);
    scale_by_generator(coeffs, domain_size, fr::one(), generator_inverse);
}

// For L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
// Compute the 2n-fft of L_1(X)
// We can use this to compute the 2n-fft evaluations of any L_i(X).
// We can consider `l_1_coefficients` to be a 2n-sized vector of the evaluations of L_1(X),
// for all X = 2n'th roots of unity.
// To compute the vector for the 2n-fft transform of L_i(X), we perform a (2i)-left-shift of this vector
inline void compute_lagrange_polynomial_fft(fr::field_t *l_1_coefficients, evaluation_domain &domain, fr::field_t *scratch_memory)
{
    // L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
    // when evaluated at the 2n'th roots of unity, the term X^{n} forms a subgroup of order 2
    // w = n'th root of unity
    // w' = 2n'th root of unity = w^{1/2}
    // for even powers of w', X^{n} = w^{2in/2} = 1
    // for odd powers of w', X = w^{i}w^{n/2} -> X^{n} = w^{in}w^{n/2} = -w

    // We also want to compute fft using subgroup union a coset (the multiplicative generator g), so we're not dividing by zero

    // Step 1: compute the denominator for each evaluation: 1 / (X.g - 1)
    fr::field_t work_root;
    fr::field_t one = fr::one();
    fr::copy(domain.generator, work_root);
    fr::field_t multiplicand;
    fr::copy(domain.mid_root, multiplicand);

    for (size_t i = 0; i < domain.mid_domain; ++i)
    {
        fr::sub(work_root, one, l_1_coefficients[i]);
        fr::mul(work_root, multiplicand, work_root);
    }

    // use Montgomery's trick to invert all of these at once
    fr::batch_invert(l_1_coefficients, domain.mid_domain, scratch_memory);

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
    fr::field_t root_subgroup[2];
    fr::field_t accumulator;
    fr::copy(domain.generator, accumulator);
    for (size_t i = 0; i < domain.log2_short_domain; ++i)
    {
        fr::sqr(accumulator, accumulator);
    }
    fr::sub(accumulator, one, root_subgroup[0]);
    fr::neg(accumulator, root_subgroup[1]);
    fr::sub(root_subgroup[1], one, root_subgroup[1]);

    fr::mul(root_subgroup[0], domain.short_domain_inverse, root_subgroup[0]);
    fr::mul(root_subgroup[1], domain.short_domain_inverse, root_subgroup[1]);
    for (size_t i = 0; i < domain.mid_domain; i += 2)
    {
        fr::mul(l_1_coefficients[i], root_subgroup[0], l_1_coefficients[i]);
        fr::mul(l_1_coefficients[i + 1], root_subgroup[1], l_1_coefficients[i + 1]);
    }
}

// compute coefficients of L_1(X), L_n(X)
inline void compute_split_lagrange_polynomial_fft(fr::field_t *l_1_coefficients, fr::field_t *l_n_coefficients, evaluation_domain &domain)
{
    size_t n = domain.short_domain;
    fr::field_t T0;
    fr::mul(domain.short_domain_inverse, domain.generator_inverse, T0);
    for (size_t i = 0; i < domain.short_domain; ++i)
    {
        fr::copy(domain.short_domain_inverse, l_1_coefficients[i]);
        fr::copy(T0, l_n_coefficients[i]);
    }
    memset((void *)(l_1_coefficients + n), 0, (n) * sizeof(fr::field_t));
    memset((void *)(l_n_coefficients + n), 0, (n) * sizeof(fr::field_t));
    polynomials::fft_with_coset(l_1_coefficients, domain.mid_root, domain.generator, domain.mid_domain);
    polynomials::fft_with_coset(l_n_coefficients, domain.mid_root, domain.generator, domain.mid_domain);
}
} // namespace polynomials