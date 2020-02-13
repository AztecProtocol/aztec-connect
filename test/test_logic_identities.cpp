#include <gtest/gtest.h>

#include <cstdint>

bool and_xor_identity(uint64_t a_x, uint64_t a_x_omega, uint64_t b_x, uint64_t b_x_omega, uint64_t w, uint64_t c_x, uint64_t c_x_omega, uint64_t selector, size_t i, size_t j)
{
    uint64_t delta_a = a_x_omega - (4 * a_x);
    uint64_t delta_b = b_x_omega - (4 * b_x);
    uint64_t delta_c = c_x_omega - (4 * c_x);

    uint64_t delta_a_squared = (delta_a * delta_a);
    uint64_t delta_b_squared = (delta_b * delta_b);
    uint64_t delta_c_squared = (delta_c * delta_c);

    uint64_t five_delta_a = delta_a + delta_a;
    uint64_t three_delta_a = five_delta_a + delta_a;
    five_delta_a = five_delta_a + three_delta_a;

    uint64_t five_delta_b = delta_b + delta_b;
    uint64_t three_delta_b = five_delta_b + delta_b;
    five_delta_b = five_delta_b + three_delta_b;

    uint64_t five_delta_c = delta_c + delta_c;
    uint64_t three_delta_c = five_delta_c + delta_c;
    five_delta_c = five_delta_c + three_delta_c;

    uint64_t delta_a_test = (delta_a_squared - delta_a) * (delta_a_squared - five_delta_a + 6);
    uint64_t delta_b_test = (delta_b_squared - delta_b) * (delta_b_squared - five_delta_b + 6);
    uint64_t delta_c_test = (delta_c_squared - delta_c) * (delta_c_squared - five_delta_c + 6);

    uint64_t w_test = (delta_a * delta_b - w);

    uint64_t delta_sum_three = three_delta_a + three_delta_b;
    uint64_t delta_sum_nine = delta_sum_three + delta_sum_three;
    delta_sum_nine = delta_sum_nine + delta_sum_three;
    uint64_t delta_sum_eighteen =  delta_sum_nine + delta_sum_nine;
    uint64_t delta_sum_eighty_one = delta_sum_eighteen + delta_sum_eighteen;
    delta_sum_eighty_one = delta_sum_eighty_one + delta_sum_eighty_one;
    delta_sum_eighty_one = delta_sum_eighty_one + delta_sum_nine;


    uint64_t delta_squared_sum = delta_a_squared + delta_b_squared;
    uint64_t delta_squared_sum_eighteen = delta_squared_sum + delta_squared_sum; // 2
    uint64_t delta_squared_sum_three = delta_squared_sum_eighteen + delta_squared_sum; // 3
    delta_squared_sum_eighteen = delta_squared_sum_three + delta_squared_sum_three; // 6
    delta_squared_sum_eighteen = delta_squared_sum_eighteen + delta_squared_sum_three; // 9
    delta_squared_sum_eighteen = delta_squared_sum_eighteen + delta_squared_sum_eighteen; // 18

    uint64_t r1 = w + w; // 2
    uint64_t r2 = r1 + r1; // 4


    uint64_t poly_and_a = r2 - delta_sum_eighteen + 81;
    uint64_t poly_and_b = -delta_sum_eighty_one + delta_squared_sum_eighteen + 83;
    uint64_t poly_and_c = w * (w * poly_and_a + poly_and_b);

    uint64_t delta_c_2 = delta_c + delta_c;
    uint64_t delta_c_3 = delta_c_2 + delta_c;
    uint64_t delta_c_6 = delta_c_3 + delta_c_3;
    uint64_t delta_c_9 = delta_c_6 + delta_c_3;
    uint64_t identity = selector * (selector * (delta_c_9 - delta_sum_three) + (delta_c_3 - (poly_and_c + poly_and_c) + delta_sum_three));
 
    return !(delta_a_test || delta_b_test || delta_c_test || w_test || identity);

}
bool xor_identity(uint64_t a_x, uint64_t a_x_omega, uint64_t b_x, uint64_t b_x_omega, uint64_t w, uint64_t c_x, uint64_t c_x_omega, size_t i, size_t j)
{
    uint64_t delta_a = a_x_omega - (4 * a_x);
    uint64_t delta_b = b_x_omega - (4 * b_x);
    uint64_t delta_c = c_x_omega - (4 * c_x);

    uint64_t delta_a_test = (delta_a) * (delta_a - 1) * (delta_a - 2) * (delta_a - 3);
    uint64_t delta_b_test = (delta_b) * (delta_b - 1) * (delta_b - 2) * (delta_b - 3);
    uint64_t delta_c_test = (delta_c) * (delta_c - 1) * (delta_c - 2) * (delta_c - 3);

    uint64_t w_test = (delta_a * delta_b - w);

    uint64_t poly_a = 18 * (delta_a + delta_b) - 4 * w - 81;
    uint64_t poly_b = 81 * (delta_a + delta_b) - 18 * (delta_a * delta_a + delta_b * delta_b) - 83;
    uint64_t poly_c = w * (w * poly_a + poly_b) + 3 * (delta_a + delta_b);

    uint64_t poly_test = (delta_c * 3) - poly_c;
    if (poly_test != 0)
    {
        printf("invalid at index %lu : %lu , value = %lu \n", i, j, poly_c);
    }
    return !(delta_a_test || delta_b_test || delta_c_test || w_test || poly_test);
}

