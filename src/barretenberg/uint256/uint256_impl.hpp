#pragma once

namespace uint256_internal {
struct uint64_pair {
    uint64_t data[2];
};

// struct uint64_oct {
//     uint64_t data[8];
// };

struct divmod_output {
    uint256_t quotient;
    uint256_t remainder;
};

constexpr uint64_pair mul_wide(uint64_t a, uint64_t b)
{
    const uint64_t a_lo = a & 0xffffffffULL;
    const uint64_t a_hi = a >> 32ULL;
    const uint64_t b_lo = b & 0xffffffffULL;
    const uint64_t b_hi = b >> 32ULL;

    const uint64_t lo_lo = a_lo * b_lo;
    const uint64_t hi_lo = a_hi * b_lo;
    const uint64_t lo_hi = a_lo * b_hi;
    const uint64_t hi_hi = a_hi * b_hi;

    const uint64_t cross = (lo_lo >> 32ULL) + (hi_lo & 0xffffffffULL) + lo_hi;

    return { (cross << 32ULL) | (lo_lo & 0xffffffffULL), (hi_lo >> 32ULL) + (cross >> 32ULL) + hi_hi };
}

// compute a + b + carry, returning the carry
constexpr uint64_pair addc(const uint64_t a, const uint64_t b, const uint64_t carry_in)
{
    const uint64_t sum = a + b;
    const uint64_t carry_temp = sum < a;
    const uint64_t r = sum + carry_in;
    const uint64_t carry_out = carry_temp + (r < carry_in);
    return { r, carry_out };
}

constexpr uint64_pair sbb(const uint64_t a, const uint64_t b, const uint64_t borrow_in)
{
    uint64_t t_1 = a - (borrow_in >> 63ULL);
    uint64_t borrow_temp_1 = t_1 > a;
    uint64_t t_2 = t_1 - b;
    uint64_t borrow_temp_2 = t_2 > t_1;

    return { t_2, 0ULL - (borrow_temp_1 | borrow_temp_2) };
}

// {r, carry_out} = a + carry_in + b * c
constexpr uint64_pair mac(const uint64_t a, const uint64_t b, const uint64_t c, const uint64_t carry_in)
{
    uint64_pair result = mul_wide(b, c);
    result.data[0] += a;
    const uint64_t overflow_c = (result.data[0] < a);
    result.data[0] += carry_in;
    const uint64_t overflow_carry = (result.data[0] < carry_in);
    result.data[1] += (overflow_c + overflow_carry);
    return result;
}

/*
constexpr uint64_oct mul_512(const uint256_t& a, const uint256_t& b)
{
    uint64_pair T0 = mac(0, a.data[0], b.data[0], 0);
    uint64_pair T1 = mac(0, a.data[0], b.data[1], T0.data[1]);
    uint64_pair T2 = mac(0, a.data[0], b.data[2], T1.data[1]);
    uint64_pair T3 = mac(0, a.data[0], b.data[3], T2.data[1]);

    uint64_oct r{ T0.data[0], T1.data[0], T2.data[0], T3.data[0], T3.data[1], 0, 0, 0 };

    T0 = mac(r.data[1], a.data[1], b.data[0], 0);
    T1 = mac(r.data[2], a.data[1], b.data[1], T0.data[1]);
    T2 = mac(r.data[3], a.data[1], b.data[2], T1.data[1]);
    T3 = mac(r.data[4], a.data[1], b.data[3], T2.data[1]);

    r.data[1] = T0.data[0];
    r.data[2] = T1.data[0];
    r.data[3] = T2.data[0];
    r.data[4] = T3.data[0];
    r.data[5] = T3.data[1];

    T0 = mac(r.data[2], a.data[2], b.data[0], 0);
    T1 = mac(r.data[3], a.data[2], b.data[1], T0.data[1]);
    T2 = mac(r.data[4], a.data[2], b.data[2], T1.data[1]);
    T3 = mac(r.data[5], a.data[2], b.data[3], T2.data[1]);

    r.data[2] = T0.data[0];
    r.data[3] = T1.data[0];
    r.data[4] = T2.data[0];
    r.data[5] = T3.data[0];
    r.data[6] = T3.data[1];

    T0 = mac(r.data[3], a.data[3], b.data[0], 0);
    T1 = mac(r.data[4], a.data[3], b.data[1], T0.data[1]);
    T2 = mac(r.data[5], a.data[3], b.data[2], T1.data[1]);
    T3 = mac(r.data[6], a.data[3], b.data[3], T2.data[1]);

    r.data[3] = T0.data[0];
    r.data[4] = T1.data[0];
    r.data[5] = T2.data[0];
    r.data[6] = T3.data[0];
    r.data[7] = T3.data[1];

    return r;
}
*/

constexpr divmod_output divmod(const uint256_t& a, const uint256_t& b)
{
    if (a == 0 || b == 0) {
        return { uint256_t(0), uint256_t(0) };
    } else if (b == 1) {
        return { a, uint256_t(0) };
    } else if (a == b) {
        return { uint256_t(1), uint256_t(0) };
    } else if (b > a) {
        return { uint256_t(0), a };
    }

    uint256_t quotient = 0;
    uint256_t remainder = a;

    uint64_t bit_difference = a.get_msb() - b.get_msb();

    uint256_t divisor = b << bit_difference;
    uint256_t scale_factor = uint256_t(1) << bit_difference;

    // if the divisor is bigger than the remainder, a and b have the same bit length
    if (divisor > remainder) {
        // TODO: what is faster, adding or shifting?
        // probably shifting...
        divisor >>= 1;
        scale_factor >>= 1;
    }

    // while the remainder is bigger than our original divisor, we can subtract multiples of b from the remainder,
    // and add to the quotient
    while (remainder >= b) {

        // we've shunted 'divisor' up to have the same bit length as our remainder.
        // If remainder >= divisor, then a is at least '1 << bit_difference' multiples of b
        if (remainder >= divisor) {
            remainder -= divisor;
            // we can use OR here instead of +, as
            // scale_factor is always a nice power of two
            quotient |= scale_factor;
        }
        divisor >>= 1;
        scale_factor >>= 1;
    }

    return { quotient, remainder };
}

} // namespace uint256_internal

