/*

inline g1::element sneaky_pippenger(uint64_t *scalars, g1::affine_element *points, size_t num_initial_points, size_t bits_per_bucket) noexcept
{
    multiplication_runtime_state state;
    state.num_points = num_initial_points + num_initial_points;
    state.num_rounds = WNAF_SIZE(bits_per_bucket + 1);
    state.num_buckets = (1 << bits_per_bucket);
    printf("num rounds = %lu\n", state.num_rounds);
    wnaf::wnaf_runtime_state_b wnaf_state;
    wnaf_state.bits_per_wnaf = bits_per_bucket + 1;
    wnaf_state.mask = (1 << (wnaf_state.bits_per_wnaf)) - 1;


    printf("allocating and zeroing memory\n");
    // allocate space for wnaf tables. We need 1 extra entry because our pointer iterator will overflow by 1 in the main loop
    wnaf_state.first_bucket_map = (uint32_t*)calloc((state.num_rounds + 1) * state.num_buckets + 1, sizeof(uint32_t));
    wnaf_state.first_bucket_sign_map = (bool*)calloc(sizeof(bool), (state.num_rounds + 1) * state.num_buckets + 1);
    wnaf_state.wnaf_sign_table = (bool*)calloc(sizeof(bool), state.num_rounds * state.num_points + 1);
    wnaf_state.wnaf_table = (uint32_t*)calloc(sizeof(uint32_t), state.num_rounds * state.num_points + 1);
    wnaf_state.point_indexer = (uint32_t*)calloc(sizeof(uint32_t), state.num_rounds * state.num_points + 1);
    wnaf_state.skew_table = (bool *)calloc(sizeof(bool), state.num_points + 10000);

    wnaf_state.wnaf_round_offsets = (size_t*)calloc(sizeof(size_t), state.num_rounds + 100000);
    for(size_t i = 0; i < state.num_rounds; ++i)
    {
        wnaf_state.wnaf_round_offsets[i] = 0;
    }

    printf("computing wnafs\n");
    for (size_t i = 0; i < num_initial_points; ++i)
    {
        fr::split_into_endomorphism_scalars(&scalars[i * 4], &scalars[i * 4], &scalars[i * 4 + 2]);
        wnaf::sneaky_fixed_wnaf(&scalars[i * 4], (2 * i), state.num_points, wnaf_state);
        wnaf::sneaky_fixed_wnaf(&scalars[i * 4 + 2], (2 * i + 1), state.num_points, wnaf_state);

        // wnaf::fixed_wnaf(&scalars[i * 4], &wnaf_state.wnaf_table[2 * i], skew_table[2 * i], state.num_points, bits_per_bucket + 1);
        // wnaf::fixed_wnaf(&scalars[i * 4 + 2], &wnaf_state.wnaf_table[2 * i + 1], skew_table[2 * i + 1], state.num_points, bits_per_bucket + 1);
    }
    printf("finished computing wnafs\n");
    printf("first wnaf entry is equal to %u\n", wnaf_state.wnaf_table[0]);
    printf("exited num_initial_points_loop\n");
    wnaf_state.wnaf_iterator = wnaf_state.wnaf_table;
    wnaf_state.wnaf_sign_iterator = wnaf_state.wnaf_sign_table;
    wnaf_state.point_iterator = wnaf_state.point_indexer;
    printf("setting infinity on accumulator\n");
    g1::set_infinity(state.accumulator);


    printf("computing next bucket index\n");
    wnaf_state.next_sign = *wnaf_state.wnaf_sign_iterator;
    wnaf_state.next_idx = *wnaf_state.wnaf_iterator;
    wnaf_state.next_point = *wnaf_state.point_iterator;
    printf("increasing iterators\n");
    ++wnaf_state.wnaf_iterator;
    ++wnaf_state.wnaf_sign_iterator;
    ++wnaf_state.point_iterator;
    // initialize buckets
    printf("allocating bucket memory\n");
    printf("num buckets = %lu\n", state.num_buckets);
    state.buckets = (g1::element *)aligned_alloc(32, sizeof(g1::element) * state.num_buckets);
    printf("calling update bucket\n");
    for (size_t i = 0; i < state.num_buckets; ++i)
    {
        update_bucket(state.buckets[i], points, wnaf_state.first_bucket_map[i], wnaf_state.first_bucket_sign_map[i]);
    }
    // printf("about to call main loop\n");
    for (size_t i = 0; i < state.num_rounds; ++i)
    {
        printf("round %lu\n", i);
        if (i == (state.num_rounds - 1))
        {
            for (size_t j = 0; j < state.num_points; ++j)
            {
                if (wnaf_state.skew_table[j])
                {
                    g1::mixed_sub(state.buckets[0], points[j + 1], state.buckets[0]);
                }   
            }
        }
        size_t end = state.num_points - (wnaf_state.wnaf_round_offsets[i]);  
        for (size_t j = 0; j < end; ++j)
        {
            // size_t point_index = wnaf_state.point_indexer[(i * state.num_points) + j] + 1;

            wnaf_state.current_idx = wnaf_state.next_idx;
            wnaf_state.current_sign = wnaf_state.next_sign;
            wnaf_state.current_point = wnaf_state.next_point;
            wnaf_state.next_sign = *wnaf_state.wnaf_sign_iterator;
            wnaf_state.next_idx = *wnaf_state.wnaf_iterator;
            wnaf_state.next_point = *wnaf_state.point_iterator;
            // sneaky_compute_next_bucket_index(wnaf_state);
            __builtin_prefetch(&state.buckets[wnaf_state.next_idx]);
            __builtin_prefetch(&points[wnaf_state.next_point]);
            // __builtin_prefetch(&state.buckets[wnaf_state.next_idx]);
            ++wnaf_state.wnaf_iterator;
            ++wnaf_state.wnaf_sign_iterator;
            ++wnaf_state.point_iterator;
            g1::conditional_negate_affine(&points[wnaf_state.current_point + 1], &state.addition_temporary, wnaf_state.current_sign);
            // assign_point_to_temp(&points[j], &temp, wnaf_state.current_sign);
            g1::mixed_add(state.buckets[wnaf_state.current_idx], state.addition_temporary, state.buckets[wnaf_state.current_idx]);
        }
        if (i > 0)
        {
            // we want to perform *bits_per_wnaf* number of doublings (i.e. bits_per_bucket + 1)
            // perform all but 1 of the point doubling ops here, we do the last one after accumulating buckets
            for (size_t j = 0; j < bits_per_bucket; ++j)
            {
                g1::dbl(state.accumulator, state.accumulator);
            }
        }
        printf("round main iteration finished, updating buckets\n");
        g1::set_infinity(state.running_sum);
        for (int j = state.num_buckets - 1; j > 0; --j)
        {
            g1::add(state.running_sum, state.buckets[(size_t)j], state.running_sum);
            g1::add(state.accumulator, state.running_sum, state.accumulator);
            update_bucket(state.buckets[(size_t)j], points, wnaf_state.first_bucket_map[((i + 1) * state.num_buckets) + (size_t)j], wnaf_state.first_bucket_sign_map[((i + 1) * state.num_buckets) + (size_t)j]);
        }
        g1::add(state.running_sum, state.buckets[0], state.running_sum);
        g1::dbl(state.accumulator, state.accumulator);
        g1::add(state.accumulator, state.running_sum, state.accumulator);
        update_bucket(state.buckets[0], points, wnaf_state.first_bucket_map[((i + 1) * state.num_buckets)], wnaf_state.first_bucket_sign_map[((i + 1) * state.num_buckets)]);
        wnaf_state.wnaf_iterator = wnaf_state.wnaf_table + (state.num_points * (i + 1));
        wnaf_state.wnaf_sign_iterator = wnaf_state.wnaf_sign_table + (state.num_points * (i + 1));
        wnaf_state.point_iterator = wnaf_state.point_indexer + (state.num_points * (i + 1));
        wnaf_state.next_sign = *wnaf_state.wnaf_sign_iterator;
        wnaf_state.next_idx = *wnaf_state.wnaf_iterator;
        wnaf_state.next_point = *wnaf_state.point_iterator;
        ++wnaf_state.wnaf_iterator;
        ++wnaf_state.wnaf_sign_iterator;
        ++wnaf_state.point_iterator;
        // if (wnaf_state.first_bucket_map[(i * state.num_buckets) + j] == 0)
        // {
        //     g1::set_infinity(state.buckets[(size_t)j]);
        // }
        // else
        // {
        //     g1::conditional_negate_affine(&points[wnaf_state.first_bucket_map[(i * state.num_buckets) + j]], (g1::affine_element*)&state.buckets[(size_t)j], wnaf_state.first_bucket_sign_map[(i * state.num_buckets) + j]);
        //     fq::one(state.buckets[(size_t)j].z);
        // }
        // g1::set_infinity(state.buckets[0]);
    }

    printf("finished pippenger, freeing memory\n");
    free(wnaf_state.wnaf_table);
    free(state.buckets);
    free(wnaf_state.skew_table);
    free(wnaf_state.first_bucket_map);
    free(wnaf_state.first_bucket_sign_map);
    free(wnaf_state.wnaf_sign_table);
    free(wnaf_state.point_indexer);
    free(wnaf_state.wnaf_round_offsets);
    // wnaf_state.first_bucket_map = (uint32_t*)calloc(state.num_rounds * state.num_buckets + 1, sizeof(uint32_t));
    // wnaf_state.first_bucket_sign_map = (bool*)malloc(sizeof(bool) * state.num_rounds * state.num_buckets + 1);
    // wnaf_state.wnaf_sign_table = (bool*)malloc(sizeof(bool) * state.num_rounds * state.num_points + 1);
    // wnaf_state.wnaf_table = (uint32_t*)malloc(sizeof(uint32_t) * state.num_rounds * state.num_points + 1);
    // wnaf_state.point_indexer = (uint32_t*)malloc(sizeof(uint32_t) * state.num_rounds * state.num_points + 1);
    // bool *skew_table = (bool *)malloc(sizeof(bool) * state.num_points);

    return state.accumulator;
}
*/

