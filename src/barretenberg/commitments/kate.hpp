#pragma once


#include "stdint.h"

#include "../groups/scalar_multiplication.hpp"
#include "../types.hpp"

namespace kate
{
    void compute_polynomial_commitments(polynomials::polynomial* polys, size_t num_polys, const srs::plonk_srs& srs)
    {
        size_t gcd = 0;
        for (size_t i = 0; i < num_polys; ++i)
        {

        }
    }

    fr::field_t compute_opening_coefficients(polynomials::polynomial& poly, const fr::field_t& z)
    {
        // if `coeffs` represents F(X), we want to compute W(X)
        // where W(X) = F(X) - F(z) / (X - z)
        // i.e. divide by the degree-1 polynomial [-z, 1]

        // We assume that the commitment is well-formed and that there is no remainder term.
        // Under these conditions we can perform this polynomial division in linear time with good constants

        // compute (1 / -z)
        fr::field_t divisor;
        fr::neg(z, divisor);
        fr::invert(divisor, divisor);

        fr::mul(poly.coeffs[0], divisor, poly.coeffs[0]);

        for (size_t i = 1; i < poly.size; ++i)
        {
            fr::sub(poly.coeffs[i], poly.coeffs[i-1], poly.coeffs[i]);
            fr::mul(poly.coeffs[i], divisor, poly.coeffs[i]);
        }
    }
}