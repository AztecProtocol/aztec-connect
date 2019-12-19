#include "expression_visitor.hpp"
#include "function_call.hpp"
#include "function_statement_visitor.hpp"
#include "operators.hpp"
#include "type_info_from.hpp"
#include <boost/format.hpp>
#include <iostream>

namespace noir {
namespace code_gen {

ExpressionVisitor::ExpressionVisitor(CompilerContext& ctx, type_info const& target_type)
    : ctx_(ctx)
    , target_type_(target_type)
{}

var_t ExpressionVisitor::operator()(unsigned int x)
{
    std::cout << format("uint constant (target type %s): %d", target_type_, x) << std::endl;
    auto it = boost::get<int_type>(&target_type_.type);
    if (!it) {
        throw std::runtime_error(format("Cannot create type %s from constant %d.", target_type_.type_name(), x));
    }
    return var_t(uint(it->width, &ctx_.composer, x), target_type_);
}

var_t ExpressionVisitor::operator()(bool x)
{
    std::cout << "bool " << x << std::endl;
    if (!boost::get<bool_type>(&target_type_.type)) {
        throw std::runtime_error(format("Cannot create type %s from constant %d.", target_type_.type_name(), x));
    }
    return var_t(bool_t(&ctx_.composer, x), target_type_);
}

var_t ExpressionVisitor::operator()(ast::array const& x)
{
    std::cout << "defining array of size " << x.size() << std::endl;
    auto arr = boost::get<array_type>(&target_type_.type);
    if (!arr) {
        throw std::runtime_error(format("Cannot create type %s from array.", target_type_.type_name()));
    }
    std::vector<var_t> result;
    std::transform(x.begin(), x.end(), std::back_inserter(result), [this, arr](ast::expression const& e) {
        return ExpressionVisitor(ctx_, arr->element_type)(e);
    });

    return var_t(result, target_type_);
}

var_t ExpressionVisitor::operator()(var_t vlhs, ast::operation const& x)
{
    if (x.operator_ == ast::op_index) {
        std::cout << "op_index" << std::endl;

        auto rhs = boost::apply_visitor(ExpressionVisitor(ctx_, type_uint32), x.operand_);

        // Evaluate index.
        uint* iptr = boost::get<uint>(&rhs.value);
        if (!iptr) {
            throw std::runtime_error("Index must be an integer.");
        }
        uint32_t i = static_cast<uint32_t>((*iptr).get_value());

        return boost::apply_visitor(IndexVisitor(i), vlhs.value);
    }

    var_t vrhs = boost::apply_visitor(*this, x.operand_);
    auto lhs = vlhs.value;
    auto rhs = vrhs.value;

    switch (x.operator_) {
    case ast::op_plus:
        std::cout << "op_add" << std::endl;
        return boost::apply_visitor(AdditionVisitor(), lhs, rhs);
    case ast::op_minus:
        std::cout << "op_sub" << std::endl;
        return boost::apply_visitor(SubtractionVisitor(), lhs, rhs);
    case ast::op_times:
        std::cout << "op_times" << std::endl;
        return boost::apply_visitor(MultiplyVisitor(), lhs, rhs);
    case ast::op_divide:
        std::cout << "op_divide" << std::endl;
        return boost::apply_visitor(DivideVisitor(), lhs, rhs);
    case ast::op_mod:
        std::cout << "op_mod" << std::endl;
        return boost::apply_visitor(ModVisitor(), lhs, rhs);

    case ast::op_equal:
        std::cout << "op_equal" << std::endl;
        return boost::apply_visitor(EqualityVisitor(), lhs, rhs);
    case ast::op_not_equal:
        std::cout << "op_ne" << std::endl;
        break;
    case ast::op_less:
        std::cout << "op_lt" << std::endl;
        break;
    case ast::op_less_equal:
        std::cout << "op_lte" << std::endl;
        break;
    case ast::op_greater:
        std::cout << "op_gt" << std::endl;
        break;
    case ast::op_greater_equal:
        std::cout << "op_gte" << std::endl;
        break;

    case ast::op_and:
        std::cout << "op_and" << std::endl;
        break;
    case ast::op_or:
        std::cout << "op_or" << std::endl;
        break;

    case ast::op_bitwise_and:
        std::cout << "op_bitwise_and" << std::endl;
        return boost::apply_visitor(BitwiseAndVisitor(), lhs, rhs);
    case ast::op_bitwise_or:
        std::cout << "op_bitwise_or" << std::endl;
        return boost::apply_visitor(BitwiseOrVisitor(), lhs, rhs);
    case ast::op_bitwise_xor:
        std::cout << "op_bitwise_xor" << std::endl;
        return boost::apply_visitor(BitwiseXorVisitor(), lhs, rhs);
    case ast::op_bitwise_ror:
        std::cout << "op_bitwise_ror" << std::endl;
        return boost::apply_visitor(BitwiseRorVisitor(), lhs, rhs);
    case ast::op_bitwise_rol:
        std::cout << "op_bitwise_rol" << std::endl;
        return boost::apply_visitor(BitwiseRolVisitor(), lhs, rhs);

    default:
        BOOST_ASSERT(0);
    }

    return vlhs;
}

var_t ExpressionVisitor::operator()(ast::unary const& x)
{
    var_t var = (*this)(x.operand_);

    switch (x.operator_) {
    case ast::op_negative:
        std::cout << "op_neg" << std::endl;
        return boost::apply_visitor(NegVis(), var.value);
    case ast::op_not: {
        auto v = boost::apply_visitor(NotVis(), var.value);
        std::cout << "op_not " << var << "->" << v << std::endl;
        return v;
    }
    case ast::op_bitwise_not: {
        auto v = boost::apply_visitor(BitwiseNotVisitor(), var.value);
        std::cout << "op_make_witness " << std::endl;
        return v;
    }
    case ast::op_positive:
        return var;
    default:
        throw std::runtime_error("Unknown operator.");
    }
}

var_t ExpressionVisitor::operator()(ast::expression const& x)
{
    var_t var = boost::apply_visitor(*this, x.first);
    for (ast::operation const& oper : x.rest) {
        var = (*this)(var, oper);
    }
    return var;
}

var_t ExpressionVisitor::operator()(ast::variable const& x)
{
    auto v = ctx_.symbol_table[x.name];
    std::cout << "variable " << x.name << ": " << v << std::endl;
    return v;
}

struct IndexedAssignVisitor : boost::static_visitor<var_t> {
    IndexedAssignVisitor(CompilerContext& ctx, size_t i, ast::expression const& rhs_expr, type_info const& ti)
        : ctx(ctx)
        , i(i)
        , rhs_expr(rhs_expr)
        , ti(ti)
    {}