bool and_identity(uint64_t a_x, uint64_t a_x_omega, uint64_t b_x, uint64_t b_x_omega, uint64_t w, uint64_t c_x, uint64_t c_x_omega, size_t i, size_t j)
{
    uint64_t delta_a = a_x_omega - (4 * a_x);
    uint64_t delta_b = b_x_omega - (4 * b_x);
    uint64_t delta_c = c_x_omega - (4 * c_x);

    uint64_t delta_a_test = (delta_a) * (delta_a - 1) * (delta_a - 2) * (delta_a - 3);
    uint64_t delta_b_test = (delta_b) * (delta_b - 1) * (delta_b - 2) * (delta_b - 3);
    uint64_t delta_c_test = (delta_c) * (delta_c - 1) * (delta_c - 2) * (delta_c - 3);

    uint64_t w_test = (delta_a * delta_b - w);

    uint64_t poly_a = 4 * w - 18 * ( delta_a + delta_b) + 81;
    uint64_t poly_b = 18 * (delta_a * delta_a + delta_b * delta_b) - 81 * (delta_a + delta_b) + 83;
    uint64_t poly_c = w * (w * poly_a + poly_b);

    uint64_t poly_test = (delta_c * 6) - poly_c;
    if (poly_test != 0)
    {
        printf("invalid at index %lu : %lu , value = %lu \n", i, j, poly_c);
    }
    return !(delta_a_test || delta_b_test || delta_c_test || w_test || poly_test);
}

TEST(test_logic_identities, xor)
{
    uint64_t base_a = 128;
    uint64_t base_b = 513;
    uint64_t base_c = base_a ^ base_b;

    for (size_t i = 0; i < 4; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            uint64_t a_val = i;
            uint64_t b_val = j;
            uint64_t c_val = i ^ j;

            uint64_t a_x = base_a;
            uint64_t a_x_omega = (4 * base_a) + a_val;

            uint64_t b_x = base_b;
            uint64_t b_x_omega = (4 * base_b) + b_val;

            uint64_t c_x = base_c;
            uint64_t c_x_omega = (4 * base_c) + c_val;

            uint64_t w = a_val * b_val;

            bool valid = xor_identity(a_x, a_x_omega, b_x, b_x_omega, w, c_x, c_x_omega, i, j);

            EXPECT_EQ(valid, true);
        }
    }
}

TEST(test_logic_identities, and)
{
    uint64_t base_a = 128;
    uint64_t base_b = 513;
    uint64_t base_c = base_a & base_b;

    for (size_t i = 0; i < 4; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            uint64_t a_val = i;
            uint64_t b_val = j;
            uint64_t c_val = i & j;

            uint64_t a_x = base_a;
            uint64_t a_x_omega = (4 * base_a) + a_val;

            uint64_t b_x = base_b;
            uint64_t b_x_omega = (4 * base_b) + b_val;

            uint64_t c_x = base_c;
            uint64_t c_x_omega = (4 * base_c) + c_val;

            uint64_t w = a_val * b_val;

            bool valid = and_identity(a_x, a_x_omega, b_x, b_x_omega, w, c_x, c_x_omega, i, j);

            // EXPECT_EQ(valid, true);
        }
    }
}

TEST(test_logic_identities, and_xor)
{
    uint64_t base_a = 128;
    uint64_t base_b = 513;
    uint64_t base_c = base_a ^ base_b;

    for (size_t k = 0; k < 2; ++k)
    {
    for (size_t i = 0; i < 4; ++i)
    {
        for (size_t j = 0; j < 4; ++j)
        {
            uint64_t a_val = i;
            uint64_t b_val = j;
            uint64_t c_val = k == 0 ? i & j : i ^ j;

            uint64_t a_x = base_a;
            uint64_t a_x_omega = (4 * base_a) + a_val;

            uint64_t b_x = base_b;
            uint64_t b_x_omega = (4 * base_b) + b_val;

            uint64_t c_x = base_c;
            uint64_t c_x_omega = (4 * base_c) + c_val;

            uint64_t w = a_val * b_val;

            uint64_t selector = (k == 0) ? 1 : (uint64_t(-1));
            bool valid = and_xor_identity(a_x, a_x_omega, b_x, b_x_omega, w, c_x, c_x_omega, selector, i, j);

            EXPECT_EQ(valid, true);
        }
    }
    }
}