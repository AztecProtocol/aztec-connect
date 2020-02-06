#include "leveldb_store.hpp"
#include "hash.hpp"
#include "../int_utils.hpp"
#include <iostream>
#include <sstream>

namespace plonk {
namespace stdlib {
namespace merkle_tree {

using namespace int_utils;

namespace {
barretenberg::fr::field_t from_string(std::string const& data, size_t offset = 0)
{
    barretenberg::fr::field_t result;
    std::copy(data.data() + offset, data.data() + offset + sizeof(barretenberg::fr::field_t), (char*)result.data);
    return result;
}
} // namespace

LevelDbStore::LevelDbStore(std::string const& db_path, size_t depth)
    : depth_(depth)
{
    ASSERT(depth_ >= 1 && depth <= 128);
    total_size_ = 1ULL << depth_;
    zero_hashes_.resize(depth);

    leveldb::DB* db;
    leveldb::Options options;
    options.create_if_missing = true;
    options.compression = leveldb::kNoCompression;
    leveldb::Status status = leveldb::DB::Open(options, db_path, &db);
    assert(status.ok());
    db_.reset(db);

    // Compute the zero values at each layer.
    auto current = sha256({ barretenberg::fr::zero });
    for (size_t i = 0; i < depth; ++i) {
        zero_hashes_[i] = current;
        // std::cout << "zero hash level " << i << ": " << current << std::endl;
        current = hash({ current, current });
    }

    std::string root;
    status = db->Get(leveldb::ReadOptions(), "root", &root);
    if (!status.ok()) {
        root_ = current;
    } else {
        root_ = from_string(root);
    };
}

barretenberg::fr::field_t LevelDbStore::root() const
{
    return root_;
}

fr_hash_path LevelDbStore::get_hash_path(index_t index)
{
    fr_hash_path path(depth_);

    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root_, 32), &data);

    for (size_t i = depth_ - 1; i < depth_; --i) {
        if (!status.ok()) {
            // This is an empty subtree. Fill in zero value.
            path[i] = std::make_pair(zero_hashes_[i], zero_hashes_[i]);
            continue;
        }

        if (data.size() == 64) {
            // This is a regular node with left and right trees. Descend according to index path.
            auto left = from_string(data, 0);
            auto right = from_string(data, 32);
            path[i] = std::make_pair(left, right);
            bool is_right = (index >> i) & 0x1;
            status = db_->Get(leveldb::ReadOptions(), data.substr(is_right * 32, 32), &data);
        } else {
            // This is a stump. The hash path can be fully restored from this node.
            index_t element_index = *(index_t*)(data.data() + 32);
            fr::field_t current = from_string(data, 0);
            for (size_t j = 0; j <= i; ++j) {
                bool is_right = (element_index >> j) & 0x1;
                if (is_right) {
                    path[j] = std::make_pair(zero_hashes_[j], current);
                } else {
                    path[j] = std::make_pair(current, zero_hashes_[j]);
                }
                current = hash({ path[j].first, path[j].second });
            }
            break;
        }
    }

    return path;
}

fr::field_t LevelDbStore::get_element(index_t index)
{
    fr::field_t leaf = get_element(root_, index, depth_);
    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&leaf, 32), &data);
    return status.ok() ? from_string(data) : fr::zero;
}

fr::field_t LevelDbStore::get_element(fr::field_t const& root, index_t index, size_t height)
{
    if (height == 0) {
        return root;
    }

    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root, 32), &data);

    if (!status.ok()) {
        return zero_hashes_[0];
    }

    if (data.size() < 64) {
        index_t existing_index = *(index_t*)(data.data() + 32);
        fr::field_t existing_value = from_string(data, 0);
        return (existing_index == index) ? existing_value : zero_hashes_[0];
    } else {
        bool is_right = (index >> (height - 1)) & 0x1;
        fr::field_t subtree_root = from_string(data, is_right * 32);
        return get_element(subtree_root, index, height - 1);
    }
}

void LevelDbStore::update_element(index_t index, fr::field_t const& value)
{
    // std::cout << "PRE UPDATE ROOT: " << root_ << std::endl;
    leveldb::WriteBatch batch;
    fr::field_t sha_leaf = sha256({ value });
    batch.Put(leveldb::Slice((char*)&sha_leaf, 32), leveldb::Slice((char*)&value, 32));
    root_ = update_element(root_, sha_leaf, index, depth_, batch);
    db_->Write(leveldb::WriteOptions(), &batch);
    // std::cout << "POST UPDATE ROOT: " << root_ << std::endl;
    // std::cout << std::endl;
}

fr::field_t LevelDbStore::binary_put(
    index_t a_index, fr::field_t const& a, fr::field_t const& b, size_t height, leveldb::WriteBatch& batch)
{
    bool a_is_right = (a_index >> (height - 1)) & 0x1;
    auto left = a_is_right ? b : a;
    auto right = a_is_right ? a : b;
    auto key = hash({ left, right });
    put(key, left, right, batch);
    // std::cout << "BINARY PUT height: " << height << " key:" << key << " left:" << left << " right:" << right
    //<< std::endl;
    return key;
}

