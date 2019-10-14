#ifndef EVALUATION_DOMAIN_HPP
#define EVALUATION_DOMAIN_HPP

#include "../types.hpp"
#include "stdio.h"
#include <vector>

class evaluation_domain
{
public:
    evaluation_domain() : size(0),
                          num_threads(0),
                          thread_size(0),
                          log2_size(0),
                          log2_thread_size(0),
                          log2_num_threads(0),
                          root({{0,0,0,0}}),
                          root_inverse({{0,0,0,0}}),
                          domain({{0,0,0,0}}),
                          domain_inverse({{0,0,0,0}}),
                          generator({{0,0,0,0}}),
                          generator_inverse({{0,0,0,0}}),
                          roots(nullptr) {};

    evaluation_domain(const size_t domain_size);
    evaluation_domain(const evaluation_domain& other);
    evaluation_domain(evaluation_domain&& other);

    // remove copy assignment and move assignment operators - evaluation domains are over a fixed size, so invoking a
    // copy assignment operator means we've hit one of two conditions
    // 1: we're copy/move assigning an evaluation domain to an another evaluation domain of the same size
    // 2: we're copy/move assigning an evaluation domain to another evaluation domain of a different size
    // Option 1 is superfluous and option 2 is downright weird - we'd rather have the compiler whinge about invoking a deleted operator,
    // than silently compile what is almost certainly broken code
    evaluation_domain& operator=(const evaluation_domain&) = delete;
    evaluation_domain& operator=(evaluation_domain&&) = delete;

    ~evaluation_domain();

    void compute_lookup_table();

    const std::vector<barretenberg::fr::field_t*>& get_round_roots() const { return round_roots; };
    const std::vector<barretenberg::fr::field_t*>& get_inverse_round_roots() const { return inverse_round_roots; }

    const size_t size;
    const size_t num_threads;
    const size_t thread_size;
    const size_t log2_size;
    const size_t log2_thread_size;
    const size_t log2_num_threads;

    const barretenberg::fr::field_t root;
    const barretenberg::fr::field_t root_inverse;
    const barretenberg::fr::field_t domain;
    const barretenberg::fr::field_t domain_inverse;
    const barretenberg::fr::field_t generator;
    const barretenberg::fr::field_t generator_inverse;

private:
    std::vector<barretenberg::fr::field_t*> round_roots;
    std::vector<barretenberg::fr::field_t*> inverse_round_roots;

    barretenberg::fr::field_t* roots;
};
#endif