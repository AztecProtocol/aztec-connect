#include "./mmu.hpp"

namespace barretenberg
{
namespace mmu
{
namespace
{
static bool* skew_memory = nullptr;
static uint64_t* wnaf_memory = nullptr;
static g1::element* bucket_memory = nullptr;

const auto init = []() {
    constexpr size_t max_num_points = (1 << 20);
    constexpr size_t max_num_rounds = 8;
    constexpr size_t max_buckets = 1 << 15;
    constexpr size_t thread_overspill = 1024;
    wnaf_memory = (uint64_t*)(aligned_alloc(64, max_num_points * max_num_rounds * 2 * sizeof(uint64_t)));
    bucket_memory = (g1::element*)(aligned_alloc(64, (max_buckets + thread_overspill) * sizeof(g1::element) ));
    skew_memory = (bool*)(aligned_alloc(64, max_num_points * 2 * sizeof(bool)));
    memset((void*)skew_memory, 0, max_num_points * 2 * sizeof(bool));
    memset((void*)wnaf_memory, 1, max_num_points * max_num_rounds * 2 * sizeof(uint64_t));
    memset((g1::element*)bucket_memory, 0xff, (max_buckets + thread_overspill) * sizeof(g1::element));
    return 1;
}();
} // namespace

bool* get_skew_pointer()
{
    return skew_memory;
}

uint64_t* get_wnaf_pointer()
{
    return wnaf_memory;
}

g1::element* get_bucket_pointer()
{
    return bucket_memory;
}
}
}