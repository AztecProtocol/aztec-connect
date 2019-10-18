#include <gtest/gtest.h>

#include <barretenberg/fields/fr.hpp>
#include <barretenberg/fields/fq.hpp>
#include <barretenberg/groups/g1.hpp>

using namespace barretenberg;

TEST(group, random_element)
{
    g1::element result = g1::random_element();
    EXPECT_EQ(g1::on_curve(result), true);
}

TEST(group, random_affine_element)
{
    g1::affine_element result = g1::random_affine_element();
    EXPECT_EQ(g1::on_curve(result), true);
}

TEST(group, eq)
{
    g1::element a = g1::random_element();
    g1::element b = g1::normalize(a);

    EXPECT_EQ(g1::eq(a, b), true);
    EXPECT_EQ(g1::eq(a, a), true);

    g1::set_infinity(b);

    EXPECT_EQ(g1::eq(a, b), false);
    g1::element c = g1::random_element();

    EXPECT_EQ(g1::eq(a, c), false);

    g1::set_infinity(a);

    EXPECT_EQ(g1::eq(a, b), true);
}

TEST(group, mixed_add_check_against_constants)
{
    fq::field_t a_x = {{0x92716caa6cac6d26, 0x1e6e234136736544, 0x1bb04588cde00af0, 0x9a2ac922d97e6f5}};
    fq::field_t a_y = {{0x9e693aeb52d79d2d, 0xf0c1895a61e5e975, 0x18cd7f5310ced70f, 0xac67920a22939ad}};
    fq::field_t a_z = {{0xfef593c9ce1df132, 0xe0486f801303c27d, 0x9bbd01ab881dc08e, 0x2a589badf38ec0f9}};
    fq::field_t b_x = {{0xa1ec5d1398660db8, 0x6be3e1f6fd5d8ab1, 0x69173397dd272e11, 0x12575bbfe1198886}};
    fq::field_t b_y = {{0xcfbfd4441138823e, 0xb5f817e28a1ef904, 0xefb7c5629dcc1c42, 0x1a9ed3d6f846230e}};
    fq::field_t expected_x = {{0x2a9d0201fccca20, 0x36f969b294f31776, 0xee5534422a6f646, 0x911dbc6b02310b6}};
    fq::field_t expected_y = {{0x14c30aaeb4f135ef, 0x9c27c128ea2017a1, 0xf9b7d80c8315eabf, 0x35e628df8add760}};
    fq::field_t expected_z = {{0xa43fe96673d10eb3, 0x88fbe6351753d410, 0x45c21cc9d99cb7d, 0x3018020aa6e9ede5}};
    g1::element lhs;
    g1::affine_element rhs;
    g1::element result;
    g1::element expected;
    fq::__to_montgomery_form(a_x, lhs.x);
    fq::__to_montgomery_form(a_y, lhs.y);
    fq::__to_montgomery_form(a_z, lhs.z);
    fq::__to_montgomery_form(b_x, rhs.x);
    fq::__to_montgomery_form(b_y, rhs.y);
    fq::__to_montgomery_form(expected_x, expected.x);
    fq::__to_montgomery_form(expected_y, expected.y);
    fq::__to_montgomery_form(expected_z, expected.z);
    g1::mixed_add(lhs, rhs, result);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, dbl_check_against_constants)
{
    fq::field_t a_x = {{0x8d1703aa518d827f, 0xd19cc40779f54f63, 0xabc11ce30d02728c, 0x10938940de3cbeec}};
    fq::field_t a_y = {{0xcf1798994f1258b4, 0x36307a354ad90a25, 0xcd84adb348c63007, 0x6266b85241aff3f}};
    fq::field_t a_z = {{0xe213e18fd2df7044, 0xb2f42355982c5bc8, 0xf65cf5150a3a9da1, 0xc43bde08b03aca2}};
    fq::field_t expected_x = {{0xd5c6473044b2e67c, 0x89b185ea20951f3a, 0x4ac597219cf47467, 0x2d00482f63b12c86}};
    fq::field_t expected_y = {{0x4e7e6c06a87e4314, 0x906a877a71735161, 0xaa7b9893cc370d39, 0x62f206bef795a05}};
    fq::field_t expected_z = {{0x8813bdca7b0b115a, 0x929104dffdfabd22, 0x3fff575136879112, 0x18a299c1f683bdca}};
    g1::element lhs;
    g1::element result;
    g1::element expected;
    fq::__to_montgomery_form(a_x, lhs.x);
    fq::__to_montgomery_form(a_y, lhs.y);
    fq::__to_montgomery_form(a_z, lhs.z);
    fq::__to_montgomery_form(expected_x, expected.x);
    fq::__to_montgomery_form(expected_y, expected.y);
    fq::__to_montgomery_form(expected_z, expected.z);

    g1::dbl(lhs, result);
    g1::dbl(result, result);
    g1::dbl(result, result);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, add_check_against_constants)
{
    fq::field_t a_x = {{0x184b38afc6e2e09a, 0x4965cd1c3687f635, 0x334da8e7539e71c4, 0xf708d16cfe6e14}};
    fq::field_t a_y = {{0x2a6ff6ffc739b3b6, 0x70761d618b513b9, 0xbf1645401de26ba1, 0x114a1616c164b980}};
    fq::field_t a_z = {{0x10143ade26bbd57a, 0x98cf4e1f6c214053, 0x6bfdc534f6b00006, 0x1875e5068ababf2c}};
    fq::field_t b_x = {{0xafdb8a15c98bf74c, 0xac54df622a8d991a, 0xc6e5ae1f3dad4ec8, 0x1bd3fb4a59e19b52}};
    fq::field_t b_y = {{0x21b3bb529bec20c0, 0xaabd496406ffb8c1, 0xcd3526c26ac5bdcb, 0x187ada6b8693c184}};
    fq::field_t b_z = {{0xffcd440a228ed652, 0x8a795c8f234145f1, 0xd5279cdbabb05b95, 0xbdf19ba16fc607a}};
    fq::field_t expected_x = {{0x18764da36aa4cd81, 0xd15388d1fea9f3d3, 0xeb7c437de4bbd748, 0x2f09b712adf6f18f}};
    fq::field_t expected_y = {{0x50c5f3cab191498c, 0xe50aa3ce802ea3b5, 0xd9d6125b82ebeff8, 0x27e91ba0686e54fe}};
    fq::field_t expected_z = {{0xe4b81ef75fedf95, 0xf608edef14913c75, 0xfd9e178143224c96, 0xa8ae44990c8accd}};
    g1::element lhs;
    g1::element rhs;
    g1::element result;
    g1::element expected;

    fq::__to_montgomery_form(a_x, lhs.x);
    fq::__to_montgomery_form(a_y, lhs.y);
    fq::__to_montgomery_form(a_z, lhs.z);
    fq::__to_montgomery_form(b_x, rhs.x);
    fq::__to_montgomery_form(b_y, rhs.y);
    fq::__to_montgomery_form(b_z, rhs.z);
    fq::__to_montgomery_form(expected_x, expected.x);
    fq::__to_montgomery_form(expected_y, expected.y);
    fq::__to_montgomery_form(expected_z, expected.z);

    g1::add(lhs, rhs, result);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, add_exception_test_infinity)
{
    g1::element lhs = g1::random_element();
    g1::element rhs;
    g1::element result;

    g1::__neg(lhs, rhs);

    g1::add(lhs, rhs, result);

    EXPECT_EQ(g1::is_point_at_infinity(result), true);

    g1::element rhs_b;
    g1::copy(&rhs, &rhs_b);
    g1::set_infinity(rhs_b);

    g1::add(lhs, rhs_b, result);

    EXPECT_EQ(g1::eq(lhs, result), true);

    g1::set_infinity(lhs);
    g1::add(lhs, rhs, result);

    EXPECT_EQ(g1::eq(rhs, result), true);
}

