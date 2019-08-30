#pragma once

#include "types.hpp"
#include "fq2.hpp"

namespace fq6
{
    // non residue = 9 + i \in Fq2
    // const fq::field_t non_residue = { .data = { 0, 0, 0, 0 } };
    inline void mul_by_non_residue(const fq2::fq2_t& a, fq2::fq2_t& r)
    {
        // non residue = 9 + i \in Fq2
        // r.c0 = 9a0 - a1
        // r.c1 = 9a1 + a0
        fq::field_t T0;
        fq::field_t T1;
        fq::field_t T2;
        
        fq::add(a.c0, a.c0, T0); // T0 = 2a.c0
        fq::add(T0, T0, T0);     // T0 = 4a.c0
        fq::add(T0, T0, T0);     // T0 = 8a.c0
        fq::add(T0, a.c0, T0);   // T0 = 9a.c0

        fq::add(a.c1, a.c1, T1); // T1 = 2a.c1
        fq::add(T1, T1, T1);     // T1 = 4a.c1
        fq::add(T1, T1, T1);     // T1 = 8a.c1
        fq::add(T1, a.c1, T1);   // T1 = 9a.c1

        fq::sub(T0, a.c1, T2);   // T2 = 9a.c0 - a.c1
        fq::add(T1, a.c0, r.c1); // r.c1 = 9a.c1 + a.c0
        fq::copy(T2, r.c0);      // r.c0 = T2
    }

    inline void add(const fq6_t& a, const fq6_t& b, fq6_t& r)
    {
        fq2::add(a.c0, b.c0, r.c0);
        fq2::add(a.c1, b.c1, r.c1);
        fq2::add(a.c2, b.c2, r.c2);
    }

    inline void sub(const fq6_t& a, const fq6_t& b, fq6_t& r)
    {
        fq2::sub(a.c0, b.c0, r.c0);
        fq2::sub(a.c1, b.c1, r.c1);
        fq2::sub(a.c2, b.c2, r.c2);   
    }

    inline void mul(const fq6_t& a, const fq6_t& b, fq6_t& r)
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

    inline void sqr(const fq6_t& a, fq6_t& r)
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

    inline void invert(const fq6_t& a, fq6_t& r)
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
}