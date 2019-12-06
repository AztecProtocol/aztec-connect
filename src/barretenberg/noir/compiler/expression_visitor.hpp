#pragma once
#include "compiler_context.hpp"
#include "symbol_table.hpp"
#include "types.hpp"
#include "../ast.hpp"

namespace noir {
namespace code_gen {

class ExpressionVisitor {
  public:
    typedef var_t result_type;

    ExpressionVisitor(CompilerContext& context);

    var_t operator()(ast::nil) const
    {
        BOOST_ASSERT(0);
        throw std::runtime_error("No.");
    }
    var_t operator()(unsigned int x);
    var_t operator()(bool x);
    var_t operator()(std::vector<unsigned int> const& x);
    var_t operator()(std::vector<bool> const& x);
    var_t operator()(std::vector<std::string> const& x);
    var_t operator()(ast::variable const& x);
    var_t operator()(ast::function_call const& x);
    var_t operator()(var_t lhs, ast::operation const& x);
    var_t operator()(ast::unary const& x);
    var_t operator()(ast::expression const& x);
    var_t operator()(ast::assignment const& x);
    var_t operator()(ast::constant const& x);
    var_t operator()(ast::array const& x);

  private:
    CompilerContext& ctx_;
};

} // namespace code_gen
} // namespace noir