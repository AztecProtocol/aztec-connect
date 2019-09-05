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