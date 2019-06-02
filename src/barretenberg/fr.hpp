#pragma once

#include <stdint.h>

#include "types.hpp"

namespace fr
{
    // compute a * b, put result in r
    void mul(uint64_t* a, uint64_t* b, uint64_t* r);

    // compute a * a, put result in r
    void sqr(uint64_t* a, uint64_t* r);

    // compute a + b, put result in r
    void add(uint64_t* a, uint64_t* b, uint64_t* r);

    // compute a - b, put result in r
    void sub(uint64_t* a, uint64_t* b, uint64_t* r);

    // negate r
    // void neg(uint64_t* a);

    // invert a, put result in r
    // void invert(uint64_t* a, uint64_t* r);
    void normalize(uint64_t* a, uint64_t* b);
    
    // convert r into montgomery form
    void to_montgomery_form(uint64_t* a, uint64_t* r);

    // convert r from montgomery form
    void from_montgomery_form(uint64_t* a, uint64_t* r);

    void random_element(uint64_t* r);

    void one(uint64_t* r);

    void split_into_endomorphism_scalars(uint64_t* k, uint64_t* k1, uint64_t* k2);

    void print(uint64_t* a);

    void mul_lambda(uint64_t* a, uint64_t* r);
}