TEST(group, add_exception_test_dbl)
{
    g1::element lhs = g1::random_element();
    g1::element rhs;
    g1::copy(&lhs, &rhs);

    g1::element result;
    g1::element expected;

    g1::add(lhs, rhs, result);
    g1::dbl(lhs, expected);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, add_dbl_consistency)
{
    g1::element a = g1::random_element();
    g1::element b = g1::random_element();

    g1::element c;
    g1::element d;
    g1::element add_result;
    g1::element dbl_result;

    g1::add(a, b, c);
    g1::__neg(b, b);
    g1::add(a, b, d);

    g1::add(c, d, add_result);
    g1::dbl(a, dbl_result);

    EXPECT_EQ(g1::eq(add_result, dbl_result), true);
}

TEST(group, add_dbl_consistency_repeated)
{
    g1::element a = g1::random_element();
    g1::element b;
    g1::element c;
    g1::element d;
    g1::element e;

    g1::element result;
    g1::element expected;

    g1::dbl(a, b); // b = 2a
    g1::dbl(b, c); // c = 4a

    g1::add(a, b, d);      // d = 3a
    g1::add(a, c, e);      // e = 5a
    g1::add(d, e, result); // result = 8a

    g1::dbl(c, expected); // expected = 8a

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, mixed_add_exception_test_infinity)
{
    g1::element lhs = g1::one();
    g1::affine_element rhs = g1::random_affine_element();
    fq::copy(rhs.x, lhs.x);
    fq::__neg(rhs.y, lhs.y);

    g1::element result;
    g1::mixed_add(lhs, rhs, result);

    EXPECT_EQ(g1::is_point_at_infinity(result), true);

    g1::set_infinity(lhs);
    g1::mixed_add(lhs, rhs, result);
    g1::element rhs_c;
    g1::affine_to_jacobian(rhs, rhs_c);

    EXPECT_EQ(g1::eq(rhs_c, result), true);
}

