#include "ast.hpp"
#include "config.hpp"

namespace noir {

ast::statement_list parse(std::string const& source);
ast::statement_list parse(parser::iterator_type begin, parser::iterator_type end);

} // namespace noir