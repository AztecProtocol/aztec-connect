#pragma once

#include "../../polynomials/evaluation_domain.hpp"
#include "../../polynomials/polynomial.hpp"

namespace waffle {
class CircuitFFTState {
  public:
    CircuitFFTState(const size_t n)
        : small_domain(n, n)
        , mid_domain(2 * n, n > min_thread_block ? n : 2 * n)
        , large_domain(4 * n, n > min_thread_block ? n : 4 * n)
    {
        if (n != 0) {
            small_domain.compute_lookup_table();
            mid_domain.compute_lookup_table();
            large_domain.compute_lookup_table();
        }
        quotient_large.resize(4 * n);
        quotient_mid.resize(2 * n);
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
        , quotient_mid(std::move(other.quotient_mid))
        , quotient_large(std::move(other.quotient_large))
    {}

    CircuitFFTState& operator=(CircuitFFTState&& other)
    {
        small_domain = std::move(other.small_domain);
        mid_domain = std::move(other.mid_domain);
        large_domain = std::move(other.large_domain);
        quotient_mid = std::move(other.quotient_mid);
        quotient_large = std::move(other.quotient_large);
        return *this;
    }

    barretenberg::polynomial w_l_fft;
    barretenberg::polynomial w_r_fft;
    barretenberg::polynomial w_o_fft;
    barretenberg::polynomial w_4_fft;

    barretenberg::evaluation_domain small_domain;
    barretenberg::evaluation_domain mid_domain;
    barretenberg::evaluation_domain large_domain;

    barretenberg::polynomial quotient_mid;
    barretenberg::polynomial quotient_large;

    static constexpr size_t min_thread_block = 4UL;
};
} // namespace waffle