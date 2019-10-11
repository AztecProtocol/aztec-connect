#ifndef POLYNOMIAL_HPP
#define POLYNOMIAL_HPP

#include "../types.hpp"

#include "./evaluation_domain.hpp"

class polynomial
{
public:
    enum Representation
    {
        COEFFICIENT_FORM,
        ROOTS_OF_UNITY,
        COSET_ROOTS_OF_UNITY,
        NONE
    };

    polynomial(const size_t page_size_hint = DEFAULT_SIZE_HINT, const size_t initial_max_size = 0, const Representation repr = Representation::ROOTS_OF_UNITY);
    polynomial(const polynomial &other, const size_t target_max_size = 0);
    polynomial(polynomial &&other, const size_t target_max_size = 0);
    polynomial &operator=(polynomial &&other);
    polynomial &operator=(const polynomial &other);
    ~polynomial();

    // void copy(const polynomial &other, const size_t target_max_size = 0);
    barretenberg::fr::field_t* get_coefficients() const { return coefficients; };
    size_t get_size() const { return size; };
    barretenberg::fr::field_t& at(size_t i) const { return coefficients[i]; };
    barretenberg::fr::field_t evaluate(const barretenberg::fr::field_t& z) const;

    void fft(const evaluation_domain &domain);
    void coset_fft(const evaluation_domain &domain);
    void coset_fft_with_constant(const evaluation_domain &domain, const barretenberg::fr::field_t &costant);
    void ifft(const evaluation_domain &domain);
    void ifft_with_constant(const evaluation_domain &domain, const barretenberg::fr::field_t &constant);
    void coset_ifft(const evaluation_domain &domain);
    // void coset_ifft_with_constant(const evaluation_domain &domain, const barretenberg::fr::field_t &constant);

    barretenberg::fr::field_t compute_kate_opening_coefficients(const barretenberg::fr::field_t &z);
    void add_lagrange_base_coefficient(const barretenberg::fr::field_t &coefficient);
    void add_coefficient(const barretenberg::fr::field_t &coefficient);

    void reserve(const size_t new_max_size);
    void resize(const size_t new_size);
    void shrink_evaluation_domain(const size_t shrink_factor);

private:
    const static size_t DEFAULT_SIZE_HINT = 1 << 20;

    void add_coefficient_internal(const barretenberg::fr::field_t &coefficient);
    void bump_memory(const size_t new_size);

    barretenberg::fr::field_t *coefficients;
    Representation representation;
    size_t size;
    size_t page_size;
    size_t max_size;
    size_t allocated_pages;
};

// class circuit_state
// {
// public:
//     circuit_state(size_t circuit_size);

//     polynomial& get_w_l() { return w_l; }
//     polynomial& get_w_r() { return w_r; }
//     polynomial& get_w_o() { return w_o; }
//     polynomial& get_q_m() { return q_m; }
//     polynomial& get_q_l() { return q_l; }
//     polynomial& get_q_r() { return q_r; }
//     polynomial& get_q_o() { return q_o; }
//     polynomial& get_q_c() { return q_c; }
//     polynomial& get_sigma_1() { return sigma_1; }
//     polynomial& get_sigma_2() { return sigma_2; }
//     polynomial& get_sigma_3() { return sigma_3; }
//     polynomial& get_z() { return z; }

//     void compose_proof();
//     void reset_circuit_state();

// private:

//     void compute_wire_coefficients();
//     void compute_z_coefficients();
//     void compute_identity_permutation_coefficients();
//     void compute_copy_permutation_coefficient();
//     void compute_quotient_polynomial();
//     void compute_linearisation_coefficients();

//     polynomial w_l;
//     polynomial w_r;
//     polynomial w_o;
//     polynomial q_m;
//     polynomial q_l;
//     polynomial q_r;
//     polynomial q_o;
//     polynomial q_c;
//     polynomial sigma_1;
//     polynomial sigma_2;
//     polynomial sigma_3;
//     polynomial z;

//     evaluation_domain small_domain;
//     evaluation_domain mid_domain;
//     evaluation_domain large_domain;

//     std::vector<uint32_t> sigma_1_mapping;
//     std::vector<uint32_t> sigma_2_mapping;
//     std::vector<uint32_t> sigma_3_mapping;

//     size_t n;
// };

#endif