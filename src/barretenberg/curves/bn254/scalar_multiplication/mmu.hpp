#include "../g1.hpp"
namespace barretenberg
{
// simple helper functions to retrieve pointers to pre-allocated memory for the scalar multiplication algorithm.
// This is to eliminate page faults when allocating (and writing) to large tranches of memory.
namespace mmu
{
    bool* get_skew_pointer();

    uint64_t* get_wnaf_pointer();

    g1::element* get_bucket_pointer();

}
}