    template <typename T> var_t operator()(std::vector<T>& lhs) const
    {
        // Evaluate rhs of assignment, should resolve to lhs element type.
        auto arr = boost::get<array_type>(ti.type);
        var_t rhs = ExpressionVisitor(ctx, arr.element_type)(rhs_expr);
        std::cout << "indexed assign " << i << " " << lhs[i] << "->" << rhs << std::endl;
        return lhs[i] = rhs;
    }

    var_t operator()(uint& lhs) const
    {
        // Evaluate rhs of assignment, should resolve to bool.
        var_t rhs = ExpressionVisitor(ctx, type_bool)(rhs_expr);
        bool bit = boost::get<bool_t>(rhs.value).get_value();
        uint target_bit = (uint(lhs.width(), 1ULL) << (lhs.width() - i - 1));
        if (bit) {
            lhs = lhs | target_bit;
        } else {
            lhs = lhs & ~target_bit;
        }
        std::cout << "indexed assign bit " << i << " to " << bit << " = " << lhs << std::endl;
        return bit;
    }

    template <typename T> var_t operator()(T const& t) const
    {
        throw std::runtime_error(format("Unsupported type in indexed assign: %s", typeid(t).name()));
    }

    CompilerContext& ctx;
    size_t i;
    ast::expression const& rhs_expr;
    type_info const& ti;
};

var_t ExpressionVisitor::operator()(ast::assignment const& x)
{
    std::cout << "get symbol ref for assign " << x.lhs.name << std::endl;
    var_t* lhs = &ctx_.symbol_table[x.lhs.name];

    // If our lhs has indexes, we need to get the ref to indexed element.
    if (x.lhs.indexes.size()) {
        for (size_t j = 0; j < x.lhs.indexes.size() - 1; ++j) {
            // Evaluate index.
            auto ivar = ExpressionVisitor(ctx_, type_uint32)(x.lhs.indexes[0]);
            auto i = boost::get<uint>(ivar.value).get_value();
            auto arr = boost::get<array_type>(lhs->type.type);
            if (i >= arr.size) {
                throw std::runtime_error("Index out of bounds.");
            }
            lhs = &boost::get<std::vector<var_t>>(lhs->value)[i];
            std::cout << "indexed to new lhs: " << *lhs << std::endl;
        }

        // Evaluate final index.
        auto ivar = ExpressionVisitor(ctx_, type_uint32)(x.lhs.indexes.back());
        auto i = boost::get<uint>(ivar.value).get_value();

        return boost::apply_visitor(IndexedAssignVisitor(ctx_, i, x.rhs, lhs->type), lhs->value);
    } else {
        var_t rhs = ExpressionVisitor(ctx_, lhs->type)(x.rhs);
        std::cout << "op_store " << x.lhs.name << " " << rhs << std::endl;
        ctx_.symbol_table.set(rhs, x.lhs.name);
        return rhs;
    }
}

var_t ExpressionVisitor::operator()(ast::function_call const& x)
{
    std::cout << "function call " << x.name << std::endl;

    auto builtin = builtin_lookup(ctx_, x.name);
    if (builtin) {
        std::vector<var_t> args;
        for (size_t i = 0; i < x.args.size(); ++i) {
            // We need differing types here, but for now just trying to get length() working.
            var_t arg = ExpressionVisitor(ctx_, type_uint32)(x.args[i]);
            args.push_back(arg);
        }
        return builtin(args);
    }

    auto func = function_lookup(ctx_, x.name, x.args.size());

    std::vector<var_t> args;
    for (size_t i = 0; i < x.args.size(); ++i) {
        auto ti = type_info_from_type_id(func.args[i].type);
        var_t arg = ExpressionVisitor(ctx_, ti)(x.args[i]);
        args.push_back(arg);
    }

    return function_call(ctx_, func, args);
}

var_t ExpressionVisitor::operator()(ast::constant const& x)
{
    return boost::apply_visitor(*this, x);
}

} // namespace code_gen
} // namespace noir