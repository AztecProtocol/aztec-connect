/**
 * uint256_t
 * Copyright Aztec 2020
 *
 * An unsigned 256 bit integer type.
 *
 * Constructor and all methods are constexpr. Ideally, uint256_t should be able to be treated like any other literal type.
 *
 * Not optimized for performance, this code doesn't touch any of our hot paths when constructing PLONK proofs
 **/
#pragma once

#include <cstdint>

class uint256_t {
  public:
    constexpr uint256_t(const uint64_t a = 0, const uint64_t b = 0, const uint64_t c = 0, const uint64_t d = 0)
        : data()
    {
        data[0] = a;
        data[1] = b;
        data[2] = c;
        data[3] = d;
    }

    constexpr uint256_t(const uint256_t& other)
        : data()
    {
        data[0] = other.data[0];
        data[1] = other.data[1];
        data[2] = other.data[2];
        data[3] = other.data[3];
    }

    constexpr bool to_bool() const { return static_cast<bool>(data[0]); };
    constexpr uint8_t to_uint8_t() const { return static_cast<uint8_t>(data[0]); };
    constexpr uint16_t to_uint16_t() const { return static_cast<uint16_t>(data[0]); };
    constexpr uint32_t to_uint32_t() const { return static_cast<uint32_t>(data[0]); };
    constexpr uint64_t to_uint64_t() const { return static_cast<uint64_t>(data[0]); };

    constexpr bool get_bit(const uint64_t bit_index) const;
    constexpr uint64_t get_msb() const;

    constexpr uint256_t operator+(const uint256_t& other) const;
    constexpr uint256_t operator-(const uint256_t& other) const;

    constexpr uint256_t operator*(const uint256_t& other) const;
    constexpr uint256_t operator/(const uint256_t& other) const;
    constexpr uint256_t operator%(const uint256_t& other) const;

    constexpr uint256_t operator>>(const uint256_t& other) const;
    constexpr uint256_t operator<<(const uint256_t& other) const;

    constexpr uint256_t operator&(const uint256_t& other) const;
    constexpr uint256_t operator^(const uint256_t& other) const;
    constexpr uint256_t operator|(const uint256_t& other) const;
    constexpr uint256_t operator~() const;

    constexpr bool operator==(const uint256_t& other) const;
    constexpr bool operator!=(const uint256_t& other) const;
    constexpr bool operator!() const;

    constexpr bool operator>(const uint256_t& other) const;
    constexpr bool operator<(const uint256_t& other) const;
    constexpr bool operator>=(const uint256_t& other) const;
    constexpr bool operator<=(const uint256_t& other) const;

    constexpr uint256_t& operator+=(const uint256_t& other)
    {
        *this = *this + other;
        return *this;
    };
    constexpr uint256_t& operator-=(const uint256_t& other)
    {
        *this = *this - other;
        return *this;
    };
    constexpr uint256_t& operator*=(const uint256_t& other)
    {
        *this = *this * other;
        return *this;
    };
    constexpr uint256_t& operator/=(const uint256_t& other)
    {
        *this = *this / other;
        return *this;
    };
    constexpr uint256_t& operator%=(const uint256_t& other)
    {
        *this = *this % other;
        return *this;
    };

    constexpr uint256_t& operator&=(const uint256_t& other)
    {
        *this = *this & other;
        return *this;
    };
    constexpr uint256_t& operator^=(const uint256_t& other)
    {
        *this = *this ^ other;
        return *this;
    };
    constexpr uint256_t& operator|=(const uint256_t& other)
    {
        *this = *this | other;
        return *this;
    };

    constexpr uint256_t& operator>>=(const uint256_t& other)
    {
        *this = *this >> other;
        return *this;
    };
    constexpr uint256_t& operator<<=(const uint256_t& other)
    {
        *this = *this << other;
        return *this;
    };

    uint64_t data[4];
};

#include "./uint256_impl.hpp"