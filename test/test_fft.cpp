#include <gtest/gtest.h>

#include <gmp.h>
#include <libff/algebra/fields/fp.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_g1.hpp>
#include <libff/algebra/curves/alt_bn128/alt_bn128_init.hpp>

#include <barretenberg/polynomials/polynomials.hpp>

TEST(fft, evaluation_domain)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    EXPECT_EQ(domain.size, 256);
    EXPECT_EQ(domain.log2_size, 8);
}

TEST(fft, domain_roots)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t result;
    fr::field_t expected;
    fr::one(expected);
    fr::pow_small(domain.root, n, result);

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

    polynomials::fft(fft_transform, domain);

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
        fr::mul(work_root, domain.root, work_root);
    }
}


TEST(fft, basic_fft)
{
    size_t n = 16;
    fr::field_t result[n];
    fr::field_t expected[n];
    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(result[i]);
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    polynomials::fft(result, domain);
    polynomials::ifft(result, domain);

    for (size_t i = 0; i < n; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result[i].data[j], expected[i].data[j]);
        }
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

    polynomials::fft(result, domain);
    polynomials::ifft(result, domain);

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

    polynomials::fft_with_coset(result, domain);
    polynomials::ifft_with_coset(result, domain);

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
    fr::field_t poly_a[4 * n];
    fr::field_t poly_b[4 * n];
    fr::field_t poly_c[4 * n];

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
    polynomials::evaluation_domain small_domain = polynomials::get_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::get_domain(2 * n);
    polynomials::evaluation_domain large_domain = polynomials::get_domain(4 * n);

    polynomials::fft_with_coset(poly_a, small_domain);
    polynomials::fft_with_coset(poly_b, mid_domain);
    polynomials::fft_with_coset(poly_c, large_domain);

    for (size_t i = 0; i < n; ++i)
    {
        fr::add(poly_a[i], poly_c[4 * i], poly_a[i]);
        fr::add(poly_a[i], poly_b[2 * i], poly_a[i]);
    }

    polynomials::ifft_with_coset(poly_a, small_domain);

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
    polynomials::evaluation_domain small_domain = polynomials::get_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::get_domain(2 * n);

    fr::field_t l_1_coefficients[2 * n];
    fr::field_t scratch_memory[2 * n + 4];
    for (size_t i = 0; i < 2 * n; ++i)
    {
        fr::zero(l_1_coefficients[i]);
        fr::zero(scratch_memory[i]);
    }
    polynomials::compute_lagrange_polynomial_fft(l_1_coefficients, small_domain, mid_domain, scratch_memory);

    polynomials::copy_polynomial(l_1_coefficients, scratch_memory, 2 * n, 2 * n);

    polynomials::ifft_with_coset(l_1_coefficients, mid_domain);

    fr::field_t z;
    fr::field_t shifted_z;
    fr::random_element(z);
    fr::mul(z, small_domain.root, shifted_z);
    fr::mul(shifted_z, small_domain.root, shifted_z);

    fr::field_t eval;
    fr::field_t shifted_eval;

    polynomials::eval(l_1_coefficients, shifted_z, small_domain.size, eval);
    polynomials::fft(l_1_coefficients, small_domain);

    fr::copy(scratch_memory[0], scratch_memory[2 * n]);
    fr::copy(scratch_memory[1], scratch_memory[2 * n + 1]);
    fr::copy(scratch_memory[2], scratch_memory[2 * n + 2]);
    fr::copy(scratch_memory[3], scratch_memory[2 * n + 3]);
    fr::field_t *l_n_minus_one_coefficients = &scratch_memory[4];
    polynomials::ifft_with_coset(l_n_minus_one_coefficients, mid_domain);

    polynomials::eval(l_n_minus_one_coefficients, z, small_domain.size, shifted_eval);

    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(eval.data[i], shifted_eval.data[i]);
    }
    polynomials::fft(l_n_minus_one_coefficients, small_domain);

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

    fr::from_montgomery_form(l_n_minus_one_coefficients[n - 2], T0);
    EXPECT_EQ(T0.data[0], 1);
    EXPECT_EQ(T0.data[1], 0);
    EXPECT_EQ(T0.data[2], 0);
    EXPECT_EQ(T0.data[3], 0);
    for (size_t i = 0; i < n; ++i)
    {
        if (i == (n - 2)) { continue; }
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(l_n_minus_one_coefficients[i].data[j], 0);
        }
    }
}

