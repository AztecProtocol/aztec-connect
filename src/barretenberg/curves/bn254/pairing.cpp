#include "./pairing.hpp"

#include "./fq12.hpp"
#include "./g1.hpp"
#include "./g2.hpp"

namespace barretenberg {
namespace pairing {
namespace {
inline void mul_by_q(const g2::element& a, g2::element& r)
{
    fq2::field_t T0 = a.x.frobenius_map();
    fq2::field_t T1 = a.y.frobenius_map();
    r.x = fq2::field_t::twist_mul_by_q_x * T0;
    r.y = fq2::field_t::twist_mul_by_q_y * T1;
    r.z = a.z.frobenius_map();
}
} // namespace
void doubling_step_for_flipped_miller_loop(g2::element& current, fq12::ell_coeffs& ell)
{
    fq2::field_t a;
    fq2::field_t b;
    fq2::field_t c;
    fq2::field_t d;
    fq2::field_t e;
    fq2::field_t ee;
    fq2::field_t f;
    fq2::field_t g;
    fq2::field_t h;
    fq2::field_t i;
    fq2::field_t j;
    fq2::field_t k;

    a = current.x.mul_by_fq(fq::field_t::two_inv);
    a *= current.y;

    b = current.y.sqr();
    c = current.z.sqr();
    d = c + c;
    d += c;
    e = d * fq2::field_t::twist_coeff_b;
    f = e + e;
    f += e;

    g = b + f;
    g = g.mul_by_fq(fq::field_t::two_inv);
    h = current.y + current.z;
    h = h.sqr();
    i = b + c;
    h -= i;
    i = e - b;
    j = current.x.sqr();
    ee = e.sqr();
    k = b - f;
    current.x = a * k;

    k = ee + ee;
    k += ee;

    c = g.sqr();
    current.y = c - k;
    current.z = b * h;

    fq6::__mul_by_non_residue(i, ell.o);

    ell.vw = -h;
    ell.vv = j + j;
    ell.vv += j;
}

void mixed_addition_step_for_flipped_miller_loop(const g2::element& base, g2::element& Q, fq12::ell_coeffs& line)
{
    fq2::field_t d;
    fq2::field_t e;
    fq2::field_t f;
    fq2::field_t g;
    fq2::field_t h;
    fq2::field_t i;
    fq2::field_t j;

    d = base.x * Q.z;
    d = Q.x - d;

    e = base.y * Q.z;
    e = Q.y - e;

    f = d.sqr();
    g = e.sqr();
    h = d * f;
    i = Q.x * f;

    j = Q.z * g;
    j += h;
    j -= i;
    j -= i;

    Q.x = d * j;
    i -= j;
    i *= e;
    j = Q.y * h;
    Q.y = i - j;
    Q.z *= h;

    h = e * base.x;
    i = d * base.y;

    h -= i;
    fq6::__mul_by_non_residue(h, line.o);

    line.vv = -e;
    line.vw = d;
}

void precompute_miller_lines(const g2::element& Q, miller_lines& lines)
{
    g2::element Q_neg{ Q.x, -Q.y, fq2::field_t::one };
    // g2::__neg(Q, Q_neg);
    g2::element work_point;
    g2::element result_point;
    g2::copy(Q, work_point);
    g2::copy(Q, result_point);

    size_t it = 0;
    for (size_t i = 0; i < loop_length; ++i) {
        doubling_step_for_flipped_miller_loop(work_point, lines.lines[it]);
        ++it;
        if (loop_bits[i] == 1) {
            mixed_addition_step_for_flipped_miller_loop(Q, work_point, lines.lines[it]);
            ++it;
        } else if (loop_bits[i] == 3) {
            mixed_addition_step_for_flipped_miller_loop(Q_neg, work_point, lines.lines[it]);
            ++it;
        }
    }

    g2::element Q1;
    g2::element Q2;
    mul_by_q(Q, Q1);
    mul_by_q(Q1, Q2);
    g2::__neg(Q2, Q2);
    // fq2::__neg(Q2.y, Q2.y);
    // fq2::__copy(Q2.x, Q2.x);
    // Q2.z = fq2::one;
    mixed_addition_step_for_flipped_miller_loop(Q1, work_point, lines.lines[it]);
    ++it;
    mixed_addition_step_for_flipped_miller_loop(Q2, work_point, lines.lines[it]);
}

fq12::field_t miller_loop(g1::element& P, miller_lines& lines)
{
    fq12::field_t work_scalar = fq12::one;

    size_t it = 0;
    fq12::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i) {
        fq12::sqr(work_scalar, work_scalar);

        work_line.o = lines.lines[it].o;
        work_line.vw = lines.lines[it].vw.mul_by_fq(P.y);
        work_line.vv = lines.lines[it].vv.mul_by_fq(P.x);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
        ++it;

        if (loop_bits[i] != 0) {
            work_line.o = lines.lines[it].o;
            work_line.vw = lines.lines[it].vw.mul_by_fq(P.y);
            work_line.vv = lines.lines[it].vv.mul_by_fq(P.x);
            fq12::sparse_mul(work_scalar, work_line, work_scalar);
            ++it;
        }
    }

