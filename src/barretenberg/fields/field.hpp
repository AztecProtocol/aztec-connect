#pragma once

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

    static constexpr field_t modulus = field_t::modulus;
    static constexpr field_t zero = field_t::zero;
    static constexpr field_t one = field_t::one;
    static constexpr field_t neg_one = field_t::neg_one;
    static constexpr field_t two_inv = field_t::two_inv;
    static constexpr field_t beta = field_t::beta;
    static constexpr field_t multiplicative_generator = field_t::multiplicative_generator;
    static constexpr field_t coset_generators[15] = {
        field_t::coset_generators[0],  field_t::coset_generators[1],  field_t::coset_generators[2],
        field_t::coset_generators[3],  field_t::coset_generators[4],  field_t::coset_generators[5],
        field_t::coset_generators[6],  field_t::coset_generators[7],  field_t::coset_generators[8],
        field_t::coset_generators[9],  field_t::coset_generators[10], field_t::coset_generators[11],
        field_t::coset_generators[12], field_t::coset_generators[13], field_t::coset_generators[14],
    };
    static constexpr field_t multiplicative_generator_inverse = field_t::multiplicative_generator_inverse;
    static constexpr field_t root_of_unity = field_t::root_of_unity;
    // struct field_t : public test::field<FieldParams> {
    //     bool operator<(const field_t& other) const { return gt(other, *this); }
    // };
    // struct field_t {
    //     alignas(32) uint64_t data[4];

    //     // constexpr field_t()
    //     //     : data()
    //     // {}
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

    static void batch_invert(field_t* coeffs, size_t n)
    {
        field_t* temporaries = new field_t[n];
        field_t accumulator = field_t::one;
        for (size_t i = 0; i < n; ++i) {
            temporaries[i] = accumulator;
            accumulator = accumulator * coeffs[i];
        }

        accumulator = accumulator.invert();

        field_t T0;
        for (size_t i = n - 1; i < n; --i) {
            T0 = accumulator * temporaries[i];
            accumulator = accumulator * coeffs[i];
            coeffs[i] = T0;
        }
        delete[] temporaries;
    }

}; // class field

} // namespace barretenberg

// #ifdef DISABLE_SHENANIGANS
// #include "field_impl_int128.tcc"
// #else
// #include "field_impl_asm.tcc"
// #endif
