#pragma once

#include "../../polynomials/evaluation_domain.hpp"
#include "../../polynomials/polynomial.hpp"

namespace waffle {
class CircuitFFTState {
  public:
    CircuitFFTState(const size_t n)
        : small_domain(n)
        , mid_domain(2 * n)
        , large_domain(4 * n)
    {
        if (n != 0) {
            small_domain.compute_lookup_table();
            mid_domain.compute_lookup_table();
            large_domain.compute_lookup_table();
        }
    }
    CircuitFFTState(const CircuitFFTState& other)
        : small_domain(other.small_domain)
        , mid_domain(other.mid_domain)
        , large_domain(other.large_domain)
    {}

    CircuitFFTState(CircuitFFTState&& other)
        : small_domain(std::move(other.small_domain))
        , mid_domain(std::move(other.mid_domain))
        , large_domain(std::move(other.large_domain))
    {}

    CircuitFFTState& operator=(CircuitFFTState&& other)
    {
        small_domain = std::move(other.small_domain);
        mid_domain = std::move(other.mid_domain);
        large_domain = std::move(other.large_domain);
        return *this;
    }

    barretenberg::polynomial w_l_fft;
    barretenberg::polynomial w_r_fft;
    barretenberg::polynomial w_o_fft;

    barretenberg::polynomial quotient_mid;
    barretenberg::polynomial quotient_large;

    barretenberg::evaluation_domain small_domain;
    barretenberg::evaluation_domain mid_domain;
    barretenberg::evaluation_domain large_domain;
};
} // namespace waffle