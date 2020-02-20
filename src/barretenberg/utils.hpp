#pragma once

#ifdef _WIN32
#define BBERG_INLINE __forceinline inline
#else
#define BBERG_INLINE __attribute__((always_inline)) inline
#endif

namespace unstd {
template <class Lambda, int = (Lambda{}(), 0)> constexpr bool is_constant_evaluated(Lambda)
{
    return true;
}
constexpr bool is_constant_evaluated(...)
{
    return false;
}
} // namespace unstd