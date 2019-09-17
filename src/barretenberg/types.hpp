#pragma once

#include "stdint.h"
#include "stddef.h"

#if 0
#define NO_MULTITHREADING 1
#endif

namespace fq
{
    struct field_t
    {
        alignas(32) uint64_t data[4];
    };
}

namespace fr
{
    struct field_t
    {
        alignas(32) uint64_t data[4];
    };

    struct field_wide_t
    {
        alignas(64) uint64_t data[8];
    };
}

namespace fq2
{
    struct fq2_t
    {
        fq::field_t c0;
        fq::field_t c1;
    };
}

namespace fq6
{
    struct fq6_t
    {
        fq2::fq2_t c0;
        fq2::fq2_t c1;
        fq2::fq2_t c2;
    };
}

namespace fq12
{
    struct fq12_t
    {
        fq6::fq6_t c0;
        fq6::fq6_t c1;
    };
}

namespace pairing
{
    struct ell_coeffs
    {
        fq2::fq2_t o;
        fq2::fq2_t vw;
        fq2::fq2_t vv;
    };
}

namespace g1
{
    struct affine_element
    {
        fq::field_t x;
        fq::field_t y;
    };

    struct element
    {
        fq::field_t x;
        fq::field_t y;
        fq::field_t z;
    };
}

namespace g2
{
    struct affine_element
    {
        fq2::fq2_t x;
        fq2::fq2_t y;
    };

    struct element
    {
        fq2::fq2_t x;
        fq2::fq2_t y;
        fq2::fq2_t z;
    };
}

namespace polynomials
{
    struct polynomial
    {
        fr::field_t* coeffs;
        size_t size;
    };
}

namespace srs
{
    struct plonk_srs
    {
        g1::affine_element *monomials;
        g2::affine_element t2;
        size_t degree;
    };
}