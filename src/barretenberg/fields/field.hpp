#pragma once

#include <array>
#include <cinttypes>
#include <cstdint>
#include <cstdio>
#include <unistd.h>

#include "../assert.hpp"
#include "../types.hpp"

#include "./new_field.hpp"

// #include "../uint256/uint256.hpp"

// 2: all methods that pass in a reference to the return value should be prefixed by __
// 3: all methods that have a __ prefix, should have a partner method that returns by value

namespace barretenberg {
template <typename FieldParams> class field {
  public:
    typedef test::field<FieldParams> field_t;
    // struct field_t : public test::field<FieldParams> {
    //     bool operator<(const field_t& other) const { return gt(other, *this); }
    // };
    // struct field_t {
    //     alignas(32) uint64_t data[4];

    //     // constexpr field_t()
    //     //     : data()
    //     // {}
    //     // constexpr field_t(uint64_t a, uint64_t b, uint64_t c, uint64_t d)
    //     //     : data{ a, b, c, d }
    //     // {}
    //     // constexpr field_t(const std::array<uint64_t, 4>& in)
    //     //     : data{ in[0], in[1], in[2], in[3] }
    //     // {}

    //     // constexpr field_t(const field_t& other) = default;

    //     // constexpr field_t& operator=(const field_t& other) = default;

    //     // constexpr field_t& operator=(field_t&& other) = default;

    //     // bool operator<(const field_t& other) const { return gt(other, *this); }
    // };

    struct field_wide_t {
        alignas(64) uint64_t data[8];
    };

    static constexpr field_t modulus = {
        { FieldParams::modulus_0, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t twice_modulus = { { FieldParams::twice_modulus_0,
                                                 FieldParams::twice_modulus_1,
                                                 FieldParams::twice_modulus_2,
                                                 FieldParams::twice_modulus_3 } };
    static constexpr field_t zero{ { 0x00, 0x00, 0x00, 0x00 } };
    static constexpr field_t two_inv{
        { FieldParams::two_inv_0, FieldParams::two_inv_1, FieldParams::two_inv_2, FieldParams::two_inv_3 }
    };
    static constexpr field_t modulus_plus_one{
        { FieldParams::modulus_0 + 1ULL, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t modulus_minus_two = {
        { FieldParams::modulus_0 - 2ULL, FieldParams::modulus_1, FieldParams::modulus_2, FieldParams::modulus_3 }
    };
    static constexpr field_t sqrt_exponent = { { FieldParams::sqrt_exponent_0,
                                                 FieldParams::sqrt_exponent_1,
                                                 FieldParams::sqrt_exponent_2,
                                                 FieldParams::sqrt_exponent_3 } };
    static constexpr field_t r_squared{
        { FieldParams::r_squared_0, FieldParams::r_squared_1, FieldParams::r_squared_2, FieldParams::r_squared_3 }
    };
    static constexpr field_t one_raw{ { 1ULL, 0ULL, 0ULL, 0ULL } };
    static constexpr field_t one{
        { FieldParams::one_mont_0, FieldParams::one_mont_1, FieldParams::one_mont_2, FieldParams::one_mont_3 }
    };
    static constexpr field_t beta{
        { FieldParams::cube_root_0, FieldParams::cube_root_1, FieldParams::cube_root_2, FieldParams::cube_root_3 }
    };
    static constexpr field_t multiplicative_generator{ { FieldParams::multiplicative_generator_0,
                                                         FieldParams::multiplicative_generator_1,
                                                         FieldParams::multiplicative_generator_2,
                                                         FieldParams::multiplicative_generator_3 } };
    static constexpr field_t multiplicative_generator_inverse{ { FieldParams::multiplicative_generator_inverse_0,
                                                                 FieldParams::multiplicative_generator_inverse_1,
                                                                 FieldParams::multiplicative_generator_inverse_2,
                                                                 FieldParams::multiplicative_generator_inverse_3 } };
    static constexpr field_t alternate_multiplicative_generator{
        { FieldParams::alternate_multiplicative_generator_0,
          FieldParams::alternate_multiplicative_generator_1,
          FieldParams::alternate_multiplicative_generator_2,
          FieldParams::alternate_multiplicative_generator_3 }
    };
    static constexpr field_t root_of_unity{ { FieldParams::primitive_root_0,
                                              FieldParams::primitive_root_1,
                                              FieldParams::primitive_root_2,
                                              FieldParams::primitive_root_3 } };

    static constexpr field_t coset_generators[15]{
        { { FieldParams::coset_generators_0[0],
            FieldParams::coset_generators_1[0],
            FieldParams::coset_generators_2[0],
            FieldParams::coset_generators_3[0] } },
        { { FieldParams::coset_generators_0[1],
            FieldParams::coset_generators_1[1],
            FieldParams::coset_generators_2[1],
            FieldParams::coset_generators_3[1] } },
        { { FieldParams::coset_generators_0[2],
            FieldParams::coset_generators_1[2],
            FieldParams::coset_generators_2[2],
            FieldParams::coset_generators_3[2] } },
        { { FieldParams::coset_generators_0[3],
            FieldParams::coset_generators_1[3],
            FieldParams::coset_generators_2[3],
            FieldParams::coset_generators_3[3] } },
        { { FieldParams::coset_generators_0[4],
            FieldParams::coset_generators_1[4],
            FieldParams::coset_generators_2[4],
            FieldParams::coset_generators_3[4] } },
        { { FieldParams::coset_generators_0[5],
            FieldParams::coset_generators_1[5],
            FieldParams::coset_generators_2[5],
            FieldParams::coset_generators_3[5] } },
        { { FieldParams::coset_generators_0[6],
            FieldParams::coset_generators_1[6],
            FieldParams::coset_generators_2[6],
            FieldParams::coset_generators_3[6] } },
        { { FieldParams::coset_generators_0[7],
            FieldParams::coset_generators_1[7],
            FieldParams::coset_generators_2[7],
            FieldParams::coset_generators_3[7] } },
        { { FieldParams::coset_generators_0[8],
            FieldParams::coset_generators_1[8],
            FieldParams::coset_generators_2[8],
            FieldParams::coset_generators_3[8] } },
        { { FieldParams::coset_generators_0[9],
            FieldParams::coset_generators_1[9],
            FieldParams::coset_generators_2[9],
            FieldParams::coset_generators_3[9] } },
        { { FieldParams::coset_generators_0[10],
            FieldParams::coset_generators_1[10],
            FieldParams::coset_generators_2[10],
            FieldParams::coset_generators_3[10] } },
        { { FieldParams::coset_generators_0[11],
            FieldParams::coset_generators_1[11],
            FieldParams::coset_generators_2[11],
            FieldParams::coset_generators_3[11] } },
        { { FieldParams::coset_generators_0[12],
            FieldParams::coset_generators_1[12],
            FieldParams::coset_generators_2[12],
            FieldParams::coset_generators_3[12] } },
        { { FieldParams::coset_generators_0[13],
            FieldParams::coset_generators_1[13],
            FieldParams::coset_generators_2[13],
            FieldParams::coset_generators_3[13] } },
        { { FieldParams::coset_generators_0[14],
            FieldParams::coset_generators_1[14],
            FieldParams::coset_generators_2[14],
            FieldParams::coset_generators_3[14] } },
    };
    /**
     * Arithmetic Methods (with return parameters)
     *
     * We pass in return value as a parameter, so that the input references and
     * the output references can overlap, without affecting performance.
     *
     * The 'without reduction' methods do not perform a conditional check on the result,
     * to determine whether the value exceeds our modulus p.
     *
     * The 'with coarse reduction' methods will constrain the result to be modulo 2p
     **/

    // Multiply field_t `a` by the cube root of unity, modulo `q`. Store result in `r`

    /**
     * Arithmetic Methods (return by value)
     **/
    // __attribute__((always_inline)) inline static field_t from_uint256(const uint256_t& input) noexcept
    // {
    //     field_t out{ input.data[0], input.data[1], input.data[2], input.data[3] };
    //     return to_montgomery_form(out);
    // }

    __attribute__((always_inline)) inline static field_t neg_one() noexcept
    {
        field_t r = (zero - one);
        return r;
    }

    /**
     * Comparison methods and bit operations
     **/

    /**
     * Copy methods
     **/
    static void __swap(field_t& src, field_t& dest) noexcept
    {
        field_t T = dest;
        dest = src;
        src = T;
    }

    static void __copy(const field_t& a, field_t& r) noexcept { r = a; }

    static field_t copy(const field_t& src) noexcept
    {
        field_t r;
        __copy(src, r);
        return r;
    }

    /**
     * Montgomery modular reduction methods
     **/

    /**
     * Algorithms
     **/

    /**
     * compute a^b mod q, return result in r
     **/

    /**
     * compute a^{q - 2} mod q, place result in r
     **/

    /**
     * compute a^{(q + 1) / 4}, place result in r
     **/

    /**
     * Get a random field element in montgomery form, place in `r`
     **/
    __attribute__((always_inline)) inline static field_t random_element()
    {
        field_t r;
        int got_entropy = getentropy((void*)r.data, 32);
        ASSERT(got_entropy == 0);
        return r.to_montgomery_form();
    }

    /**
     * print `r`
     **/
    __attribute__((always_inline)) inline static void print(const field_t& a)
    {
        printf("field: [%" PRIx64 ", %" PRIx64 ", %" PRIx64 ", %" PRIx64 "]\n",
               a.data[0],
               a.data[1],
               a.data[2],
               a.data[3]);
    }

    __attribute__((always_inline)) inline static void batch_invert(field_t* coeffs,
                                                                   size_t n,
                                                                   field_t* scratch_space = nullptr)
    {
        field_t* temporaries = scratch_space ? scratch_space : (field_t*)aligned_alloc(32, sizeof(field_t) * n);
        field_t accumulator = one;
        for (size_t i = 0; i < n; ++i) {
            __copy(accumulator, temporaries[i]);
            accumulator = accumulator * coeffs[i];
        }

        accumulator = accumulator.invert();

        field_t T0;
        for (size_t i = n - 1; i < n; --i) {
            T0 = accumulator * temporaries[i];
            accumulator = accumulator * coeffs[i];
            __copy(T0, coeffs[i]);
        }
        if (scratch_space == nullptr) {
            aligned_free(temporaries);
        }
    }

    __attribute__((always_inline)) inline static void compute_coset_generators(const size_t n,
                                                                               const uint64_t subgroup_size,
                                                                               field_t* result)
    {
        if (n > 0) {
            result[0] = (multiplicative_generator);
        }
        field_t work_variable = multiplicative_generator + one;

        size_t count = 1;
        while (count < n) {
            // work_variable contains a new field element, and we need to test that, for all previous vector elements,
            // result[i] / work_variable is not a member of our subgroup
            field_t work_inverse = work_variable.invert();
            bool valid = true;
            for (size_t j = 0; j < count; ++j) {
                field_t target_element = result[j] * work_inverse;
                field_t subgroup_check = target_element.pow(subgroup_size);
                if (subgroup_check == one) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                printf("adding ");
                print(work_variable);
                printf("at index %lu . \n expected = ", count);
                print(coset_generators[count]);
                result[count] = (work_variable);
                ++count;
            }
            work_variable = work_variable + one;
        }
    }

    __attribute__((always_inline)) inline static void serialize_to_buffer(const field_t& value, uint8_t* buffer)
    {
        field_t input = value.from_montgomery_form();
        for (size_t j = 0; j < 4; ++j) {
            for (size_t i = 0; i < 8; ++i) {
                uint8_t byte = static_cast<uint8_t>(input.data[3 - j] >> (56 - (i * 8)));
                buffer[j * 8 + i] = byte;
            }
        }
    }

    __attribute__((always_inline)) inline static field_t serialize_from_buffer(const uint8_t* buffer)
    {
        field_t result = zero;
        for (size_t j = 0; j < 4; ++j) {
            for (size_t i = 0; i < 8; ++i) {
                uint8_t byte = buffer[j * 8 + i];
                result.data[3 - j] = result.data[3 - j] | (static_cast<uint64_t>(byte) << (56 - (i * 8)));
            }
        }
        return (result.to_montgomery_form());
    }
}; // class field

} // namespace barretenberg

// #ifdef DISABLE_SHENANIGANS
// #include "field_impl_int128.tcc"
// #else
// #include "field_impl_asm.tcc"
// #endif