    work_line.o = lines.lines[it].o;
    work_line.vw = lines.lines[it].vw.mul_by_fq(P.y);
    work_line.vv = lines.lines[it].vv.mul_by_fq(P.x);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    work_line.o = lines.lines[it].o;
    work_line.vw = lines.lines[it].vw.mul_by_fq(P.y);
    work_line.vv = lines.lines[it].vv.mul_by_fq(P.x);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    return work_scalar;
}

fq12::field_t miller_loop_batch(const g1::element* points, const miller_lines* lines, size_t num_pairs)
{
    fq12::field_t work_scalar = fq12::one;

    size_t it = 0;
    fq12::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i) {
        fq12::sqr(work_scalar, work_scalar);

        for (size_t j = 0; j < num_pairs; ++j) {
            work_line.o = lines[j].lines[it].o;
            work_line.vw = lines[j].lines[it].vw.mul_by_fq(points[j].y);
            work_line.vv = lines[j].lines[it].vv.mul_by_fq(points[j].x);

            fq12::sparse_mul(work_scalar, work_line, work_scalar);
        }
        ++it;
        if (loop_bits[i] != 0) {
            for (size_t j = 0; j < num_pairs; ++j) {
                work_line.o = lines[j].lines[it].o;
                work_line.vw = lines[j].lines[it].vw.mul_by_fq(points[j].y);
                work_line.vv = lines[j].lines[it].vv.mul_by_fq(points[j].x);
                fq12::sparse_mul(work_scalar, work_line, work_scalar);
            }
            ++it;
        }
    }

    for (size_t j = 0; j < num_pairs; ++j) {
        work_line.o = lines[j].lines[it].o;
        work_line.vw = lines[j].lines[it].vw.mul_by_fq(points[j].y);
        work_line.vv = lines[j].lines[it].vv.mul_by_fq(points[j].x);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    for (size_t j = 0; j < num_pairs; ++j) {
        work_line.o = lines[j].lines[it].o;
        work_line.vw = lines[j].lines[it].vw.mul_by_fq(points[j].y);
        work_line.vv = lines[j].lines[it].vv.mul_by_fq(points[j].x);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    return work_scalar;
}

void final_exponentiation_easy_part(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t a;
    fq12::field_t b;

    fq12::copy(elt, a);
    fq6::__neg(a.c1, a.c1);
    fq12::invert(elt, b);
    fq12::mul(a, b, a);
    fq12::frobenius_map_two(a, b);
    fq12::mul(a, b, r);
}

void final_exponentiation_exp_by_neg_z(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t scalar;
    fq12::copy(elt, scalar);
    fq12::copy(elt, r);

    for (size_t i = 0; i < neg_z_loop_length; ++i) {
        fq12::cyclotomic_squared(r, r);
        if (neg_z_loop_bits[i]) {
            fq12::mul(r, scalar, r);
        }
    }
    fq12::unitary_inverse(r, r);
}

void final_exponentiation_tricky_part(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t A;
    fq12::field_t B;
    fq12::field_t C;
    fq12::field_t D;
    fq12::field_t E;
    fq12::field_t F;
    fq12::field_t G;
    fq12::field_t H;
    fq12::field_t I;
    fq12::field_t J;
    fq12::field_t K;
    fq12::field_t L;
    fq12::field_t M;
    fq12::field_t N;
    fq12::field_t O;
    fq12::field_t P;
    fq12::field_t Q;
    fq12::field_t R;
    fq12::field_t S;
    fq12::field_t T;
    fq12::field_t U;

    final_exponentiation_exp_by_neg_z(elt, A);
    fq12::cyclotomic_squared(A, B);
    fq12::cyclotomic_squared(B, C);
    fq12::mul(C, B, D);

    final_exponentiation_exp_by_neg_z(D, E);
    fq12::cyclotomic_squared(E, F);

    final_exponentiation_exp_by_neg_z(F, G);
    fq12::unitary_inverse(D, H);
    fq12::unitary_inverse(G, I);
    fq12::mul(I, E, J);
    fq12::mul(H, J, K);
    fq12::mul(B, K, L);
    fq12::mul(E, K, M);
    fq12::mul(M, elt, N);
    fq12::frobenius_map_one(L, O);
    fq12::mul(O, N, P);
    fq12::frobenius_map_two(K, Q);
    fq12::mul(P, Q, R);
    fq12::unitary_inverse(elt, S);
    fq12::mul(L, S, T);
    fq12::frobenius_map_three(T, U);
    fq12::mul(R, U, r);
}

fq12::field_t reduced_ate_pairing(const g1::affine_element& P_affine, const g2::affine_element& Q_affine)
{
    g1::element P;
    g2::element Q;
    g1::affine_to_jacobian(P_affine, P);
    g2::affine_to_jacobian(Q_affine, Q);

    miller_lines lines;
    precompute_miller_lines(Q, lines);

    fq12::field_t result = miller_loop(P, lines);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    return result;
}

fq12::field_t reduced_ate_pairing_batch_precomputed(const g1::affine_element* P_affines,
                                                    const miller_lines* lines,
                                                    size_t num_points)
{
    g1::element* P = new g1::element[num_points];
    for (size_t i = 0; i < num_points; ++i) {
        g1::affine_to_jacobian(P_affines[i], P[i]);
    }
    fq12::field_t result = miller_loop_batch(&P[0], &lines[0], num_points);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    delete[] P;
    return result;
}

fq12::field_t reduced_ate_pairing_batch(const g1::affine_element* P_affines,
                                        const g2::affine_element* Q_affines,
                                        size_t num_points)
{
    g1::element* P = new g1::element[num_points];
    g2::element* Q = new g2::element[num_points];
    miller_lines* lines = new miller_lines[num_points];
    for (size_t i = 0; i < num_points; ++i) {
        g1::affine_to_jacobian(P_affines[i], P[i]);
        g2::affine_to_jacobian(Q_affines[i], Q[i]);

        precompute_miller_lines(Q[i], lines[i]);
    }

    fq12::field_t result = miller_loop_batch(&P[0], &lines[0], num_points);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    delete[] P;
    delete[] Q;
    delete[] lines;
    return result;
}

} // namespace pairing
} // namespace barretenberg