fr::field_t LevelDbStore::fork_stump(fr::field_t const& value1,
                                     index_t index1,
                                     fr::field_t const& value2,
                                     index_t index2,
                                     size_t height,
                                     size_t common_height,
                                     leveldb::WriteBatch& batch)
{
    if (height == common_height) {
        if (height == 1) {
            // std::cout << "Stump forked into leaves." << std::endl;
            return binary_put(index1, value1, value2, height, batch);
        } else {
            size_t stump_height = height - 1;
            // std::cout << "Stump forked into two at height " << stump_height << " index1 " << (uint64_t)index1
            //           << " index2 " << (uint64_t)index2 << std::endl;
            fr::field_t stump1_hash = compute_zero_path_hash(stump_height, index1, value1);
            fr::field_t stump2_hash = compute_zero_path_hash(stump_height, index2, value2);
            put_stump(stump1_hash, index1, value1, batch);
            put_stump(stump2_hash, index2, value2, batch);
            return binary_put(index1, stump1_hash, stump2_hash, height, batch);
        }
    } else {
        auto new_root = fork_stump(value1, index1, value2, index2, height - 1, common_height, batch);
        // std::cout << "Stump branch hash at " << height << " " << new_root << " " << zero_hashes_[height] <<
        // std::endl;
        return binary_put(index1, new_root, zero_hashes_[height - 1], height, batch);
    }
}

fr::field_t LevelDbStore::update_element(
    fr::field_t const& root, fr::field_t const& value, index_t index, size_t height, leveldb::WriteBatch& batch)
{
    // std::cout << "update_element root:" << root << " value:" << value << " index:" << (uint64_t)index
    //           << " height:" << height << std::endl;
    if (height == 0) {
        return value;
    }

    std::string data;
    auto status = db_->Get(leveldb::ReadOptions(), leveldb::Slice((char*)&root, 32), &data);

    if (!status.ok()) {
        // std::cout << "Adding new stump at height " << height << std::endl;
        fr::field_t key = compute_zero_path_hash(height, index, value);
        put_stump(key, index, value, batch);
        return key;
    }

    // std::cout << "got data of size " << data.size() << std::endl;
    if (data.size() < 64) {
        // We've come across a stump.
        index_t existing_index = *(index_t*)(data.data() + 32);

        if (existing_index == index) {
            // We are updating the stumps element. Easy update.
            // std::cout << "Updating existing stump element at index " << index << std::endl;
            fr::field_t new_hash = compute_zero_path_hash(height, index, value);
            put_stump(new_hash, existing_index, value, batch);
            return new_hash;
        }

        fr::field_t existing_value = from_string(data, 0);
        size_t common_bits = count_leading_zeros(keep_n_lsb(existing_index, height) ^ keep_n_lsb(index, height));
        size_t ignored_bits = sizeof(index_t) * 8 - height;
        size_t common_height = height - (common_bits - ignored_bits);
        // std::cout << height << " " << common_bits << " " << ignored_bits << " " << (uint64_t)existing_index << " "
        //           << (uint64_t)index << " " << common_height << std::endl;

        return fork_stump(existing_value, existing_index, value, index, height, common_height, batch);
    } else {
        bool is_right = (index >> (height - 1)) & 0x1;
        // std::cout << "is_right:" << is_right << std::endl;
        fr::field_t subtree_root = from_string(data, is_right * 32);
        subtree_root = update_element(subtree_root, value, index, height - 1, batch);
        auto left = from_string(data, 0);
        auto right = from_string(data, 32);
        if (is_right) {
            right = subtree_root;
        } else {
            left = subtree_root;
        }
        auto new_root = hash({ left, right });
        put(new_root, left, right, batch);
        // TODO: Perhaps delete old node?
        return new_root;
    }
}

fr::field_t LevelDbStore::compute_zero_path_hash(size_t height, index_t index, fr::field_t const& value)
{
    fr::field_t current = value;
    for (size_t i = 0; i < height; ++i) {
        bool is_right = (index >> i) & 0x1;
        fr::field_t left, right;
        if (is_right) {
            left = zero_hashes_[i];
            right = current;
        } else {
            right = zero_hashes_[i];
            left = current;
        }
        current = hash({ is_right ? zero_hashes_[i] : current, is_right ? current : zero_hashes_[i] });
    }
    return current;
}

void LevelDbStore::put(fr::field_t key, fr::field_t left, fr::field_t right, leveldb::WriteBatch& batch)
{
    std::ostringstream os;
    os.write((char*)left.data, 32);
    os.write((char*)right.data, 32);
    batch.Put(leveldb::Slice((char*)key.data, 32), os.str());
    // std::cout << "PUT key:" << key << " left:" << left << " right:" << right << std::endl;
}

void LevelDbStore::put_stump(fr::field_t key, index_t index, fr::field_t value, leveldb::WriteBatch& batch)
{
    std::ostringstream os;
    os.write((char*)value.data, 32);
    os.write((char*)&index, sizeof(index_t));
    batch.Put(leveldb::Slice((char*)key.data, 32), os.str());
    // std::cout << "PUT STUMP key:" << key << " index:" << index << " value:" << value << std::endl;
}

} // namespace merkle_tree
} // namespace stdlib
} // namespace plonk