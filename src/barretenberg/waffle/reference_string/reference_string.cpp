#include "./reference_string.hpp"

#include "memory.h"
#include "stdlib.h"

#include "../../groups/scalar_multiplication.hpp"
#include "../../io/io.hpp"
#include "../../types.hpp"

namespace waffle
{
    ReferenceString::ReferenceString() : monomials(nullptr), precomputed_g2_lines(nullptr), degree(0) {}


    ReferenceString::ReferenceString(const size_t num_points)
    {
        degree = num_points;
        if (num_points > 0)
        {
            monomials = (barretenberg::g1::affine_element*)(aligned_alloc(64, sizeof(barretenberg::g1::affine_element) * (2 * degree + 2)));
            precomputed_g2_lines = (barretenberg::pairing::miller_lines*)(aligned_alloc(64, sizeof(barretenberg::pairing::miller_lines) * 2));
            barretenberg::io::read_transcript(monomials, g2_x, degree, BARRETENBERG_SRS_PATH);
            barretenberg::scalar_multiplication::generate_pippenger_point_table(monomials, monomials, degree);

            barretenberg::g2::element g2_x_jac;
            barretenberg::g2::affine_to_jacobian(g2_x, g2_x_jac);
            barretenberg::pairing::precompute_miller_lines(barretenberg::g2::one(), precomputed_g2_lines[0]);
            barretenberg::pairing::precompute_miller_lines(g2_x_jac, precomputed_g2_lines[1]);
        }
        else
        {
            monomials = nullptr;
            precomputed_g2_lines = nullptr;
        }
    }

    ReferenceString::ReferenceString(const ReferenceString &other) : degree(other.degree)
    {
        monomials = (barretenberg::g1::affine_element*)(aligned_alloc(64, sizeof(barretenberg::g1::affine_element) * (2 * degree + 2)));
        precomputed_g2_lines = (barretenberg::pairing::miller_lines*)(aligned_alloc(64, sizeof(barretenberg::pairing::miller_lines) * 2));

        memcpy(static_cast<void*>(monomials), static_cast<void*>(other.monomials), sizeof(barretenberg::g1::affine_element) * (2 * degree));
        memcpy(static_cast<void*>(precomputed_g2_lines), static_cast<void*>(other.precomputed_g2_lines), sizeof(barretenberg::pairing::miller_lines) * 2);

        barretenberg::g2::copy_affine(other.g2_x, g2_x);
    }

    ReferenceString::ReferenceString(ReferenceString &&other) : monomials(nullptr), precomputed_g2_lines(nullptr), degree(other.degree)
    {
        if (other.monomials != nullptr)
        {
            monomials = other.monomials;
            other.monomials = nullptr;
        }
        if (other.precomputed_g2_lines != nullptr)
        {
            precomputed_g2_lines = other.precomputed_g2_lines;
            other.precomputed_g2_lines = nullptr;
        }

        barretenberg::g2::copy_affine(other.g2_x, g2_x);
    }

    ReferenceString &ReferenceString::operator=(const ReferenceString &other)
    {
        if (monomials != nullptr)
        {
            aligned_free(monomials);
            monomials = nullptr;
        }
        if (precomputed_g2_lines != nullptr)
        {
            aligned_free(precomputed_g2_lines);
            precomputed_g2_lines = nullptr;
        }

        degree = other.degree;

        monomials = (barretenberg::g1::affine_element *)(aligned_alloc(64, sizeof(barretenberg::g1::affine_element) * (2 * degree + 2)));
        precomputed_g2_lines = (barretenberg::pairing::miller_lines *)(aligned_alloc(64, sizeof(barretenberg::pairing::miller_lines) * 2));

        memcpy(static_cast<void *>(monomials), static_cast<void *>(other.monomials), sizeof(barretenberg::g1::affine_element) * (2 * degree));
        memcpy(static_cast<void *>(precomputed_g2_lines), static_cast<void *>(other.precomputed_g2_lines), sizeof(barretenberg::pairing::miller_lines) * 2);

        barretenberg::g2::copy_affine(other.g2_x, g2_x);
        return *this;
    }

    ReferenceString &ReferenceString::operator=(ReferenceString &&other)
    {
        if (monomials != nullptr)
        {
            aligned_free(monomials);
            monomials = nullptr;
        }
        if (precomputed_g2_lines != nullptr)
        {
            aligned_free(precomputed_g2_lines);
            precomputed_g2_lines = nullptr;
        }

        degree = other.degree;

        if (other.monomials != nullptr)
        {
            monomials = other.monomials;
            other.monomials = nullptr;
        }
        if (other.precomputed_g2_lines != nullptr)
        {
            precomputed_g2_lines = other.precomputed_g2_lines;
            other.precomputed_g2_lines = nullptr;
        }

        barretenberg::g2::copy_affine(other.g2_x, g2_x);

        return *this;
    }

    ReferenceString::~ReferenceString()
    {
        if (monomials != nullptr)
        {
            aligned_free(monomials);
        }
        if (precomputed_g2_lines != nullptr)
        {
            aligned_free(precomputed_g2_lines);
        }
    }

    ReferenceString ReferenceString::get_verifier_reference_string() const
    {
        ASSERT(monomials != nullptr);
        ReferenceString result;
        barretenberg::g2::copy_affine(g2_x, result.g2_x);


        result.precomputed_g2_lines = (barretenberg::pairing::miller_lines *)(aligned_alloc(64, sizeof(barretenberg::pairing::miller_lines) * 2));
        memcpy(static_cast<void *>(result.precomputed_g2_lines), static_cast<void *>(precomputed_g2_lines), sizeof(barretenberg::pairing::miller_lines) * 2);

        return result;
    }
}