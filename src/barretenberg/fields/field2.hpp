#pragma once

#include "new_field2.hpp"
// #include "fq.hpp"

namespace barretenberg
{
template <typename base_field, typename Fq2Params> class field2
{
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

    static inline void __mul(const field_t& a, const field_t& b, field_t& r)
    {
        typename base_field::field_t t1;
        typename base_field::field_t t2;
        typename base_field::field_t t3;
        typename base_field::field_t t4;

        // t1 = a.c0 * b.c0
        base_field::__mul(a.c0, b.c0, t1);

        // t2 = a.c1 * b.c1
        base_field::__mul(a.c1, b.c1, t2);

        // t3 = (a.c0 + a.c1)
        base_field::__add(a.c0, a.c1, t3);

        // t4 = (b.c0 + b.c1)
        base_field::__add(b.c0, b.c1, t4);

        // r.c0 = (a.c0 * b.c0) - (a.c1 * b.c1)
        base_field::__sub(t1, t2, r.c0);

        // t.c1 = (a.c0 + a.c1)(b.c0 + b.c1) - (a.c0 * b.c0) - (a.c1 * b.c1)
        base_field::__mul(t3, t4, r.c1);
        base_field::__sub(r.c1, t1, r.c1);
        base_field::__sub(r.c1, t2, r.c1);
    }

    static inline void __mul_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
    {
        __mul(a, b, r);
    }

    static inline void __mul_by_fq(const typename base_field::field_t& a, const field_t& b, field_t& r)
    {
        base_field::__mul(a, b.c0, r.c0);
        base_field::__mul(a, b.c1, r.c1);
    }

    static inline void __sqr(const field_t& a, field_t& r)
    {
        typename base_field::field_t t1 = { { 0, 0, 0, 0 } };
        typename base_field::field_t t2 = { { 0, 0, 0, 0 } };

        // t1 = a.c0 + a.c1
        base_field::__add(a.c0, a.c1, t1);

        // t2 = a.c0 - a.c1
        base_field::__sub(a.c0, a.c1, t2);

        // r.c1 = 2(a.c0 * a.c1)
        base_field::__mul(a.c0, a.c1, r.c1);
        base_field::__add(r.c1, r.c1, r.c1);

        // r.c0 = (a.c0 * a.c0) - (a.c1 * a.c1)
        base_field::__mul(t1, t2, r.c0);
    }

    static inline void __sqr_with_coarse_reduction(const field_t& a, field_t& r)
    {
        __sqr(a, r);
    }

    static inline void __add(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__add(a.c0, b.c0, r.c0);
        base_field::__add(a.c1, b.c1, r.c1);
    }

    static inline void __add_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
    {
        __add(a, b, r);
    }

    static inline void __add_without_reduction(const field_t& a, const field_t& b, field_t& r)
    {
        __add(a, b, r);
    }

    static inline void __quad_with_coarse_reduction(const field_t& a, field_t& r)
    {
        __add(a, a, r);
        __add(r, r, r);
    }

    static inline void __oct_with_coarse_reduction(const field_t& a, field_t& r)
    {
        __add(a, a, r);
        __add(r, r, r);
        __add(r, r, r);
    }

    static inline void __paralell_double_and_add_without_reduction(field_t& x_0,
                                                                   const field_t& y_0,
                                                                   const field_t& y_1,
                                                                   field_t& r)
    {
        __add(x_0, x_0, x_0);
        __add(y_0, y_1, r);
    }

    static inline void reduce_once(const field_t& a, field_t& r)
    {
        __copy(a, r);
    }

    static inline void __sub(const field_t& a, const field_t& b, field_t& r)
    {
        base_field::__sub(a.c0, b.c0, r.c0);
        base_field::__sub(a.c1, b.c1, r.c1);
    }

    static inline void __sub_with_coarse_reduction(const field_t& a, const field_t& b, field_t& r)
    {
        __sub(a, b, r);
    }

    static inline void __neg(const field_t& a, field_t& r)
    {
        base_field::__neg(a.c0, r.c0);
        base_field::__neg(a.c1, r.c1);
    }

    static inline void __invert(const field_t& a, field_t& r)
    {
        typename base_field::field_t t1;
        typename base_field::field_t t2;
        typename base_field::field_t t3;

        // t1 = a.c0*a.c0
        base_field::__sqr(a.c0, t1);
        // t2 = a.c1*a.c1
        base_field::__sqr(a.c1, t2);
        // t3 = (a.c0*a.c0 + a.c1*a.c1)
        base_field::__add(t1, t2, t3);
        // t3 = 1 / (a.c0*a.c0 + a.c1*a.c1)
        base_field::__invert(t3, t3);
        // c0 = a.c0 / (a.c0*a.c0 + a.c1*a.c1)
        base_field::__mul(a.c0, t3, r.c0);
        // c1 = - a.c1 / (a.c0*a.c0 + a.c1*a.c1)
        base_field::__mul(a.c1, t3, r.c1);
        base_field::__neg(r.c1, r.c1);
    }

    static inline void frobenius_map(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__neg(a.c1, r.c1);
    }

    static inline void __to_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__to_montgomery_form(a.c0, r.c0);
        base_field::__to_montgomery_form(a.c1, r.c1);
    }

    static inline void __from_montgomery_form(const field_t& a, field_t& r)
    {
        base_field::__from_montgomery_form(a.c0, r.c0);
        base_field::__from_montgomery_form(a.c1, r.c1);
    }

    static inline void __copy(const field_t& a, field_t& r)
    {
        base_field::__copy(a.c0, r.c0);
        base_field::__copy(a.c1, r.c1);
    }

    static inline field_t random_element()
    {
        field_t r;
        r.c0 = base_field::random_element();
        r.c1 = base_field::random_element();
        return r;
    }

    static inline void print(const field_t& a)
    {
        printf("fq2: \n");
        base_field::print(a.c0);
        base_field::print(a.c1);
    }

    static inline bool is_zero(const field_t& a)
    {
        return (base_field::is_zero(a.c0) && base_field::is_zero(a.c1));
    }

    static inline bool eq(const field_t& a, const field_t& b)
    {
        return (base_field::eq(a.c0, b.c0) && base_field::eq(a.c1, b.c1));
    }

    static inline bool is_msb_set(const field_t& a)
    {
        return (a.c0.data[3] >> 63ULL) == 1ULL;
    }
    static inline uint64_t is_msb_set_word(const field_t& a)
    {
        return a.c0.data[3] >> 63ULL;
    }
    static inline void __set_msb(field_t& a)
    {
        a.c0.data[3] = 0ULL | (1ULL << 63ULL);
    }

    static inline void serialize_to_buffer(const field_t& value, uint8_t* buffer)
    {
        base_field::serialize_to_buffer(value.c0, buffer);
        base_field::serialize_to_buffer(value.c1, buffer + sizeof(typename base_field::field_t));
    }
    
    static inline field_t serialize_from_buffer(uint8_t* buffer)
    {
        field_t result = zero;
        result.c0 = base_field::serialize_from_buffer(buffer);
        result.c1 = base_field::serialize_from_buffer(buffer + sizeof(typename base_field::field_t));

        return result;
    }
};
} // namespace barretenberg
