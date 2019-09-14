#pragma once

#include <stdint.h>
#include <math.h>

#include "../groups/g1.hpp"
#include "../fields/fr.hpp"
#include "../assert.hpp"

namespace polynomials
{

// struct evaluation_domain_aux
// {
//     size_t domain_size;
//     size_t log2_domain_size;
//     fr::field_t root;
//     fr::field_t root_inverse;
//     fr::field_t domain_inverse;
//     fr::field_t domain;
// };

// enum representation
// {
//     NONE,
//     COEFFICIENT_FORM,
//     LAGRANGE_BASE_FORM,
//     EVALAUTION_FORM,
//     EXTENDED_EVALUATION_FORM
// };

// struct polynomial
// {
//     fr::field_t* coefficients;
//     representation representation;
//     evaluation_domain_aux domain;
// };

// void copy_domain_aux(evaluation_domain_aux& src, evaluation_domain_aux& dest)
// {
//     dest.domain_size = src.domain_size;
//     dest.log2_domain_size = src.log2_domain_size;
//     fr::copy(src.root, dest.root);
//     fr::copy(src.root_inverse, dest.root_inverse);
//     fr::copy(src.domain, dest.domain);
//     fr::copy(src.domain_inverse, dest.domain_inverse);
// }

// void copy_polynomial_aux(polynomial& src, polynomial& dest)
// {
//     if (&src == &dest)
//     {
//         // hey! these are the same!
//         return;
//     }
//     dest.representation = src.representation;
//     copy_domain_aux(src.domain, dest.domain);
//     size_t poly_size = src.domain.domain_size * sizeof(fr::field_t);
//     memcpy((void *)dest.coefficients, (void *)src.coefficients, src.domain.domain_size * sizeof(fr::field_t));
// }

// void copy_polynomial_into_different_representation(polynomial& src, polynomial& dest, evaluation_domain_aux& new_domain)
// {
//     copy_polynomial_aux(src, dest);

// }
// void switch_representation(polynomial& poly, representation new_representation)
// {
//     if (poly.representation == new_representation)
//     {
//         return;
//     }

//     if (new_representation == representation::COEFFICIENT_FORM)
//     {
//         ifft(poly.coefficients, poly.domain.root_inverse, poly.domain.domain_size);
//     }
//     else if (new_representation == representation::LAGRANGE_BASE_FORM)
//     {
//         fft(poly.coefficients, )
//     }
// }

struct evaluation_domain
{
    size_t size;
    size_t log2_size;
    fr::field_t root;
    fr::field_t root_inverse;
    fr::field_t generator;
    fr::field_t generator_inverse;
    fr::field_t domain;
    fr::field_t domain_inverse;
    // size_t short_domain; // size n
    // size_t mid_domain;   // size 2n
    // size_t long_domain;  // size 4n
    // size_t log2_short_domain;
    // size_t log2_mid_domain;
    // size_t log2_long_domain;
    // fr::field_t short_root;
    // fr::field_t mid_root;
    // fr::field_t long_root;
    // fr::field_t short_root_inverse;
    // fr::field_t mid_root_inverse;
    // fr::field_t long_root_inverse;
    // fr::field_t generator;
    // fr::field_t generator_inverse;
    // fr::field_t short_domain_inverse;
    // fr::field_t mid_domain_inverse;
    // fr::field_t long_domain_inverse;
};

// struct evaluation_domain
// {
//     size_t short_domain; // size n
//     size_t mid_domain;   // size 2n
//     size_t long_domain;  // size 4n
//     size_t log2_short_domain;
//     size_t log2_mid_domain;
//     size_t log2_long_domain;
//     fr::field_t short_root;
//     fr::field_t mid_root;
//     fr::field_t long_root;
//     fr::field_t short_root_inverse;
//     fr::field_t mid_root_inverse;
//     fr::field_t long_root_inverse;
//     fr::field_t generator;
//     fr::field_t generator_inverse;
//     fr::field_t short_domain_inverse;
//     fr::field_t mid_domain_inverse;
//     fr::field_t long_domain_inverse;
// };

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
    domain.size = 1UL << n;
    domain.log2_size = n;
    fr::get_root_of_unity(domain.log2_size, domain.root);
    fr::invert(domain.root, domain.root_inverse);