constexpr bool uint256_t::get_bit(const uint64_t bit_index) const
{
    const size_t idx = bit_index >> 6;
    const size_t shift = bit_index & 63;
    return bool((data[idx] >> shift) & 1);
}

constexpr uint64_t uint256_t::get_msb() const
{
    constexpr auto get_uint64_msb = [](const uint64_t in) {
        constexpr uint8_t de_bruijn_sequence[64]{ 0,  47, 1,  56, 48, 27, 2,  60, 57, 49, 41, 37, 28, 16, 3,  61,
                                                  54, 58, 35, 52, 50, 42, 21, 44, 38, 32, 29, 23, 17, 11, 4,  62,
                                                  46, 55, 26, 59, 40, 36, 15, 53, 34, 51, 20, 43, 31, 22, 10, 45,
                                                  25, 39, 14, 33, 19, 30, 9,  24, 13, 18, 8,  12, 7,  6,  5,  63 };

        uint64_t t = in | (in >> 1);
        t |= t >> 2;
        t |= t >> 4;
        t |= t >> 8;
        t |= t >> 16;
        t |= t >> 32;
        return static_cast<uint64_t>(de_bruijn_sequence[(t * 0x03F79D71B4CB0A89ULL) >> 58ULL]);
    };

    uint64_t idx = get_uint64_msb(data[3]);
    idx = idx == 0 ? get_uint64_msb(data[2]) : idx + 64;
    idx = idx == 0 ? get_uint64_msb(data[1]) : idx + 64;
    idx = idx == 0 ? get_uint64_msb(data[0]) : idx + 64;
    return idx;
}