TEST(fft, divide_by_pseudo_vanishing_polynomial)
{
    size_t n = 256;
    fr::field_t a[4 * n];
    fr::field_t b[4 * n];
    fr::field_t c[4 * n];

    fr::field_t T0;
    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(a[i]);
        fr::random_element(b[i]);
        fr::mul(a[i], b[i], c[i]);
        fr::neg(c[i], c[i]);
        fr::mul(a[i], b[i], T0);
        fr::add(T0, c[i], T0);

    }
    for (size_t i = n; i < 4 * n; ++i)
    {
        fr::zero(a[i]);
        fr::zero(b[i]);
        fr::zero(c[i]);
    }

    // make the final evaluation not vanish
    // fr::one(c[n-1]);
    polynomials::evaluation_domain small_domain = polynomials::get_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::get_domain(4 * n);

    polynomials::ifft(a, small_domain);
    polynomials::ifft(b, small_domain);
    polynomials::ifft(c, small_domain);

    polynomials::fft_with_coset(a, mid_domain);
    polynomials::fft_with_coset(b, mid_domain);
    polynomials::fft_with_coset(c, mid_domain);


    fr::field_t result[mid_domain.size];
    for (size_t i = 0; i < mid_domain.size; ++i)
    {
        fr::mul(a[i], b[i], result[i]);
        fr::add(result[i], c[i], result[i]);
    }

    polynomials::divide_by_pseudo_vanishing_polynomial(&result[0], small_domain, mid_domain);

    polynomials::ifft_with_coset(result, mid_domain);

    for (size_t i = n + 1; i < mid_domain.size; ++i)
    {
        EXPECT_EQ(result[i].data[0], 0);
        EXPECT_EQ(result[i].data[1], 0);
        EXPECT_EQ(result[i].data[2], 0);
        EXPECT_EQ(result[i].data[3], 0);
    }

}

// TEST(fft, divide_by_pseudo_vanishing_polynomial_long)
// {
//     size_t n = 16;
//     fr::field_t a[4 * n];
//     fr::field_t b[4 * n];
//     fr::field_t c[4 * n];

//     fr::field_t T0;
//     for (size_t i = 0; i < n; ++i)
//     {
//         fr::random_element(a[i]);
//         fr::random_element(b[i]);
//         fr::mul(a[i], b[i], c[i]);
//         fr::neg(c[i], c[i]);
//         fr::mul(a[i], b[i], T0);
//         fr::add(T0, c[i], T0);

//     }
//     for (size_t i = n; i < 4 * n; ++i)
//     {
//         fr::zero(a[i]);
//         fr::zero(b[i]);
//         fr::zero(c[i]);
//     }

//     // make the final evaluation not vanish
//     fr::random_element(c[n-1]);

//     polynomials::evaluation_domain domain = polynomials::get_domain(n);

//     polynomials::ifft(a, domain.short_root_inverse, domain.short_domain);
//     polynomials::ifft(b, domain.short_root_inverse, domain.short_domain);
//     polynomials::ifft(c, domain.short_root_inverse, domain.short_domain);

//     polynomials::fft_with_coset(a, domain.long_root, domain.generator, domain.long_domain);
//     polynomials::fft_with_coset(b, domain.long_root, domain.generator, domain.long_domain);
//     polynomials::fft_with_coset(c, domain.long_root, domain.generator, domain.long_domain);

//     fr::field_t result[domain.long_domain];
//     for (size_t i = 0; i < domain.long_domain; ++i)
//     {
//         fr::mul(a[i], b[i], result[i]);
//         fr::add(result[i], c[i], result[i]);
//     }

//     // polynomials::ifft_with_coset(result, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
//     // polynomials::fft(result, domain.long_root, domain.long_domain);

//     polynomials::divide_by_pseudo_vanishing_polynomial_long(&result[0], domain);

