#include "expression_visitor.hpp"
#include "function_call.hpp"
#include "function_statement_visitor.hpp"
#include "operators.hpp"
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
    if (!boost::get<int_type>(&target_type_.type)) {
        throw std::runtime_error(format("Cannot create type %s from constant %d.", target_type_.type_name(), x));
    }
    return var_t(uint32(&ctx_.composer, x), target_type_);
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
    std::cout << "array def " << x.size() << std::endl;
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

    case ast::op_index: {
        std::cout << "op_index" << std::endl;

        // Evaluate index.
        uint32* iptr = boost::get<uint32>(&rhs);
        if (!iptr) {
            throw std::runtime_error("Index must be an integer.");
        }
        uint32_t i = (*iptr).get_value();

        return boost::apply_visitor(IndexVisitor(), lhs, boost::variant<unsigned int>(i));
    }
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
    std::cout << "variable " << x.name << std::endl;
    return ctx_.symbol_table[x.name];
}

var_t ExpressionVisitor::operator()(ast::assignment const& x)
{
    std::cout << "get symbol ref for assign " << x.lhs.name << std::endl;
    var_t const& lhs = ctx_.symbol_table[x.lhs.name];

    // If our lhs has indexes, we need to get the ref to indexed element.
    if (x.lhs.indexes.size()) {
        if (x.lhs.indexes.size() > 1) {
            throw std::runtime_error("Multidimensional arrays not yet supported.");
        }

        // Evaluate index.
        auto ivar = ExpressionVisitor(ctx_, type_uint32)(x.lhs.indexes[0]);

        uint32_t i = boost::get<uint32>(ivar.value).get_value();

        auto arr = boost::get<array_type>(lhs.type.type);
        if (i >= arr.size) {
            throw std::runtime_error("Index out of bounds.");
        }

        // Evaluate rhs of assignment, should resolve to lhs element type.
        var_t rhs = ExpressionVisitor(ctx_, arr.element_type)(x.rhs);

        std::cout << format("op_store %s[%d] ", x.lhs.name, i) << rhs << std::endl;
        auto vec = boost::get<std::vector<var_t>>(lhs.value);
        return vec[i] = rhs;
    } else {
        var_t rhs = ExpressionVisitor(ctx_, lhs.type)(x.rhs);
        std::cout << "op_store " << x.lhs.name << " " << rhs << std::endl;
        ctx_.symbol_table.set(rhs, x.lhs.name);
        return rhs;
    }
}

var_t ExpressionVisitor::operator()(ast::function_call const& x)
{
    std::cout << "function call " << x.name << std::endl;
    auto func = function_lookup(ctx_, x.name, x.args.size());

    std::vector<var_t> args;
    for (size_t i = 0; i < x.args.size(); ++i) {
        var_t arg = ExpressionVisitor(ctx_, func.args[i].type)(x.args[i]);
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