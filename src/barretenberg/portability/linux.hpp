#pragma once

#ifdef __wasm__
#define aligned_free free
#endif
#ifdef __linux__

#define aligned_free free

#endif