//     polynomials::ifft_with_coset(result, domain.long_root_inverse, domain.generator_inverse, domain.long_domain);
//     for (size_t i = n + 1; i < domain.long_domain; ++i)
//     {
//         EXPECT_EQ(result[i].data[0], 0);
//         EXPECT_EQ(result[i].data[1], 0);
//         EXPECT_EQ(result[i].data[2], 0);
//         EXPECT_EQ(result[i].data[3], 0);
//     }
// }

TEST(fft, compute_kate_opening_coefficients)
{
    // generate random polynomial F(X) = coeffs
    size_t n = 256;
    fr::field_t coeffs[2 * n];
    fr::field_t W[2 * n];
    for (size_t i = 0; i < n; ++i)
    {
        fr::random_element(coeffs[i]);
        fr::zero(coeffs[i + n]);
    }
    polynomials::copy_polynomial(coeffs, W, 2 * n, 2 * n);

    // generate random evaluation point z
    fr::field_t z;
    fr::random_element(z);

    // compute opening polynomial W(X), and evaluation f = F(z)
    fr::field_t f = polynomials::compute_kate_opening_coefficients(W, z, n);

    // validate that W(X)(X - z) = F(X) - F(z)
    // compute (X - z) in coefficient form
    fr::field_t multiplicand[2 * n];
    fr::neg(z, multiplicand[0]);
    fr::one(multiplicand[1]);
    for (size_t i = 2; i < 2 * n; ++i)
    {
        fr::zero(multiplicand[i]);
    }

    // set F(X) = F(X) - F(z)
    fr::sub(coeffs[0], f, coeffs[0]);

    // compute fft of polynomials
    polynomials::evaluation_domain domain = polynomials::get_domain(2 * n);
    polynomials::fft_with_coset(coeffs, domain);
    polynomials::fft_with_coset(W, domain);
    polynomials::fft_with_coset(multiplicand, domain);

    // validate that, at each evaluation, W(X)(X - z) = F(X) - F(z)
    fr::field_t result;
    fr::field_t expected;
    for (size_t i = 0; i < domain.size; ++i)
    {
        fr::mul(W[i], multiplicand[i], result);
        fr::copy(coeffs[i], expected);
        for (size_t j = 0; j < 4; ++j)
        {
            EXPECT_EQ(result.data[j], expected.data[j]);
        }
    }
}

TEST(fft, get_lagrange_evaluations)
{
    size_t n = 16;
    
    polynomials::evaluation_domain domain = polynomials::get_domain(n);

    fr::field_t z;
    fr::random_element(z);

    polynomials::lagrange_evaluations evals = polynomials::get_lagrange_evaluations(z, domain);

    fr::field_t vanishing_poly[2 * n];
    fr::field_t l_1_poly[n];
    fr::field_t l_n_minus_1_poly[n];

    for (size_t i = 0; i < n; ++i)
    {
        fr::zero(l_1_poly[i]);
        fr::zero(l_n_minus_1_poly[i]);
        fr::zero(vanishing_poly[i]);
    }
    fr::one(l_1_poly[0]);
    fr::one(l_n_minus_1_poly[n-2]);

    fr::field_t n_mont = { .data = { n, 0, 0, 0 } };
    fr::to_montgomery_form(n_mont, n_mont);
    fr::mul(n_mont, domain.root, vanishing_poly[n-1]);

    polynomials::ifft(l_1_poly, domain);
    polynomials::ifft(l_n_minus_1_poly, domain);
    polynomials::ifft(vanishing_poly, domain);

    fr::field_t l_1_expected;
    fr::field_t l_n_minus_1_expected;
    fr::field_t vanishing_poly_expected;
    polynomials::eval(l_1_poly, z, n, l_1_expected);
    polynomials::eval(l_n_minus_1_poly, z, n, l_n_minus_1_expected);
    polynomials::eval(vanishing_poly, z, n, vanishing_poly_expected);
    for (size_t i = 0; i < 4; ++i)
    {
        EXPECT_EQ(evals.l_1.data[i], l_1_expected.data[i]);
        EXPECT_EQ(evals.l_n_minus_1.data[i], l_n_minus_1_expected.data[i]);
        EXPECT_EQ(evals.vanishing_poly.data[i], vanishing_poly_expected.data[i]);
    }
}