#include "./polynomial.hpp"
#include "./polynomial_arithmetic.hpp"

#include "../fields/fr.hpp"
#include "../assert.hpp"

#include "stdlib.h"
#include "memory.h"
#include "math.h"

using namespace barretenberg;

namespace
{
size_t clamp(size_t target, size_t step)
{
    size_t res = (target / step) * step;
    if (res < target)
        res += step;
    return res;
}
}

/**
 * Constructors / Destructors
 **/
polynomial::polynomial(const size_t initial_size, const size_t initial_max_size_hint, const Representation repr) :
    coefficients(nullptr),
    representation(repr),
    size(initial_size),
    page_size(DEFAULT_SIZE_HINT),
    max_size(0),
    allocated_pages(0)
{
    ASSERT(page_size != 0);
    size_t target_max_size = std::max(initial_size, initial_max_size_hint + DEFAULT_PAGE_SPILL);
    if (target_max_size > 0)
    {
        coefficients = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * target_max_size));
        max_size = target_max_size;
        // bump_memory(target_max_size);
        // memset(static_cast<void*>(coefficients), 0, max_size);
    }
}

polynomial::polynomial(const polynomial& other, const size_t target_max_size) :
    representation(other.representation),
    size(other.size),
    page_size(other.page_size),
    max_size(std::max(clamp(target_max_size, page_size + DEFAULT_PAGE_SPILL), other.max_size)),
    allocated_pages(max_size / page_size)
{
    ASSERT(page_size != 0);
    coefficients = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * max_size));

    if (other.coefficients != nullptr)
    {
        memcpy(static_cast<void*>(coefficients), static_cast<void*>(other.coefficients), sizeof(fr::field_t) * size);
    }
    size_t delta = max_size - size;
    if (delta > 0)
    {
        memset(static_cast<void*>(coefficients + size), 0, delta);
    }
}

polynomial& polynomial::operator=(const polynomial& other)
{
    ASSERT(page_size != 0);
    representation = other.representation;
    page_size = other.page_size;
    size = other.size;

    coefficients = nullptr;
    if (other.max_size > max_size)
    {
        bump_memory(other.max_size);
    }
    if (other.coefficients != nullptr)
    {
        memcpy(static_cast<void*>(coefficients), static_cast<void*>(other.coefficients), sizeof(fr::field_t) * size);
    }
    return *this;
}

polynomial::polynomial(polynomial&& other, const size_t target_max_size) :
    representation(other.representation),
    size(other.size),
    page_size(other.page_size),
    max_size(std::max(clamp(target_max_size, page_size + DEFAULT_PAGE_SPILL), other.max_size)),
    allocated_pages(max_size / page_size)
{
    ASSERT(page_size != 0);
    if (coefficients != nullptr)
    {
        free(coefficients);
    }
    if (other.coefficients != nullptr)
    {
        coefficients = other.coefficients;
    }
    else
    {
        coefficients = nullptr; // TODO: don't need this?
    }
    other.coefficients = nullptr;
    if (max_size > other.max_size)
    {
        bump_memory(max_size);
    }
}

polynomial& polynomial::operator=(polynomial&& other)
{
    representation = other.representation;
    page_size = other.page_size;
    max_size = other.max_size;
    allocated_pages = other.allocated_pages;
    size = other.size;
    ASSERT(page_size != 0);

    if (coefficients != nullptr)
    {
        free(coefficients);
    }
    if (other.coefficients != nullptr)
    {
        coefficients = other.coefficients;
    }
    else
    {
        coefficients = nullptr; // TODO: don't need this?
    }

    if (max_size > other.max_size)
    {
        bump_memory(max_size);
    }
    other.coefficients = nullptr;
    return *this;
}

polynomial::~polynomial()
{
    if (coefficients != nullptr)
    {
        free(coefficients);
    }
}

// #######

fr::field_t polynomial::evaluate(const fr::field_t& z, const size_t target_size) const
{
    return polynomial_arithmetic::evaluate(coefficients, z, target_size);
}

void polynomial::bump_memory(const size_t new_size_hint)
{
    size_t new_size = (new_size_hint / page_size) * page_size;
    
    while (new_size < new_size_hint)
    {
        new_size += page_size;
    }

    fr::field_t* new_memory = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * new_size));
    if (coefficients != nullptr)
    {
        memcpy(static_cast<void*>(coefficients), static_cast<void*>(new_memory), sizeof(fr::field_t) * size);
        free(coefficients);
    }
    coefficients = new_memory;
    allocated_pages = new_size / page_size;
    max_size = new_size;
}

