#ifndef FQ2
#define FQ2

#include "fq.hpp"

namespace barretenberg
{
namespace fq2
{
constexpr fq2_t twist_coeff_b{
    {{0x3bf938e377b802a8, 0x020b1b273633535d, 0x26b7edf049755260, 0x2514c6324384a86d}},
    {{0x38e7ecccd1dcff67, 0x65f0b37d93ce0d3e, 0xd749d0dd22ac00aa, 0x0141b9ce4a688d4d}}};

inline void mul(const fq2_t &a, const fq2_t &b, fq2_t &r)
{
    fq::field_t t1;
    fq::field_t t2;
    fq::field_t t3;
    fq::field_t t4;

    // t1 = a.c0 * b.c0
    fq::__mul(a.c0, b.c0, t1);

    // t2 = a.c1 * b.c1
    fq::__mul(a.c1, b.c1, t2);

    // t3 = (a.c0 + a.c1)
    fq::__add(a.c0, a.c1, t3);

    // t4 = (b.c0 + b.c1)
    fq::__add(b.c0, b.c1, t4);

    // r.c0 = (a.c0 * b.c0) - (a.c1 * b.c1)
    fq::__sub(t1, t2, r.c0);

    // t.c1 = (a.c0 + a.c1)(b.c0 + b.c1) - (a.c0 * b.c0) - (a.c1 * b.c1)
    fq::__mul(t3, t4, r.c1);
    fq::__sub(r.c1, t1, r.c1);
    fq::__sub(r.c1, t2, r.c1);
}

inline void mul_by_fq(const fq::field_t &a, const fq2_t &b, fq2_t &r)
{
    fq::__mul(a, b.c0, r.c0);
    fq::__mul(a, b.c1, r.c1);
}

inline void sqr(const fq2_t &a, fq2_t &r)
{
    fq::field_t t1 = {{0, 0, 0, 0}};
    fq::field_t t2 = {{0, 0, 0, 0}};

    // t1 = a.c0 + a.c1
    fq::__add(a.c0, a.c1, t1);

    // t2 = a.c0 - a.c1
    fq::__sub(a.c0, a.c1, t2);

    // r.c1 = 2(a.c0 * a.c1)
    fq::__mul(a.c0, a.c1, r.c1);
    fq::__add(r.c1, r.c1, r.c1);

    // r.c0 = (a.c0 * a.c0) - (a.c1 * a.c1)
    fq::__mul(t1, t2, r.c0);
}

inline void add(const fq2_t &a, const fq2_t &b, fq2_t &r)
{
    fq::__add(a.c0, b.c0, r.c0);
    fq::__add(a.c1, b.c1, r.c1);
}

inline void sub(const fq2_t &a, const fq2_t &b, fq2_t &r)
{
    fq::__sub(a.c0, b.c0, r.c0);
    fq::__sub(a.c1, b.c1, r.c1);
}

inline void __neg(const fq2_t &a, fq2_t &r)
{
    fq::__neg(a.c0, r.c0);
    fq::__neg(a.c1, r.c1);
}

inline void invert(const fq2_t &a, fq2_t &r)
{
    fq::field_t t1;
    fq::field_t t2;
    fq::field_t t3;

    // t1 = a.c0*a.c0
    fq::__sqr(a.c0, t1);
    // t2 = a.c1*a.c1
    fq::__sqr(a.c1, t2);
    // t3 = (a.c0*a.c0 + a.c1*a.c1)
    fq::__add(t1, t2, t3);
    // t3 = 1 / (a.c0*a.c0 + a.c1*a.c1)
    fq::__invert(t3, t3);
    // c0 = a.c0 / (a.c0*a.c0 + a.c1*a.c1)
    fq::__mul(a.c0, t3, r.c0);
    // c1 = - a.c1 / (a.c0*a.c0 + a.c1*a.c1)
    fq::__mul(a.c1, t3, r.c1);
    fq::__neg(r.c1, r.c1);
}

inline void frobenius_map(const fq2_t &a, fq2_t &r)
{
    fq::copy(a.c0, r.c0);
    fq::__neg(a.c1, r.c1);
}

inline fq2_t one()
{
    fq2_t r;
    r.c0 = fq::one();
    r.c1 = fq::zero();
    return r;
}

inline fq2_t zero()
{
    fq2_t r;
    r.c0 = fq::zero();
    r.c1 = fq::zero();
    return r;
}

inline void __to_montgomery_form(const fq2_t &a, fq2_t &r)
{
    fq::__to_montgomery_form(a.c0, r.c0);
    fq::__to_montgomery_form(a.c1, r.c1);
}

inline void __from_montgomery_form(const fq2_t &a, fq2_t &r)
{
    fq::__from_montgomery_form(a.c0, r.c0);
    fq::__from_montgomery_form(a.c1, r.c1);
}

inline void copy(const fq2_t &a, fq2_t &r)
{
    fq::copy(a.c0, r.c0);
    fq::copy(a.c1, r.c1);
}

inline fq2_t random_element()
{
    fq2_t r;
    r.c0 = fq::random_element();
    r.c1 = fq::random_element();
    return r;
}

inline void print(const fq2_t &a)
{
    printf("fq2: \n");
    fq::print(a.c0);
    fq::print(a.c1);
}

inline bool iszero(const fq2_t &a)
{
    return (iszero(a.c0) && iszero(a.c1));
}

inline bool eq(const fq2_t &a, const fq2_t &b)
{
    return (fq::eq(a.c0, b.c0) && fq::eq(a.c1, b.c1));
}
} // namespace fq2
}

#endif