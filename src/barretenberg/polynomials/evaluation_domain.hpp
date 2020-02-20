#pragma once

#include "../types.hpp"
#include "../curves/bn254/fr.hpp"
#include <vector>

namespace barretenberg
{
class evaluation_domain
{
public:
    evaluation_domain() : size(0),
                          num_threads(0),
                          thread_size(0),
                          log2_size(0),
                          log2_thread_size(0),
                          log2_num_threads(0),
                          generator_size(0),
                          root({0,0,0,0}),
                          root_inverse({0,0,0,0}),
                          domain({0,0,0,0}),
                          domain_inverse({0,0,0,0}),
                          generator({0,0,0,0}),
                          generator_inverse({0,0,0,0}),
                          roots(nullptr) {};

    evaluation_domain(const size_t domain_size, const size_t target_generator_size = 0);
    evaluation_domain(const evaluation_domain& other);
    evaluation_domain(evaluation_domain&& other);

    evaluation_domain& operator=(const evaluation_domain&) = delete;
    evaluation_domain& operator=(evaluation_domain&&);

    ~evaluation_domain();

    void compute_lookup_table();
    void compute_generator_table(const size_t target_generator_size);

    const std::vector<barretenberg::fr::field_t*>& get_round_roots() const { return round_roots; };
    const std::vector<barretenberg::fr::field_t*>& get_inverse_round_roots() const { return inverse_round_roots; }

    size_t size;
    size_t num_threads;
    size_t thread_size;
    size_t log2_size;
    size_t log2_thread_size;
    size_t log2_num_threads;
    size_t generator_size;

    barretenberg::fr::field_t root;
    barretenberg::fr::field_t root_inverse;
    barretenberg::fr::field_t domain;
    barretenberg::fr::field_t domain_inverse;
    barretenberg::fr::field_t generator;
    barretenberg::fr::field_t generator_inverse;

private:
    std::vector<barretenberg::fr::field_t*> round_roots;
    std::vector<barretenberg::fr::field_t*> inverse_round_roots;

    barretenberg::fr::field_t* roots;
};
}