/*

inline void sneaky_generate_pippenger_point_table(g1::affine_element *points, g1::affine_element *table, size_t num_points)
{
    // iterate backwards, so that `points` and `table` can point to the same memory location
    for (size_t i = num_points - 1; i < num_points; --i)
    {
        g1::copy(&points[i], &table[i * 2 + 1]);
        fq::mul_beta(points[i].x, table[i * 2 + 2].x);
        fq::neg(points[i].y, table[i * 2 + 2].y);
    }
    g1::set_infinity(table[0]);
}

inline void update_bucket(g1::element& bucket, g1::affine_element* points, uint32_t first_bucket_entry, bool first_bucket_sign)
{
    // if (first_bucket_entry == 0)
    // {
    //     g1::set_infinity(bucket);
    // }
    // else
    // {
        g1::conditional_negate_affine(&points[first_bucket_entry], (g1::affine_element*)&bucket, first_bucket_sign);
        fq::one(bucket.z);
    // }
}


struct wnaf_runtime_state_b
{

    uint64_t current_sign;
    uint64_t next_sign;
    size_t current_idx;
    size_t next_idx;
    size_t bits_per_wnaf;
    uint64_t mask;

    uint32_t* wnaf_iterator;
    uint32_t* wnaf_sign_iterator;
    uint32_t* first_bucket_map;
    bool* first_bucket_sign_map;
    size_t* wnaf_round_offsets;

    bool* skew_table;
    uint32_t* wnaf_table;
};

inline void sneaky_compute_next_bucket_index(wnaf::wnaf_runtime_state_b &state)
{
    // uint32_t wnaf_entry = *state.wnaf_iterator;
    state.next_sign = *state.wnaf_sign_iterator;
    state.next_idx = *state.wnaf_iterator;
    // state.next_sign = (uint64_t)(wnaf_entry >> state.bits_per_wnaf) & 1; // 0 - sign_bit;
    // uint32_t sign_mask = 0 - state.next_sign;
    // state.next_idx = (((wnaf_entry & ~sign_mask) | (~wnaf_entry & sign_mask)) & state.mask) >> 1;
}


struct wnaf_processing_state
{
    uint32_t* wnaf;
    bool* wnaf_sign_map;
    uint32_t* first_bucket_map;
    bool* first_bucket_sign_map;

    size_t* wnaf_round_offsets;
};

struct wnaf_runtime_state_b
{

    uint64_t current_sign;
    uint64_t next_sign;
    size_t current_idx;
    size_t next_idx;
    size_t current_point;
    size_t next_point;
    size_t bits_per_wnaf;
    uint64_t mask;
    uint32_t* wnaf_iterator;
    bool* wnaf_sign_iterator;
    uint32_t* point_iterator;

    uint32_t* first_bucket_map;
    bool* first_bucket_sign_map;
    size_t* wnaf_round_offsets;
    bool* skew_table;
    uint32_t* wnaf_table;
    bool* wnaf_sign_table;
    uint32_t* point_indexer;
};


// inline void sneaky_fixed_wnaf(uint64_t* scalar, uint32_t point_index, uint32_t* wnaf, bool* wnaf_sign_map, uint32_t* first_bucket_map, uint32_t* first_bucket_sign_map, size_t* wnaf_round_offsets, bool& skew_map, size_t num_points, size_t wnaf_bits)
inline void sneaky_fixed_wnaf(uint64_t* scalar, uint32_t point_index, size_t num_points, wnaf_runtime_state_b& wnaf_state)
{
    size_t wnaf_entries = (SCALAR_BITS + wnaf_state.bits_per_wnaf - 1) / wnaf_state.bits_per_wnaf;
    // size_t  mask = (1 << (wnaf_state.bits_per_wnaf - 1)) - 1;

    wnaf_state.skew_table[point_index] = ((scalar[0] & 1) == 0);
    size_t num_buckets = 1 << (wnaf_state.bits_per_wnaf - 1);

    if (scalar[0] == 0 && scalar[1] == 0)
    {
        printf("hey! what's going on? we should not have zero scalars!\n");
        wnaf_state.skew_table[point_index] = false;
        for (size_t i = 0; i < wnaf_entries; ++i)
        {
            wnaf_state.wnaf_table[(i * num_points) + point_index] = 0;
        }
        return;
    }

    size_t final_bits = SCALAR_BITS - (SCALAR_BITS / wnaf_state.bits_per_wnaf) * wnaf_state.bits_per_wnaf;
    uint32_t previous = get_wnaf_bits(scalar, wnaf_state.bits_per_wnaf, 0) + wnaf_state.skew_table[point_index];
    uint32_t current = 0;
    for (size_t i = 1; i < wnaf_entries; ++i)
    {
        size_t wnaf_iterator = ((wnaf_entries - i) * num_points) + point_index - wnaf_state.wnaf_round_offsets[wnaf_entries - i];
        size_t bits = (i < (wnaf_entries - 1)) ? wnaf_state.bits_per_wnaf : final_bits;
        current = get_wnaf_bits(scalar, bits, i * wnaf_state.bits_per_wnaf);
        uint32_t predicate = ((current & 1) == 0);
        current += predicate;

        uint32_t sign_mask = 0 - predicate;
        previous = ((previous & ~sign_mask) - (previous & sign_mask) + (predicate << wnaf_state.bits_per_wnaf)) >> 1;

        size_t bucket_map_index = (wnaf_entries * num_buckets) - ((i) * num_buckets) + previous;

        uint32_t bucket_entry = wnaf_state.first_bucket_map[bucket_map_index];
        uint32_t bucket_mask = 0 - (bucket_entry == 0);

        wnaf_state.first_bucket_map[bucket_map_index] |= ((point_index + 1) & bucket_mask);
        wnaf_state.first_bucket_sign_map[bucket_map_index] |= (bool)(predicate & bucket_mask);
        wnaf_state.wnaf_table[wnaf_iterator] |= (previous & ~bucket_mask);
        wnaf_state.wnaf_sign_table[wnaf_iterator] |= (bool)(predicate & ~bucket_mask);
        wnaf_state.point_indexer[wnaf_iterator] |= ((point_index) & ~bucket_mask);

        wnaf_state.wnaf_round_offsets[wnaf_entries - i] += (bucket_entry == 0);

        previous = current;
        // Once we've updated the previous wnaf entry, we want to turn it into a few things:
        // 1: a variable we can directly use to index the relevent pippenger bucket
        // 2: a sign bit that determines whether we add or subtract a point with the pippenger bucket
        //
        // we also want to determine whether this wnaf entry is the *first* time a pippenger bucket is being accessed,
        // for a given round. This is because we really, REALLY don't want to conditionally branch in the main loop,
        // pipeline stalls when performing modular multiplication in 256 bit prime fields are very painful (cache misses in particular)
    }

    // for final round, we know that entry will be positive, no need to set/check sign bits
    size_t wnaf_iterator = point_index - wnaf_state.wnaf_round_offsets[0];
    previous >>= 1;
    uint32_t bucket_entry = wnaf_state.first_bucket_map[previous];
    uint32_t bucket_mask = 0 - (bucket_entry == 0);
    wnaf_state.first_bucket_map[previous] |= ((point_index + 1) & bucket_mask);
    wnaf_state.wnaf_table[wnaf_iterator] |= (previous & ~bucket_mask);
    wnaf_state.point_indexer[wnaf_iterator] |= ((point_index) & ~bucket_mask);
    wnaf_state.wnaf_round_offsets[0] += (bucket_entry == 0);
}
*/