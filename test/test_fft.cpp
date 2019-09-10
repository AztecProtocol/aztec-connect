#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/polynomials/fft.hpp>

TEST(fft, evaluation_domain)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    EXPECT_EQ(domain.short_domain, 256);
    EXPECT_EQ(domain.long_domain, 1024);
    EXPECT_EQ(domain.log2_short_domain, 8);
    EXPECT_EQ(domain.log2_long_domain, 10);
}


TEST(fft, domain_roots)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t result;
    fr::field_t expected;
    fr::one(expected);
    // fr::mul(domain.short_root, domain.short_root_inverse, result);
    fr::pow_small(domain.short_root, n, result);

    for (size_t j = 0; j < 4; ++j)
    {
        EXPECT_EQ(result.data[j], expected.data[j]);
    }
}

TEST(fft, fft_with_small_degree)
{
    size_t n = 4;
    fr::field_t fft_transform[n];
    fr::field_t poly[n];

    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(poly[i]);
        fr::copy(poly[i], fft_transform[i]);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    polynomials::fft(fft_transform, domain.short_root, n);

    fr::field_t work_root;
    fr::one(work_root);
    fr::field_t expected;
    for (size_t i = 0; i < n; ++i)
    {
        polynomials::eval(poly, work_root, n, expected);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(fft_transform[i].data[j], expected.data[j]);
        }
        fr::mul(work_root, domain.short_root, work_root);
    }
}

TEST(fft, fft_ifft_consistency)
{
    size_t n = 256;
    fr::field_t result[n];
    fr::field_t expected[n];
    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(result[i]);
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    polynomials::fft(result, domain.short_root, n);
    polynomials::ifft(result, domain.short_root_inverse, n);

    for (size_t i = 0; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[i].data[j], expected[i].data[j]);
        }
    }
}

TEST(fft, fft_ifft_with_coset_consistency)
{
    size_t n = 256;
    fr::field_t result[n];
    fr::field_t expected[n];
    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(result[i]);
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t T0;
    fr::mul(domain.generator, domain.generator_inverse, T0);
    fr::from_montgomery_form(T0, T0);
    EXPECT_EQ(T0.data[0], 1);
    EXPECT_EQ(T0.data[1], 0);
    EXPECT_EQ(T0.data[2], 0);
    EXPECT_EQ(T0.data[3], 0);

    polynomials::fft_with_coset(result, domain.short_root, domain.generator, n);
    polynomials::ifft_with_coset(result, domain.short_root_inverse, domain.generator_inverse, n);

    for (size_t i = 0; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[i].data[j], expected[i].data[j]);
        }
    }
}


TEST(fft, fft_ifft_with_coset_cross_consistency)
{
    size_t n = 2;
    fr::field_t expected[n];
    fr::field_t poly_a[4*n];
    fr::field_t poly_b[4*n];
    fr::field_t poly_c[4*n];

    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(poly_a[i]);
        fr::copy(poly_a[i], poly_b[i]);
        fr::copy(poly_a[i], poly_c[i]);
        fr::add(poly_a[i], poly_c[i], expected[i]);
        fr::add(expected[i], poly_b[i], expected[i]);
    }

    for (size_t i = n; i < 4 * n; ++i)
    {
        fr::zero(poly_a[i]);
        fr::zero(poly_b[i]);
        fr::zero(poly_c[i]);
    }
    polynomials::evaluation_domain domain = polynomials::get_domain(n);


    polynomials::fft_with_coset(poly_a, domain.short_root, domain.generator, domain.short_domain);
    polynomials::fft_with_coset(poly_b, domain.mid_root, domain.generator, domain.mid_domain);
    polynomials::fft_with_coset(poly_c, domain.long_root, domain.generator, domain.long_domain);
 
    for (size_t i = 0; i < n; ++i)
    {
        fr::add(poly_a[i], poly_c[4*i], poly_a[i]);
        fr::add(poly_a[i], poly_b[2*i], poly_a[i]);
    }

    polynomials::ifft_with_coset(poly_a, domain.short_root_inverse, domain.generator_inverse, domain.short_domain);

    for (size_t i = 0; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(poly_a[i].data[j], expected[i].data[j]);
        }
    }
}


TEST(fft, compute_lagrange_polynomial_fft)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t l_1_coefficients[2 * n];
    fr::field_t scratch_memory[2 * n + 2];
    for (size_t i = 0; i < 2 * n; ++i)
    {
        fr::zero(l_1_coefficients[i]);
        fr::zero(scratch_memory[i]);
    }
    polynomials::compute_lagrange_polynomial_fft(l_1_coefficients, domain, scratch_memory);

    polynomials::copy_polynomial(l_1_coefficients, scratch_memory, 2 * n, 2 * n);
    
    polynomials::ifft_with_coset(l_1_coefficients, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);
    polynomials::fft(l_1_coefficients, domain.short_root, domain.short_domain);
    
    fr::copy(scratch_memory[0], scratch_memory[2 * n]);
    fr::copy(scratch_memory[1], scratch_memory[2 * n + 1]);
    fr::field_t* l_n_coefficients = &scratch_memory[2];
    polynomials::ifft_with_coset(l_n_coefficients, domain.mid_root_inverse, domain.generator_inverse, domain.mid_domain);
    polynomials::fft(l_n_coefficients, domain.short_root, domain.short_domain);

    fr::field_t T0;
    fr::from_montgomery_form(l_1_coefficients[0], T0);
    EXPECT_EQ(T0.data[0], 1);
    EXPECT_EQ(T0.data[1], 0);
    EXPECT_EQ(T0.data[2], 0);
    EXPECT_EQ(T0.data[3], 0);
    for (size_t i = 1; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(l_1_coefficients[i].data[j], 0);
        }
    }

    fr::from_montgomery_form(l_n_coefficients[n - 1], T0);
    EXPECT_EQ(T0.data[0], 1);
    EXPECT_EQ(T0.data[1], 0);
    EXPECT_EQ(T0.data[2], 0);
    EXPECT_EQ(T0.data[3], 0);
    for (size_t i = 0; i < n - 1; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(l_n_coefficients[i].data[j], 0);
        }
    }
}
