#ifndef FQ6
#define FQ6

#include "fq2.hpp"

namespace barretenberg
{
namespace fq6
{
constexpr fq2::fq2_t frobenius_coeffs_c1_one = {
    .c0 = {.data = {0xb5773b104563ab30, 0x347f91c8a9aa6454, 0x7a007127242e0991, 0x1956bcd8118214ec}},
    .c1 = {.data = {0x6e849f1ea0aa4757, 0xaa1c7b6d89f89141, 0xb6e713cdfae0ca3a, 0x26694fbb4e82ebc3}}};

constexpr fq2::fq2_t frobenius_coeffs_c1_two = {
    .c0 = {.data = {0x3350c88e13e80b9c, 0x7dce557cdb5e56b9, 0x6001b4b8b615564a, 0x2682e617020217e0}},
    .c1 = {.data = {0, 0, 0, 0}}};

constexpr fq2::fq2_t frobenius_coeffs_c1_three = {
    .c0 = {.data = {0xc9af22f716ad6bad, 0xb311782a4aa662b2, 0x19eeaf64e248c7f4, 0x20273e77e3439f82}},
    .c1 = {.data = {0xacc02860f7ce93ac, 0x3933d5817ba76b4c, 0x69e6188b446c8467, 0x0a46036d4417cc55}}};

constexpr fq2::fq2_t frobenius_coeffs_c2_one = {
    .c0 = {.data = {0x7361d77f843abe92, 0xa5bb2bd3273411fb, 0x9c941f314b3e2399, 0x15df9cddbb9fd3ec}},
    .c1 = {.data = {0x5dddfd154bd8c949, 0x62cb29a5a4445b60, 0x37bc870a0c7dd2b9, 0x24830a9d3171f0fd}}};

constexpr fq2::fq2_t frobenius_coeffs_c2_two = {
    .c0 = {.data = {0x71930c11d782e155, 0xa6bb947cffbe3323, 0xaa303344d4741444, 0x2c3b3f0d26594943}},
    .c1 = {.data = {0, 0, 0, 0}}};

constexpr fq2::fq2_t frobenius_coeffs_c2_three = {
    .c0 = {.data = {0x448a93a57b6762df, 0xbfd62df528fdeadf, 0xd858f5d00e9bd47a, 0x06b03d4d3476ec58}},
    .c1 = {.data = {0x2b19daf4bcc936d1, 0xa1a54e7a56f4299f, 0xb533eee05adeaef1, 0x170c812b84dda0b2}}};

// non residue = 9 + i \in Fq2
// const fq::field_t non_residue = { .data = { 0, 0, 0, 0 } };
inline void mul_by_non_residue(const fq2::fq2_t &a, fq2::fq2_t &r)
{
    // non residue = 9 + i \in Fq2
    // r.c0 = 9a0 - a1
    // r.c1 = 9a1 + a0
    fq::field_t T0;
    fq::field_t T1;
    fq::field_t T2;

    fq::__add(a.c0, a.c0, T0); // T0 = 2a.c0
    fq::__add(T0, T0, T0);     // T0 = 4a.c0
    fq::__add(T0, T0, T0);     // T0 = 8a.c0
    fq::__add(T0, a.c0, T0);   // T0 = 9a.c0

    fq::__add(a.c1, a.c1, T1); // T1 = 2a.c1
    fq::__add(T1, T1, T1);     // T1 = 4a.c1
    fq::__add(T1, T1, T1);     // T1 = 8a.c1
    fq::__add(T1, a.c1, T1);   // T1 = 9a.c1

    fq::__sub(T0, a.c1, T2);   // T2 = 9a.c0 - a.c1
    fq::__add(T1, a.c0, r.c1); // r.c1 = 9a.c1 + a.c0
    fq::copy(T2, r.c0);      // r.c0 = T2
}

inline void add(const fq6_t &a, const fq6_t &b, fq6_t &r)
{
    fq2::add(a.c0, b.c0, r.c0);
    fq2::add(a.c1, b.c1, r.c1);
    fq2::add(a.c2, b.c2, r.c2);
}

inline void sub(const fq6_t &a, const fq6_t &b, fq6_t &r)
{
    fq2::sub(a.c0, b.c0, r.c0);
    fq2::sub(a.c1, b.c1, r.c1);
    fq2::sub(a.c2, b.c2, r.c2);
}

inline void neg(const fq6_t &a, fq6_t &r)
{
    fq2::neg(a.c0, r.c0);
    fq2::neg(a.c1, r.c1);
    fq2::neg(a.c2, r.c2);
}

inline void mul(const fq6_t &a, const fq6_t &b, fq6_t &r)
{
    /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4 (Karatsuba) */
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::fq2_t T2;
    fq2::fq2_t T3;
    fq2::fq2_t T4;
    fq2::fq2_t T5;
    fq2::fq2_t T6;

    // T0 = a.c0*b.c0
    fq2::mul(a.c0, b.c0, T0);

    // T1 = a.c1*b.c1
    fq2::mul(a.c1, b.c1, T1);

    // T2 = a.c2*b.c2
    fq2::mul(a.c2, b.c2, T2);

    // T3 = (a.c0 + a.c2)
    fq2::add(a.c0, a.c2, T3);

    // T4 = (b.c0 + b.c2)
    fq2::add(b.c0, b.c2, T4);

    // T3 = (a.c0 + a.c2)(b.c0 + b.c2)
    fq2::mul(T3, T4, T3);

    // T4 = (a.c0 + a.c1)
    fq2::add(a.c0, a.c1, T4);

    // T5 = (b.c0 + b.c1)
    fq2::add(b.c0, b.c1, T5);

    // T4 = (a.c0 + a.c1)(b.c0 + b.c1);
    fq2::mul(T4, T5, T4);

    // T5 = (a.c1 + a.c2)
    fq2::add(a.c1, a.c2, T5);

    // T6 = (b.c1 + b.c2)
    fq2::add(b.c1, b.c2, T6);

    // T5 = (a.c1 + a.c2)(b.c1 + b.c2)
    fq2::mul(T5, T6, T5);

    // T6 = (T1 + T2)
    fq2::add(T1, T2, T6);

    // T5 = T5 - (T1 + T2)
    fq2::sub(T5, T6, T5);

    // T5 = non_residue * T5
    fq6::mul_by_non_residue(T5, T5);

    // r.c0 = (a.c0*b.c0 + \beta(a.c1*b.c2 + a.c2*b.c1))
    fq2::add(T0, T5, r.c0);

    // T5 = (T0 + T1)
    fq2::add(T0, T1, T5);

    // T4 = T4 - T5
    fq2::sub(T4, T5, T4);

    // r.c1 = non_residue * T2
    fq6::mul_by_non_residue(T2, r.c1);

    // r.c1 = T4 + non_residue * T2
    fq2::add(r.c1, T4, r.c1);

    // T4 = (T0 + T2)
    fq2::add(T0, T2, T4);

    // T4 = T4 - T1
    fq2::sub(T4, T1, T4);

    // r.c2 = T3 - T4
    fq2::sub(T3, T4, r.c2);
}

inline void sqr(const fq6_t &a, fq6_t &r)
{
    /* Devegili OhEig Scott Dahab --- Multiplication and Squaring on Pairing-Friendly Fields.pdf; Section 4 (CH-SQR2) */
    fq2::fq2_t S0;
    fq2::fq2_t S1;
    fq2::fq2_t S2;
    fq2::fq2_t S3;
    fq2::fq2_t S4;
    fq2::fq2_t AB;
    fq2::fq2_t BC;

    // S0 = a.c0*a.c0
    fq2::sqr(a.c0, S0);

    // AB = a.c0*a.c1
    fq2::mul(a.c0, a.c1, AB);

    // S1 = 2AB
    fq2::add(AB, AB, S1);

    // S2 = a.c0 + a.c2
    fq2::add(a.c0, a.c2, S2);

    // S2 = a.c0 + a.c2 - a.c1
    fq2::sub(S2, a.c1, S2);

    // S2 = S2*S2
    fq2::sqr(S2, S2);

    // BC = a.c1*a.c2
    fq2::mul(a.c1, a.c2, BC);

    // S3 = 2BC
    fq2::add(BC, BC, S3);

    // S4 = a.c2*a.c2
    fq2::sqr(a.c2, S4);

    // r.c0 = non_residue * s3
    fq6::mul_by_non_residue(S3, r.c0);

    // r.c0 = r.c0 + s0
    fq2::add(r.c0, S0, r.c0);

    // r.c1 = non_residue * S4
    fq6::mul_by_non_residue(S4, r.c1);

    // r.c1 = r.c1 + S1
    fq2::add(r.c1, S1, r.c1);

    // r.c2 = s1 + s2 + s3 - s0 - s4
    fq2::add(S1, S2, r.c2);
    fq2::add(r.c2, S3, r.c2);
    fq2::sub(r.c2, S0, r.c2);
    fq2::sub(r.c2, S4, r.c2);
}

inline void invert(const fq6_t &a, fq6_t &r)
{
    /* From "High-Speed Software Implementation of the Optimal Ate Pairing over Barreto-Naehrig Curves"; Algorithm 17 */
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::fq2_t T2;
    fq2::fq2_t T3;
    fq2::fq2_t T4;
    fq2::fq2_t T5;
    fq2::fq2_t C0;
    fq2::fq2_t C1;
    fq2::fq2_t C2;

    // T0 = a.c0*a.c0
    fq2::sqr(a.c0, T0);

    // T1 = a.c1*a.c1
    fq2::sqr(a.c1, T1);

    // T2 = a.c2*a.c2
    fq2::sqr(a.c2, T2);

    // T3 = a.c0*a.c1
    fq2::mul(a.c0, a.c1, T3);

    // T4 = a.c0*a.c2
    fq2::mul(a.c0, a.c2, T4);

    // T5 = a.c1*a.c2
    fq2::mul(a.c1, a.c2, T5);

    // C0 = \beta(a.c1*a.c2)
    fq6::mul_by_non_residue(T5, C0);

    // C0 = a.c0*a.c0 - \beta(a.c1*a.c2)
    fq2::sub(T0, C0, C0);

    // C1 = \beta(a.c2*a.c2)
    fq6::mul_by_non_residue(T2, C1);

    // C1 = \beta(a.c2*a.c2) - a.c0*a.c1
    fq2::sub(C1, T3, C1);

    // C2 = a.c1*a.c1 - a.c0*a.c2
    fq2::sub(T1, T4, C2);

    // T0 = a.c2 * (\beta(a.c2*a.c2) - a.c0*a.c1)
    fq2::mul(a.c2, C1, T0);

    // T1 = a.c1 * (a.c1*a.c1 - a.c0*a.c2)
    fq2::mul(a.c1, C2, T1);

    // T0 = \beta(T0 + T1)
    fq2::add(T0, T1, T0);
    fq6::mul_by_non_residue(T0, T0);

    // T1 = a.c0 * C0
    fq2::mul(a.c0, C0, T1);

    // T0 = T0 + T1
    fq2::add(T0, T1, T0);

    // T0 = T0^{-1}
    fq2::invert(T0, T0);

    // r.c0 = T0 * C0
    fq2::mul(T0, C0, r.c0);

    // r.c1 = T0 * C1
    fq2::mul(T0, C1, r.c1);

    // r.c2 = T0 * C2
    fq2::mul(T0, C2, r.c2);
}

inline void mul_by_fq2(const fq2::fq2_t &a, const fq6_t &b, fq6_t &r)
{
    fq2::mul(a, b.c0, r.c0);
    fq2::mul(a, b.c1, r.c1);
    fq2::mul(a, b.c2, r.c2);
}

inline void frobenius_map_three(const fq6_t &a, fq6_t &r)
{
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::frobenius_map(a.c1, T0);
    fq2::frobenius_map(a.c2, T1);
    fq2::frobenius_map(a.c0, r.c0);
    fq2::mul(frobenius_coeffs_c1_three, T0, r.c1);
    fq2::mul(frobenius_coeffs_c2_three, T1, r.c2);
}

inline void frobenius_map_two(const fq6_t &a, fq6_t &r)
{
    fq2::copy(a.c0, r.c0);
    fq2::mul(frobenius_coeffs_c1_two, a.c1, r.c1);
    fq2::mul(frobenius_coeffs_c2_two, a.c2, r.c2);
}

inline void frobenius_map_one(const fq6_t &a, fq6_t &r)
{
    fq2::fq2_t T0;
    fq2::fq2_t T1;
    fq2::frobenius_map(a.c1, T0);
    fq2::frobenius_map(a.c2, T1);
    fq2::frobenius_map(a.c0, r.c0);
    fq2::mul(frobenius_coeffs_c1_one, T0, r.c1);
    fq2::mul(frobenius_coeffs_c2_one, T1, r.c2);
}

inline fq6_t random_element()
{
    fq6_t r;
    r.c0 = fq2::random_element();
    r.c1 = fq2::random_element();
    r.c2 = fq2::random_element();
    return r;
}

inline fq6_t one()
{
    fq6_t r;
    r.c0 = fq2::one();
    r.c1 = fq2::zero();
    r.c2 = fq2::zero();
    return r;
}

inline fq6_t zero()
{
    fq6_t r;
    r.c0 = fq2::zero();
    r.c1 = fq2::zero();
    r.c2 = fq2::zero();
    return r;
}

inline void to_montgomery_form(const fq6_t &a, fq6_t &r)
{
    fq2::to_montgomery_form(a.c0, r.c0);
    fq2::to_montgomery_form(a.c1, r.c1);
    fq2::to_montgomery_form(a.c2, r.c2);
}

inline void from_montgomery_form(const fq6_t &a, fq6_t &r)
{
    fq2::from_montgomery_form(a.c0, r.c0);
    fq2::from_montgomery_form(a.c1, r.c1);
    fq2::from_montgomery_form(a.c2, r.c2);
}

inline void copy(const fq6_t &a, fq6_t &r)
{
    fq2::copy(a.c0, r.c0);
    fq2::copy(a.c1, r.c1);
    fq2::copy(a.c2, r.c2);
}

inline void print(const fq6_t &a)
{
    printf("fq6:\n");
    printf("c0:\n");
    fq2::print(a.c0);
    printf("c1: \n");
    fq2::print(a.c1);
    printf("c2: \n");
    fq2::print(a.c2);
}

inline bool iszero(const fq6_t &a)
{
    return (iszero(a.c0) && iszero(a.c1) && iszero(a.c2));
}

inline bool eq(const fq6_t &a, const fq6_t &b)
{
    return (fq2::eq(a.c0, b.c0) && fq2::eq(a.c1, b.c1) && fq2::eq(a.c2, b.c2));
}
} // namespace fq6
} // namespace barretenberg

#endif