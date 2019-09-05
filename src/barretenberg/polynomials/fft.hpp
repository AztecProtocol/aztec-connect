#pragma once

#include <stdint.h>
#include <math.h>

#include "../fields/fr.hpp"

namespace polynomials
{
    struct evaluation_domain
    {
        size_t short_domain;
        size_t long_domain;
        size_t log2_short_domain;
        size_t log2_long_domain;
        fr::field_t short_root;
        fr::field_t long_root;
        fr::field_t short_root_inverse;
        fr::field_t long_root_inverse;
    };

    inline evaluation_domain get_domain(size_t num_elements)
    {
        size_t n = log2(num_elements);
        if ((1UL << n) != num_elements)
        {
            ++n;
        }
        evaluation_domain domain;
        domain.short_domain = 1UL << n;
        domain.long_domain = 4 * domain.short_domain;
        domain.log2_short_domain = n;
        domain.log2_long_domain = n + 2;

        fr::get_root_of_unity(domain.log2_short_domain, domain.short_root);
        fr::get_root_of_unity(domain.log2_long_domain, domain.long_root);
        fr::invert(domain.short_root, domain.short_root_inverse);
        fr::invert(domain.long_root, domain.long_root_inverse);
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

    inline void eval(fr::field_t* coeffs, const fr::field_t& z, const size_t n, fr::field_t& r)
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

    inline void scale_by_generator(fr::field_t* coeffs, const size_t n, const fr::field_t& generator_start, const fr::field_t& generator_shift)
    {
        fr::field_t work_generator;
        fr::copy(generator_start, work_generator);
        for (size_t i = 0; i < n - 1; ++i)
        {
            fr::mul(coeffs[i], work_generator, coeffs[i]);
            fr::mul(work_generator, generator_shift, work_generator);
        }
        fr::mul(coeffs[n-1], work_generator, coeffs[n-1]);
    }

    inline void fft(fr::field_t* coeffs, const fr::field_t& root, const size_t domain_size)
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
            fr::copy(coeffs[k+1], temp);
            fr::sub(coeffs[k], coeffs[k+1], coeffs[k+1]);
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

    inline void ifft(fr::field_t* coeffs, const fr::field_t& root_inverse, const size_t domain_size)
    {
        fr::field_t domain_inverse = { .data = { domain_size, 0, 0, 0 } };
        fr::to_montgomery_form(domain_inverse, domain_inverse);
        fr::invert(domain_inverse, domain_inverse);
        fft(coeffs, root_inverse, domain_size);

        for (size_t i = 0; i < domain_size; ++i)
        {
            fr::mul(coeffs[i], domain_inverse, coeffs[i]);
        }
    }

    inline void fft_with_coset(fr::field_t* coeffs, const fr::field_t& root, const size_t domain_size)
    {
        scale_by_generator(coeffs, domain_size, fr::one(), fr::multiplicative_generator());
        fft(coeffs, root, domain_size);
    }

    inline void ifft_with_coset(fr::field_t* coeffs, const fr::field_t& root_inverse, const size_t domain_size)
    {
        scale_by_generator(coeffs, domain_size, fr::one(), fr::multiplicative_generator_inverse());
        ifft(coeffs, root_inverse, domain_size);
    }
}