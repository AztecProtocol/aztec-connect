#pragma once

#include "new_field2.hpp"
// #include "fq.hpp"

namespace barretenberg {
template <typename base_field, typename Fq2Params> class field2 {
  public:
    typedef test::field2<base_field, Fq2Params> field_t;
    // struct field_t
    // {
    //     typename base_field::field_t c0;
    //     typename base_field::field_t c1;
    // };

    static constexpr field_t zero{ base_field::zero, base_field::zero };
    static constexpr field_t one{ base_field::one, base_field::zero };
    static constexpr field_t twist_coeff_b{ Fq2Params::twist_coeff_b_0, Fq2Params::twist_coeff_b_1 };
    static constexpr field_t twist_mul_by_q_x{ Fq2Params::twist_mul_by_q_x_0, Fq2Params::twist_mul_by_q_x_1 };
    static constexpr field_t twist_mul_by_q_y{ Fq2Params::twist_mul_by_q_y_0, Fq2Params::twist_mul_by_q_y_1 };
    static constexpr field_t twist_cube_root{ Fq2Params::twist_cube_root_0, Fq2Params::twist_cube_root_1 };

    static inline void __mul(const field_t& a, const field_t& b, field_t& r) { r = a * b; }

    static inline void __mul_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) { r = a * b; }

    static inline void __mul_by_fq(const typename base_field::field_t& a, const field_t& b, field_t& r)
    {
        r.c0 = a * b.c0;
        r.c1 = a * b.c1;
    }

    static inline void __sqr(const field_t& a, field_t& r) { r = a.sqr(); }

    static inline void __sqr_with_coarse_reduction(const field_t& a, field_t& r) { r = a.sqr(); }

    static inline void __add(const field_t& a, const field_t& b, field_t& r) { r = a + b; }

    static inline void __add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) { r = a + b; }

    static inline void __add_without_reduction(const field_t& a, const field_t& b, field_t& r) { r = a + b; }

    static inline void __quad_with_coarse_reduction(const field_t& a, field_t& r) { r = a + a + a + a; }

    static inline void __oct_with_coarse_reduction(const field_t& a, field_t& r) { r = a + a + a + a + a + a + a + a; }

    static inline void __paralell_double_and_add_without_reduction(field_t& x_0,
                                                                   const field_t& y_0,
                                                                   const field_t& y_1,
                                                                   field_t& r)
    {
        x_0 = x_0 + x_0;
        r = y_0 + y_1;
    }

    static inline void reduce_once(const field_t& a, field_t& r) { r = a; }

    static inline void __sub(const field_t& a, const field_t& b, field_t& r) { r = a - b; }

    static inline void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r) { r = a - b; }

    static inline void __neg(const field_t& a, field_t& r) { r = -a; }

    static inline void __invert(const field_t& a, field_t& r) { r = a.invert(); }

    static inline void frobenius_map(const field_t& a, field_t& r)
    {
        r.c0 = a.c0;
        r.c1 = -a.c1;
    }

    static inline void __to_montgomery_form(const field_t& a, field_t& r) { r = a.to_montgomery_form(); }

    static inline void __from_montgomery_form(const field_t& a, field_t& r) { r = a.from_montgomery_form(); }

    static inline void __copy(const field_t& a, field_t& r) { r = a; }

    static inline field_t random_element()
    {
        field_t r;
        r.c0 = base_field::field_t::random_element();
        r.c1 = base_field::field_t::random_element();
        return r;
    }

    static inline bool is_zero(const field_t& a) { return (a.c0.is_zero() && a.c1.is_zero()); }

    static inline bool eq(const field_t& a, const field_t& b) { return ((a.c0 == b.c0) && (a.c1 == b.c1)); }

    static inline bool is_msb_set(const field_t& a) { return (a.c0.data[3] >> 63ULL) == 1ULL; }
    static inline uint64_t is_msb_set_word(const field_t& a) { return a.c0.data[3] >> 63ULL; }
    static inline void __set_msb(field_t& a) { a.c0.data[3] = 0ULL | (1ULL << 63ULL); }

    static inline void serialize_to_buffer(const field_t& value, uint8_t* buffer)
    {
        base_field::field_t::serialize_to_buffer(value.c0, buffer);
        base_field::field_t::serialize_to_buffer(value.c1, buffer + sizeof(typename base_field::field_t));
    }

    static inline field_t serialize_from_buffer(uint8_t* buffer)
    {
        field_t result = zero;
        result.c0 = base_field::field_t::serialize_from_buffer(buffer);
        result.c1 = base_field::field_t::serialize_from_buffer(buffer + sizeof(typename base_field::field_t));

        return result;
    }
};
} // namespace barretenberg