    domain.domain = { .data = { domain.size, 0, 0, 0 } };
    fr::to_montgomery_form(domain.domain, domain.domain);
    fr::invert(domain.domain, domain.domain_inverse);
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

inline void fft_inner(fr::field_t *coeffs, const fr::field_t &root, const size_t domain_size)
{
    fr::field_t temp;
    size_t log2_size = log2(domain_size);
    // efficiently separate odd and even indices - (An introduction to algorithms, section 30.3)
    for (size_t i = 0; i <= domain_size; ++i)
    {
        uint32_t swap_index = (uint32_t)reverse_bits((uint32_t)i, log2_size);
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

inline void fft(fr::field_t *coeffs, const evaluation_domain& domain)
{
    fft_inner(coeffs, domain.root, domain.size);
}

inline void ifft(fr::field_t *coeffs, const evaluation_domain& domain)
{
    fft_inner(coeffs, domain.root_inverse, domain.size);
    for (size_t i = 0; i < domain.size; ++i)
    {
        fr::mul(coeffs[i], domain.domain_inverse, coeffs[i]);
    }
}

inline void fft_with_coset(fr::field_t *coeffs, const evaluation_domain& domain)
{
    scale_by_generator(coeffs, domain.size, fr::one(), fr::multiplicative_generator());
    fft(coeffs, domain);
}

inline void fft_with_coset_and_constant(fr::field_t *coeffs, const evaluation_domain& domain, const fr::field_t& constant)
{
    fr::field_t start = fr::one();
    fr::mul(start, constant, start);
    scale_by_generator(coeffs, domain.size, start, fr::multiplicative_generator());
    fft(coeffs, domain);
}

inline void ifft_with_coset(fr::field_t *coeffs, const evaluation_domain& domain)
{
    ifft(coeffs, domain);
    scale_by_generator(coeffs, domain.size, fr::one(), fr::multiplicative_generator_inverse());
}

inline void compute_multiplicative_subgroup(const size_t log2_subgroup_size, const evaluation_domain& src_domain, fr::field_t* subgroup_roots)
{
    size_t subgroup_size = 1 << log2_subgroup_size;
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
// For L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
// Compute the 2n-fft of L_1(X)
// We can use this to compute the 2n-fft evaluations of any L_i(X).
// We can consider `l_1_coefficients` to be a 2n-sized vector of the evaluations of L_1(X),
// for all X = 2n'th roots of unity.
// To compute the vector for the 2n-fft transform of L_i(X), we perform a (2i)-left-shift of this vector
inline void compute_lagrange_polynomial_fft(fr::field_t *l_1_coefficients, const evaluation_domain& src_domain, const evaluation_domain &target_domain, fr::field_t *scratch_memory)
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
    fr::copy(fr::multiplicative_generator(), work_root);
    fr::field_t multiplicand;
    fr::copy(target_domain.root, multiplicand);

    for (size_t i = 0; i < target_domain.size; ++i)
    {
        fr::sub(work_root, one, l_1_coefficients[i]);
        fr::mul(work_root, multiplicand, work_root);
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
    size_t subgroup_size = 1 << log2_subgroup_size;
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

    for (size_t i = 0; i < target_domain.size; i += subgroup_size)
    {
        for (size_t j = 0; j < subgroup_size; ++j)
        {
            fr::mul(l_1_coefficients[i + j], subgroup_roots[j], l_1_coefficients[i + j]);
        }
    }
    // fr::field_t root_subgroup[2];
    // fr::field_t accumulator;
    // fr::copy(domain.generator, accumulator);
    // for (size_t i = 0; i < domain.log2_short_domain; ++i)
    // {
    //     fr::sqr(accumulator, accumulator);
    // }
    // fr::sub(accumulator, one, root_subgroup[0]);
    // fr::neg(accumulator, root_subgroup[1]);
    // fr::sub(root_subgroup[1], one, root_subgroup[1]);

    // fr::mul(root_subgroup[0], domain.short_domain_inverse, root_subgroup[0]);
    // fr::mul(root_subgroup[1], domain.short_domain_inverse, root_subgroup[1]);
    // for (size_t i = 0; i < domain.mid_domain; i += 2)
    // {
    //     fr::mul(l_1_coefficients[i], root_subgroup[0], l_1_coefficients[i]);
    //     fr::mul(l_1_coefficients[i + 1], root_subgroup[1], l_1_coefficients[i + 1]);
    // }
}

inline void divide_by_pseudo_vanishing_polynomial(fr::field_t* coeffs, evaluation_domain& src_domain, evaluation_domain& target_domain)
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
    size_t subgroup_size = 1 << log2_subgroup_size;
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
    fr::field_t work_root;

    // Compute w^{n-1}
    fr::neg(src_domain.root_inverse, numerator_constant);
    // Compute first value of g.w_i
    fr::copy(fr::multiplicative_generator(), work_root);

    fr::field_t T0;
    // Step 5: iterate over point evaluations, scaling each one by the inverse of the vanishing polynomial
    for (size_t i = 0; i < target_domain.size; i += subgroup_size)
    {
        for (size_t  j = 0; j < subgroup_size; ++j)
        {
            fr::mul(coeffs[i + j], subgroup_roots[j], coeffs[i + j]);
            fr::add(work_root, numerator_constant, T0);
            fr::mul(coeffs[i + j], T0, coeffs[i + j]);
            fr::mul(work_root, target_domain.root, work_root);
        }
        // fr::mul(coeffs[i], subgroup_roots[0], coeffs[i]);
        // fr::mul(coeffs[i + 1], subgroup_roots[1], coeffs[i + 1]);
        // fr::mul(coeffs[i + 2], subgroup_roots[2], coeffs[i + 2]);
        // fr::mul(coeffs[i + 3], subgroup_roots[3], coeffs[i + 3]);

        // fr::add(work_root, numerator_constant, accumulator);
        // fr::mul(coeffs[i], accumulator, coeffs[i]);
        // fr::mul(work_root, domain.long_root, work_root);
        // fr::add(work_root, numerator_constant, accumulator);
        // fr::mul(coeffs[i + 1], accumulator, coeffs[i+1]);
        // fr::mul(work_root, domain.long_root, work_root);
        // fr::add(work_root, numerator_constant, accumulator);
        // fr::mul(coeffs[i + 2], accumulator, coeffs[i+2]);
        // fr::mul(work_root, domain.long_root, work_root);
        // fr::add(work_root, numerator_constant, accumulator);
        // fr::mul(coeffs[i + 3], accumulator, coeffs[i+3]);
        // fr::mul(work_root, domain.long_root, work_root);
    }
}

// inline void divide_by_pseudo_vanishing_polynomial_mid(fr::field_t* coeffs, evaluation_domain& domain)
// {
//     // the PLONK divisor polynomial is equal to the vanishing polynomial divided by the vanishing polynomial for the last subgroup element
//     // Z_H(X) = \prod_{i=1}^{n-1}(X - w^i) = (X^n - 1) / (X - w^{n-1})
//     // i.e. we divide by vanishing polynomial, then multiply by degree-1 polynomial (X - w^{n-1})

//     // `coeffs` should be in point-evaluation form, evaluated at the two roots of unity
//     // P(X) = X^n - 1 will form a subgroup of order 4 when evaluated at these points
//     // If X = w^i, P(X) = 1
//     // If X = w^{i + j/2}, P(X) = -1
//     fr::field_t one = fr::one();
//     fr::field_t root_subgroup[4]; // add 2 extra elements for fr::batch_invert's scratch space
//     fr::field_t accumulator;
//     fr::copy(domain.generator, accumulator);
//     for (size_t i = 0; i < domain.log2_short_domain; ++i)
//     {
//         fr::sqr(accumulator, accumulator);
//     }
    
//     fr::sub(accumulator, one, root_subgroup[0]);
//     fr::neg(accumulator, root_subgroup[1]);
//     fr::sub(root_subgroup[1], one, root_subgroup[1]);

//     fr::batch_invert(&root_subgroup[0], 2, &root_subgroup[2]);

//     fr::field_t numerator_constant;
//     fr::field_t work_root;

//     fr::neg(domain.short_root_inverse, numerator_constant);

//     fr::copy(domain.generator, work_root);

//     // fr::field_t T0;
//     for (size_t i = 0; i < domain.mid_domain; i += 2)
//     {
//         fr::mul(coeffs[i], root_subgroup[0], coeffs[i]);
//         fr::mul(coeffs[i + 1], root_subgroup[1], coeffs[i + 1]);

//         fr::add(work_root, numerator_constant, accumulator);
//         fr::mul(coeffs[i], accumulator, coeffs[i]);
//         fr::mul(work_root, domain.mid_root, work_root);
//         fr::add(work_root, numerator_constant, accumulator);
//         fr::mul(coeffs[i + 1], accumulator, coeffs[i+1]);
//         fr::mul(work_root, domain.mid_root, work_root);
//     }
// }

inline fr::field_t compute_kate_opening_coefficients(fr::field_t* coeffs, const fr::field_t& z, const size_t n)
{
    // if `coeffs` represents F(X), we want to compute W(X)
    // where W(X) = F(X) - F(z) / (X - z)
    // i.e. divide by the degree-1 polynomial [-z, 1]

    // We assume that the commitment is well-formed and that there is no remainder term.
    // Under these conditions we can perform this polynomial division in linear time with good constants

    fr::field_t f;
    eval(coeffs, z, n, f);
    // compute (1 / -z)
    fr::field_t divisor;
    fr::neg(z, divisor);
    fr::invert(divisor, divisor);

    fr::sub(coeffs[0], f, coeffs[0]);
    fr::mul(coeffs[0], divisor, coeffs[0]);

    for (size_t i = 1; i < n; ++i)
    {
        fr::sub(coeffs[i], coeffs[i-1], coeffs[i]);
        fr::mul(coeffs[i], divisor, coeffs[i]);
    }

    return f;
}

struct lagrange_evaluations
{
    fr::field_t vanishing_poly;
    fr::field_t l_1;
    fr::field_t l_n_minus_1;
};

// compute Z_H*(z), l_1(z), l_{n-1}(z)
inline lagrange_evaluations get_lagrange_evaluations(const fr::field_t& z, evaluation_domain& domain)
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
inline void compress_fft(const fr::field_t* src, fr::field_t* dest, const size_t current_size, const size_t compress_factor)
{
    // iterate from top to bottom, allows `dest` to overlap with `src`
    size_t log2_compress_factor = log2(compress_factor);
    ASSERT(1 << log2_compress_factor == compress_factor);
    size_t new_size = current_size >> log2_compress_factor;
    for (size_t i = 0; i < new_size; ++i)
    {
        fr::copy(src[i << log2_compress_factor], dest[i]);
    }
}
} // namespace polynomials