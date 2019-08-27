#pragma once

#include "fq.hpp"

namespace fq2
{
    inline void mul(const fq2_t& a, const fq2_t& b, fq2_t &r)
    {
        fq::field_t t1;
        fq::field_t t2;
        fq::field_t t3;
        fq::field_t t4;

        // t1 = a.c0 * b.c0
        fq::mul(a.c0, b.c0, t1);

        // t2 = a.c1 * b.c1
        fq::mul(a.c1, b.c1, t2);

        // r.c0 = (a.c0 * b.c0) - (a.c1 * b.c1)
        fq::sub(t1, t2, r.c0);

        // t3 = (a.c0 + a.c1)
        fq::add(a.c0, a.c1, t3);

        // t4 = (b.c0 + b.c1)
        fq::add(b.c0, b.c1, t4);

        // t.c1 = (a.c0 + a.c1)(b.c0 + b.c1) - (a.c0 * b.c0) - (a.c1 * b.c1)
        fq::mul(t3, t4, r.c1);
        fq::sub(r.c1, t1, r.c1);
        fq::sub(r.c1, t2, r.c1);
    }

    inline void sqr(const fq2_t& a, fq2_t& r)
    {
        fq::field_t t1;
        fq::field_t t2;

        // t1 = a.c0 + a.c1
        fq::add(a.c0, a.c1, t1);

        // t2 = a.c0 - a.c1
        fq::sub(a.c0, a.c1, t2);
    
        // r.c1 = 2(a.c0 * a.c1)
        fq::mul(a.c0, a.c1, r.c1);
        fq::add(r.c1, r.c1, r.c1);

        // r.c0 = (a.c0 * a.c0) - (a.c1 * a.c1)
        fq::mul(t1, t2, r.c0);
    }

    inline void add(const fq2_t& a, const fq2_t& b, fq2_t& r)
    {
        fq::add(a.c0, b.c0, r.c0);
        fq::add(a.c1, b.c1, r.c1);
    }

    inline void sub(const fq2_t& a, const fq2_t& b, fq2_t& r)
    {
        fq::sub(a.c0, b.c0, r.c0);
        fq::sub(a.c1, b.c1, r.c1);
    }

    inline void neg(const fq2_t& a, fq2_t& r)
    {
        fq::neg(a.c0, r.c0);
        fq::neg(a.c1, r.c1);
    }

    inline void invert(const fq2_t& a, fq2_t& r)
    {
        fq::field_t t1;
        fq::field_t t2;
        fq::field_t t3;
        
        // t1 = a.c0*a.c0
        fq::sqr(a.c0, t1);
        // t2 = a.c1*a.c1
        fq::sqr(a.c1, t2);
        // t3 = (a.c0*a.c0 + a.c1*a.c1)
        fq::add(t1, t2, t3);
        // t3 = 1 / (a.c0*a.c0 + a.c1*a.c1)
        fq::invert(t3, t3);
        // c0 = a.c0 / (a.c0*a.c0 + a.c1*a.c1)
        fq::mul(a.c0, t3, r.c0);
        // c1 = - a.c1 / (a.c0*a.c0 + a.c1*a.c1)
        fq::mul(a.c1, t3, r.c1);
        fq::neg(r.c1, r.c1);
    }

    inline void one(fq2_t& r)
    {
        fq::one(r.c0);
        fq::zero(r.c1);
    }

    inline void zero(fq2_t& r)
    {
        fq::zero(r.c0);
        fq::zero(r.c1);
    }

    inline void copy(const fq2_t& a, fq2_t& r)
    {
        fq::copy(a.c0, r.c0);
        fq::copy(a.c1, r.c1);
    }

    inline void print(fq2_t& a)
    {
        printf("fq2: \n");
        fq::print(a.c0);
        fq::print(a.c1);
    }
}