void polynomial::add_coefficient_internal(const fr::field_t &coefficient)
{
    if (size + 1 > max_size)
    {
        bump_memory((allocated_pages + 1) * page_size);
    }
    fr::copy(coefficient, coefficients[size]);
    ++size;
}

void polynomial::add_lagrange_base_coefficient(const fr::field_t &coefficient)
{
    ASSERT(representation == Representation::ROOTS_OF_UNITY);
    add_coefficient_internal(coefficient);
}

void polynomial::add_coefficient(const fr::field_t &coefficient)
{
    ASSERT(representation == Representation::COEFFICIENT_FORM);
    add_coefficient_internal(coefficient);
}

void polynomial::reserve(const size_t new_max_size)
{
    if (new_max_size > max_size)
    {
        bump_memory(new_max_size);
        memset(static_cast<void*>(&coefficients[size]), 0, sizeof(fr::field_t) * (new_max_size - max_size));
    }
}

void polynomial::resize(const size_t new_size)
{
    ASSERT(new_size > size);

    if (new_size > max_size)
    {
        bump_memory(new_size);
    }

    fr::field_t* back = &coefficients[size];
    memset(static_cast<void*>(back), 0, sizeof(fr::field_t) * (new_size - size));
    size = new_size;
}

// does not zero out memory
void polynomial::resize_unsafe(const size_t new_size)
{
    // ASSERT(new_size > size);
    
    if (new_size > max_size)
    {
        bump_memory(new_size);
        size = new_size;
    }
}

/**
 * FFTs
 **/

void polynomial::fft(const evaluation_domain &domain)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    // (ZERO OUT MEMORY!)
    // memset(static_cast<void*>(back), 0, sizeof(fr::field_t) * (new_size - size));
    polynomial_arithmetic::fft(coefficients, domain);
    size = domain.size;
}

void polynomial::coset_fft(const evaluation_domain &domain)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    polynomial_arithmetic::coset_fft(coefficients, domain);
    size = domain.size;
}

void polynomial::coset_fft_with_constant(const evaluation_domain &domain, const fr::field_t& constant)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    polynomial_arithmetic::coset_fft_with_constant(coefficients, domain, constant);
    size = domain.size;
}

void polynomial::ifft(const evaluation_domain &domain)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    polynomial_arithmetic::ifft(coefficients, domain);
    size = domain.size;
}

void polynomial::ifft_with_constant(const evaluation_domain &domain, const barretenberg::fr::field_t &constant)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    polynomial_arithmetic::ifft_with_constant(coefficients, domain, constant);
    size = domain.size;
}

void polynomial::coset_ifft(const evaluation_domain &domain)
{
    if (domain.size > max_size)
    {
        bump_memory(domain.size);
    }

    polynomial_arithmetic::coset_ifft(coefficients, domain);
    size = domain.size;
}

// void polynomial::coset_ifft_with_constant(const evaluation_domain &domain, const fr::field_t &constant)
// {
//     if (domain.size > max_size)
//     {
//         bump_memory(domain.size);
//     }

//     polynomial_arithmetic::coset_ifft_with_constant(coefficients, domain, constant);
// }

fr::field_t polynomial::compute_kate_opening_coefficients(const barretenberg::fr::field_t &z)
{
    return polynomial_arithmetic::compute_kate_opening_coefficients(coefficients, coefficients, z, size);
}

void polynomial::shrink_evaluation_domain(const size_t shrink_factor)
{
    // TODO SUPPORT MORE THAN 2X SHRINK
    size_t log2_shrink_factor = static_cast<size_t>(log2(shrink_factor));
    ASSERT(1UL << log2_shrink_factor == shrink_factor);

    fr::field_t* new_memory = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * max_size >> log2_shrink_factor));
    for (size_t i = 0; i < size; i += shrink_factor)
    {
        fr::copy(coefficients[i], new_memory[i >> log2_shrink_factor]);
    }
    free(coefficients);
    coefficients = new_memory;
    size = size >> log2_shrink_factor;
    max_size = max_size >> log2_shrink_factor;
    allocated_pages = allocated_pages >> log2_shrink_factor;
}