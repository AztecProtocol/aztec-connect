#pragma once
#include "../waffle/composer/standard_composer.hpp"
#include "../waffle/proof_system/prover/prover.hpp"
#include "../waffle/stdlib/bool/bool.hpp"
#include "../waffle/stdlib/uint32/uint32.hpp"
#include "ast.hpp"
#include "error_handler.hpp"
//#include <iostream>
#include <map>
#include <vector>

namespace noir {
namespace code_gen {

using waffle::StandardComposer;
namespace stdlib = plonk::stdlib;
typedef stdlib::field_t<StandardComposer> field_t;
typedef stdlib::bool_t<StandardComposer> bool_t;
typedef stdlib::witness_t<StandardComposer> witness_t;
typedef stdlib::uint32<StandardComposer> uint32;
typedef boost::variant<bool_t, uint32> var_t;

namespace {
struct var_t_printer : boost::static_visitor<> {
    template <typename T> void operator()(T const& v, std::ostream& os) const { os << v; }
};

inline std::ostream& operator<<(std::ostream& os, var_t const& v)
{
    auto vos = boost::variant<std::ostream&>(os);
    boost::apply_visitor(var_t_printer(), v, vos);
    return os;
}
} // namespace

class SymbolTable {
  public:
    template <typename T> void operator()(T const& var, std::string const& key)
    {
        auto existing = variables_[key];
        if (!boost::get<T>(&existing)) {
            throw std::runtime_error("Cannot assign, incompatible types.");
        }
        variables_[key] = var;
        // std::cout << "SYMBOL TABLE: " << key << " = " << var.witness_bool << std::endl;
    }

    void set(var_t const& var, std::string const& key)
    {
        boost::apply_visitor(*this, var, boost::variant<std::string const>(key));
    }

    var_t const& operator[](std::string const& key) { return variables_[key]; }

  private:
    std::map<std::string const, var_t> variables_;
};

class ExpressionVisitor {
  public:
    typedef var_t result_type;

    ExpressionVisitor(StandardComposer& composer, SymbolTable& symbol_table);

    var_t operator()(ast::nil) const
    {
        BOOST_ASSERT(0);
        throw std::runtime_error("No.");
    }
    var_t operator()(unsigned int x);
    var_t operator()(bool x);
    var_t operator()(ast::variable const& x);
    var_t operator()(var_t lhs, ast::operation const& x);
    var_t operator()(ast::unary const& x);
    var_t operator()(ast::expression const& x);
    var_t operator()(ast::assignment const& x);

  private:
    waffle::StandardComposer& composer_;
    SymbolTable& symbol_table_;
};

struct compiler {
    typedef void result_type;

    compiler(StandardComposer& composer);

    void operator()(ast::variable_declaration const& x);
    void operator()(ast::assignment const& x);
    void operator()(ast::statement_list const& x);
    void operator()(ast::statement const& x);

    waffle::Prover start(ast::statement_list const& x);

  private:
    waffle::StandardComposer& composer_;
    SymbolTable symbol_table_;
};

} // namespace code_gen
} // namespace noir