constexpr uint256_t uint256_t::operator+(const uint256_t& other) const
{
    const uint256_internal::uint64_pair T0 = uint256_internal::addc(data[0], other.data[0], 0);
    const uint256_internal::uint64_pair T1 = uint256_internal::addc(data[1], other.data[1], T0.data[1]);
    const uint256_internal::uint64_pair T2 = uint256_internal::addc(data[2], other.data[2], T1.data[1]);
    const uint256_internal::uint64_pair T3 = uint256_internal::addc(data[3], other.data[3], T2.data[1]);
    return { T0.data[0], T1.data[0], T2.data[0], T3.data[0] };
};

constexpr uint256_t uint256_t::operator-(const uint256_t& other) const
{
    const uint256_internal::uint64_pair T0 = uint256_internal::sbb(data[0], other.data[0], 0);
    const uint256_internal::uint64_pair T1 = uint256_internal::sbb(data[1], other.data[1], T0.data[1]);
    const uint256_internal::uint64_pair T2 = uint256_internal::sbb(data[2], other.data[2], T1.data[1]);
    const uint256_internal::uint64_pair T3 = uint256_internal::sbb(data[3], other.data[3], T2.data[1]);
    return { T0.data[0], T1.data[0], T2.data[0], T3.data[0] };
}

constexpr uint256_t uint256_t::operator*(const uint256_t& other) const
{
    uint256_internal::uint64_pair T0 = uint256_internal::mac(0, data[0], other.data[0], 0);
    uint256_internal::uint64_pair T1 = uint256_internal::mac(0, data[0], other.data[1], T0.data[1]);
    uint256_internal::uint64_pair T2 = uint256_internal::mac(0, data[0], other.data[2], T1.data[1]);
    uint256_internal::uint64_pair T3 = uint256_internal::mac(0, data[0], other.data[3], T2.data[1]);

    uint256_t r{ T0.data[0], T1.data[0], T2.data[0], T3.data[0] };

    T0 = uint256_internal::mac(r.data[1], data[1], other.data[0], 0);
    T1 = uint256_internal::mac(r.data[2], data[1], other.data[1], T0.data[1]);
    T2 = uint256_internal::mac(r.data[3], data[1], other.data[2], T1.data[1]);

    r.data[1] = T0.data[0];
    r.data[2] = T1.data[0];
    r.data[3] = T2.data[0];

    T0 = uint256_internal::mac(r.data[2], data[2], other.data[0], 0);
    T1 = uint256_internal::mac(r.data[3], data[2], other.data[1], T0.data[1]);

    r.data[2] = T0.data[0];
    r.data[3] = T1.data[0];

    T0 = uint256_internal::mac(r.data[3], data[3], other.data[0], 0);

    r.data[3] = T0.data[0];

    return r;
}

constexpr uint256_t uint256_t::operator/(const uint256_t& other) const
{
    return uint256_internal::divmod(*this, other).quotient;
}

constexpr uint256_t uint256_t::operator%(const uint256_t& other) const
{
    return uint256_internal::divmod(*this, other).remainder;
}

constexpr uint256_t uint256_t::operator&(const uint256_t& other) const
{
    return { data[0] & other.data[0], data[1] & other.data[1], data[2] & other.data[2], data[3] & other.data[3] };
}

constexpr uint256_t uint256_t::operator^(const uint256_t& other) const
{
    return { data[0] ^ other.data[0], data[1] ^ other.data[1], data[2] ^ other.data[2], data[3] ^ other.data[3] };
}

constexpr uint256_t uint256_t::operator|(const uint256_t& other) const
{
    return { data[0] | other.data[0], data[1] | other.data[1], data[2] | other.data[2], data[3] | other.data[3] };
}

constexpr uint256_t uint256_t::operator~() const
{
    return { ~data[0], ~data[1], ~data[2], ~data[3] };
}

constexpr bool uint256_t::operator==(const uint256_t& other) const
{
    return data[0] == other.data[0] && data[1] == other.data[1] && data[2] == other.data[2] && data[3] == other.data[3];
}

