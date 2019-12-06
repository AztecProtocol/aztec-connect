#pragma once

namespace noir {
namespace code_gen {

struct EqualityVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array equality.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs == rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot compare differing types.");
    }
};

struct BitwiseOrVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs | rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot OR differing types.");
    }
};

struct BitwiseAndVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs & rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot AND differing types.");
    }
};

struct BitwiseXorVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&, std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    template <typename T> var_t operator()(T const& lhs, T const& rhs) const { return lhs ^ rhs; }
    template <typename T, typename U> var_t operator()(T const&, U const&) const
    {
        throw std::runtime_error("Cannot XOR differing types.");
    }
};

struct NegVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const&) const { throw std::runtime_error("Cannot neg bool."); }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot neg uint32."); }
};

struct NotVis : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const& var) const { return !var; }
    var_t operator()(uint32 const&) const { throw std::runtime_error("Cannot NOT a uint."); }
};

struct BitwiseNotVisitor : boost::static_visitor<var_t> {
    template <typename T> var_t operator()(std::vector<T> const&) const
    {
        throw std::runtime_error("No array support.");
    }
    var_t operator()(bool_t const& var) const { return bool_t(witness_t(var.context, var.value())); }
    var_t operator()(uint32 const&) const { throw std::runtime_error("No."); }
};

} // namespace code_gen
} // namespace noir