TEST(group, mixed_add_exception_test_dbl)
{
    g1::affine_element rhs = g1::random_affine_element();
    g1::element lhs;
    g1::affine_to_jacobian(rhs, lhs);

    g1::element result;
    g1::element expected;
    g1::mixed_add(lhs, rhs, result);

    g1::dbl(lhs, expected);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, add_mixed_add_consistency_check)
{
    g1::affine_element rhs = g1::random_affine_element();
    g1::element lhs = g1::random_element();
    g1::element rhs_b;
    g1::affine_to_jacobian(rhs, rhs_b);

    g1::element add_result;
    g1::element mixed_add_result;
    g1::add(lhs, rhs_b, add_result);
    g1::mixed_add(lhs, rhs, mixed_add_result);

    EXPECT_EQ(g1::eq(add_result, mixed_add_result), true);
}

TEST(group, batch_normalize)
{
    size_t num_points = 2;
    g1::element points[num_points];
    g1::element normalized[num_points];
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::element a = g1::random_element();
        g1::element b = g1::random_element();
        g1::add(a, b, points[i]);
        g1::copy(&points[i], &normalized[i]);
    }
    g1::batch_normalize(normalized, num_points);

    for (size_t i = 0; i < num_points; ++i)
    {
        fq::field_t zz;
        fq::field_t zzz;
        fq::field_t result_x;
        fq::field_t result_y;
        fq::__sqr(points[i].z, zz);
        fq::__mul(points[i].z, zz, zzz);
        fq::__mul(normalized[i].x, zz, result_x);
        fq::__mul(normalized[i].y, zzz, result_y);

        EXPECT_EQ(fq::eq(result_x, points[i].x), true);
        EXPECT_EQ(fq::eq(result_y, points[i].y), true);
    }
}

TEST(group, group_exponentiation_check_against_constants)
{
    fr::field_t a{{0xb67299b792199cf0, 0xc1da7df1e7e12768, 0x692e427911532edf, 0x13dd85e87dc89978}};
    fr::__to_montgomery_form(a, a);

    fq::field_t expected_x = {{0x9bf840faf1b4ba00, 0xe81b7260d068e663, 0x7610c9a658d2c443, 0x278307cd3d0cddb0}};
    fq::field_t expected_y = {{0xf6ed5fb779ebecb, 0x414ca771acbe183c, 0xe3692cb56dfbdb67, 0x3d3c5ed19b080a3}};

    g1::affine_element expected;
    fq::__to_montgomery_form(expected_x, expected.x);
    fq::__to_montgomery_form(expected_y, expected.y);

    g1::affine_element result = g1::group_exponentiation(g1::affine_one(), a);

    EXPECT_EQ(g1::eq(result, expected), true);
}

TEST(group, group_exponentiation_zero_and_one)
{
    g1::affine_element result = g1::group_exponentiation(g1::affine_one(), fr::zero());

    EXPECT_EQ(g1::is_point_at_infinity(result), true);

    result = g1::group_exponentiation(g1::affine_one(), fr::one());
    EXPECT_EQ(g1::eq(result, g1::affine_one()), true);
}

TEST(group, group_exponentiation_consistency_check)
{
    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();

    fr::field_t c;
    fr::__mul(a, b, c);

    g1::affine_element input = g1::affine_one();
    g1::affine_element result = g1::group_exponentiation(input, a);
    result = g1::group_exponentiation(result, b);

    g1::affine_element expected = g1::group_exponentiation(input, c);

    EXPECT_EQ(g1::eq(result, expected), true);
}