constexpr bool uint256_t::operator!=(const uint256_t& other) const
{
    return !(*this == other);
}

constexpr bool uint256_t::operator!() const
{
    return *this == uint256_t(0ULL);
}

constexpr bool uint256_t::operator>(const uint256_t& other) const
{
    bool t0 = data[3] > other.data[3];
    bool t1 = data[3] == other.data[3] && data[2] > other.data[2];
    bool t2 = data[3] == other.data[3] && data[2] == other.data[2] && data[1] > other.data[1];
    bool t3 =
        data[3] == other.data[3] && data[2] == other.data[2] && data[1] == other.data[1] && data[0] > other.data[0];
    return t0 || t1 || t2 || t3;
}

constexpr bool uint256_t::operator>=(const uint256_t& other) const
{
    return (*this > other) || (*this == other);
}

constexpr bool uint256_t::operator<(const uint256_t& other) const
{
    return other >= *this;
}

constexpr bool uint256_t::operator<=(const uint256_t& other) const
{
    return (*this < other) || (*this == other);
}

constexpr uint256_t uint256_t::operator>>(const uint256_t& other) const
{
    uint64_t total_shift = other.data[0];

    if (total_shift >= 256 || other.data[1] || other.data[2] || other.data[3]) {
        return 0;
    }

    if (total_shift == 0) {
        return *this;
    }

    uint64_t num_shifted_limbs = total_shift >> 6ULL;
    uint64_t limb_shift = total_shift & 63ULL;

    uint64_t shifted_limbs[4] = { 0 };

    if (limb_shift == 0) {
        shifted_limbs[0] = data[0];
        shifted_limbs[1] = data[1];
        shifted_limbs[2] = data[2];
        shifted_limbs[3] = data[3];
    } else {
        uint64_t remainder_shift = 64ULL - limb_shift;

        shifted_limbs[3] = data[3] >> limb_shift;

        uint64_t remainder = (data[3]) << remainder_shift;

        shifted_limbs[2] = (data[2] >> limb_shift) + remainder;

        remainder = (data[2]) << remainder_shift;

        shifted_limbs[1] = (data[1] >> limb_shift) + remainder;

        remainder = (data[1]) << remainder_shift;

        shifted_limbs[0] = (data[0] >> limb_shift) + remainder;
    }
    uint256_t result(0);

    for (uint64_t i = 0; i < 4 - num_shifted_limbs; ++i) {
        result.data[i] = shifted_limbs[i + num_shifted_limbs];
    }

    return result;
}

constexpr uint256_t uint256_t::operator<<(const uint256_t& other) const
{
    uint64_t total_shift = other.data[0];

    if (total_shift == 0) {
        return *this;
    }

    if (total_shift >= 256 || other.data[1] || other.data[2] || other.data[3]) {
        return 0;
    }

    uint64_t num_shifted_limbs = total_shift >> 6ULL;
    uint64_t limb_shift = total_shift & 63ULL;

    uint64_t shifted_limbs[4]{ 0 };

    if (limb_shift == 0) {
        shifted_limbs[0] = data[0];
        shifted_limbs[1] = data[1];
        shifted_limbs[2] = data[2];
        shifted_limbs[3] = data[3];
    } else {
        uint64_t remainder_shift = 64ULL - limb_shift;

        shifted_limbs[0] = data[0] << limb_shift;

        uint64_t remainder = data[0] >> remainder_shift;

        shifted_limbs[1] = (data[1] << limb_shift) + remainder;

        remainder = data[1] >> remainder_shift;

        shifted_limbs[2] = (data[2] << limb_shift) + remainder;

        remainder = data[2] >> remainder_shift;

        shifted_limbs[3] = (data[3] << limb_shift) + remainder;
    }
    uint256_t result(0);

    for (uint64_t i = 0; i < 4 - num_shifted_limbs; ++i) {
        result.data[i + num_shifted_limbs] = shifted_limbs[i];
    }

    return result;
}