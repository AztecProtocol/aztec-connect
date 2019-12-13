#pragma once
#include "ast.hpp"
#include "config.hpp"
#include "skipper.hpp"

namespace noir {
namespace parser {

template <typename T, typename AST> AST parse(parser::iterator_type begin, parser::iterator_type end, T const& parser)
{
    AST ast;

    using boost::spirit::x3::with;
    using parser::error_handler_type;
    error_handler_type error_handler(begin, end, std::cerr);

    // we pass our error handler to the parser so we can access it later on in our on_error and on_sucess handlers.
    auto const eparser = with<parser::error_handler_tag>(std::ref(error_handler))[parser];

    bool success = phrase_parse(begin, end, eparser, space_comment, ast);

    if (!success || begin != end) {
        throw std::runtime_error("Parser failed at: " + std::string(begin, begin + 10));
    }

    return ast;
}

inline ast::statement_list parse(std::string const& source)
{
    return parse<statement_type, ast::statement_list>(source.begin(), source.end(), statement());
}

inline ast::function_statement_list parse_function_statements(std::string const& source)
{
    return parse<function_statement_type, ast::function_statement_list>(
        source.begin(), source.end(), function_statement());
}

} // namespace parser
} // namespace noir