module pdtt::ad_rewards {
    use std::signer;
    use aptos_framework::object::Object;
    use aptos_framework::fungible_asset::Metadata;
    use std::vector;
    use aptos_std::hash;
    use aptos_std::simple_map::{Self, SimpleMap};
    use pdtt::sym_token;
    use aptos_framework::account;
    use aptos_framework::primary_fungible_store;

    /// 资源账户能力存储
    struct ModuleData has key {
        signer_cap: account::SignerCapability
    }

    /// 广告信息
    struct Ad has store {
        advertiser: address, // 广告主
        token_metadata: Object<Metadata>, // SYM token元数据对象
        total_amount: u64, // 锁定总量
        claimed_amount: u64, // 已领取总量
        merkle_root: vector<u8>, // 默克尔树根
        claimed: vector<bool> // 已领取标记，每个叶子对应一个用户
    }

    /// 广告ID到广告对象映射
    struct Ads has key {
        map: SimpleMap<vector<u8>, Ad>
    }

    /// 初始化 Ads map
    public entry fun init_ads(owner: &signer) {
        move_to(owner, Ads { map: simple_map::create() });
    }

    /// 初始化托管账户 - 创建资源账户用于持有代币
    public entry fun initialize_escrow(admin: &signer) {
        let (_resource_signer, signer_cap) =
            account::create_resource_account(admin, b"AD_REWARDS_ESCROW");
        move_to(admin, ModuleData { signer_cap });
    }

    /// 发布广告 - 需要advertiser拥有token的transfer权限
    public entry fun create_ad(
        advertiser: &signer,
        ad_id: vector<u8>,
        token_metadata: Object<Metadata>,
        total_amount: u64,
        merkle_root: vector<u8>,
        user_count: u64
    ) acquires Ads, ModuleData {
        // Note: In production, tokens should be transferred to a contract-controlled account
        // For now, this is a placeholder - the actual token transfer should happen separately
        // using sym_token::transfer or similar function

        let advertiser_addr = signer::address_of(advertiser);
        if (!exists<Ads>(advertiser_addr)) {
            move_to(advertiser, Ads { map: simple_map::create() });
        };

        // Transfer tokens to escrow account
        // We need the address of the resource account.
        // Since we stored SignerCapability in ModuleData under @pdtt (admin), we can derive it or store the address.
        // But better: get the signer cap to get the address? No, we just need the address.
        // The resource account address is derived from source + seed.
        // Let's assume the admin is @pdtt.
        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);
        let escrow_addr = signer::address_of(&resource_signer);

        // Transfer tokens from advertiser to escrow
        // We use primary_fungible_store::transfer which handles FA transfers
        primary_fungible_store::transfer(
            advertiser,
            token_metadata,
            escrow_addr,
            total_amount
        );

        let claimed = vector::empty<bool>();
        let i = 0;
        while (i < user_count) {
            vector::push_back(&mut claimed, false);
            i = i + 1;
        };

        let ad = Ad {
            advertiser: advertiser_addr,
            token_metadata,
            total_amount,
            claimed_amount: 0,
            merkle_root,
            claimed
        };

        let ads_ref = borrow_global_mut<Ads>(advertiser_addr);
        simple_map::add(&mut ads_ref.map, ad_id, ad);
    }

    /// 用户领取奖励 - 任何用户都可以调用此函数来领取自己的奖励
    public entry fun claim_reward(
        user: &signer,
        advertiser_addr: address,
        ad_id: vector<u8>,
        index: u64,
        amount: u64,
        proof: vector<vector<u8>>,
        leaf_hash: vector<u8>
    ) acquires Ads, ModuleData {
        let user_addr = signer::address_of(user);

        let ads_ref = borrow_global_mut<Ads>(advertiser_addr);
        assert!(simple_map::contains_key(&ads_ref.map, &ad_id), 1);
        let ad = simple_map::borrow_mut(&mut ads_ref.map, &ad_id);

        // 检查是否已领取
        assert!(!*vector::borrow(&ad.claimed, index), 2);

        // 验证默克尔证明
        let valid = verify_merkle_proof(leaf_hash, proof, ad.merkle_root);
        assert!(valid, 3);

        // Transfer from escrow to user
        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);

        primary_fungible_store::transfer(
            &resource_signer,
            ad.token_metadata,
            user_addr,
            amount
        );

        // 标记已领取
        *vector::borrow_mut(&mut ad.claimed, index) = true;
        ad.claimed_amount = ad.claimed_amount + amount;
    }

    /// 管理员提取资金
    public entry fun withdraw_funds(
        admin: &signer,
        token_metadata: Object<Metadata>,
        amount: u64,
        to: address
    ) acquires ModuleData {
        // 验证管理员权限 (必须是 @pdtt)
        assert!(signer::address_of(admin) == @pdtt, 4);

        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);

        primary_fungible_store::transfer(&resource_signer, token_metadata, to, amount);
    }

    /// 默克尔证明验证
    fun verify_merkle_proof(
        leaf: vector<u8>,
        proof: vector<vector<u8>>,
        root: vector<u8>
    ): bool {
        verify_merkle_proof_internal(leaf, proof, root, 0)
    }

    fun verify_merkle_proof_internal(
        hash_val: vector<u8>,
        proof: vector<vector<u8>>,
        root: vector<u8>,
        idx: u64
    ): bool {
        let len = vector::length(&proof);
        if (idx >= len) {
            return compare_vectors(&hash_val, &root)
        };
        let sibling = *vector::borrow(&proof, idx);
        let new_hash = hash_combine(hash_val, sibling);
        verify_merkle_proof_internal(new_hash, proof, root, idx + 1)
    }

    /// 比较两个向量是否相等
    fun compare_vectors(a: &vector<u8>, b: &vector<u8>): bool {
        let len_a = vector::length(a);
        let len_b = vector::length(b);
        if (len_a != len_b) {
            return false
        };
        compare_vectors_internal(a, b, 0)
    }

    fun compare_vectors_internal(
        a: &vector<u8>, b: &vector<u8>, idx: u64
    ): bool {
        let len = vector::length(a);
        if (idx >= len) {
            return true
        };
        let elem_a = *vector::borrow(a, idx);
        let elem_b = *vector::borrow(b, idx);
        if (elem_a != elem_b) {
            return false
        };
        compare_vectors_internal(a, b, idx + 1)
    }

    /// 比较两个向量的大小 (a < b)
    fun lt(a: &vector<u8>, b: &vector<u8>): bool {
        let len_a = vector::length(a);
        let len_b = vector::length(b);
        let len = if (len_a < len_b) len_a else len_b;

        let i = 0;
        while (i < len) {
            let val_a = *vector::borrow(a, i);
            let val_b = *vector::borrow(b, i);
            if (val_a < val_b) return true;
            if (val_a > val_b) return false;
            i = i + 1;
        };

        len_a < len_b
    }

    /// 合并哈希，使用 sha3_256 (支持 sorted pairs)
    fun hash_combine(a: vector<u8>, b: vector<u8>): vector<u8> {
        let combined = vector::empty<u8>();
        if (lt(&a, &b)) {
            vector::append(&mut combined, a);
            vector::append(&mut combined, b);
        } else {
            vector::append(&mut combined, b);
            vector::append(&mut combined, a);
        };
        hash::sha3_256(combined)
    }

    #[test(advertiser = @pdtt)]
    fun test_init_ads(advertiser: &signer) {
        init_ads(advertiser);
        let ads_ref = borrow_global<Ads>(signer::address_of(advertiser));
        assert!(simple_map::length(&ads_ref.map) == 0, 1);
    }

    #[test(advertiser = @pdtt)]
    fun test_verify_merkle_proof() {
        // Test with empty proof - leaf should equal root
        let leaf = b"leaf";
        let proof = vector::empty<vector<u8>>();
        let root = leaf; // For empty proof, root should equal leaf
        let valid = verify_merkle_proof(leaf, proof, root);
        assert!(valid, 1);
    }

    #[test(advertiser = @pdtt, user = @0x123)]
    fun test_escrow_flow(advertiser: &signer, user: &signer) acquires Ads, ModuleData {
        // 1. Initialize
        let advertiser_addr = signer::address_of(advertiser);
        let user_addr = signer::address_of(user);

        // Init sym_token
        sym_token::init_for_test(advertiser);

        // Init ad_rewards escrow
        initialize_escrow(advertiser);

        // 2. Mint tokens to advertiser
        sym_token::mint(advertiser, advertiser_addr, 1000);
        let metadata = sym_token::get_metadata();
        assert!(primary_fungible_store::balance(advertiser_addr, metadata) == 1000, 1);

        // 3. Create Ad
        let ad_id = b"test_ad";
        // Use dummy root
        let leaf_hash = b"leaf";
        let root = leaf_hash;

        create_ad(advertiser, ad_id, metadata, 100, root, 1);

        // Verify tokens moved to escrow
        let escrow_addr = account::create_resource_address(&@pdtt, b"AD_REWARDS_ESCROW");
        assert!(primary_fungible_store::balance(advertiser_addr, metadata) == 900, 2);
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 100, 3);

        // 4. Claim Reward
        let proof = vector::empty<vector<u8>>();
        claim_reward(
            user,
            advertiser_addr,
            ad_id,
            0,
            10,
            proof,
            leaf_hash
        );

        // Verify tokens moved to user
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 90, 4);
        assert!(primary_fungible_store::balance(user_addr, metadata) == 10, 5);
    }

    #[test(advertiser = @pdtt, user = @0x123)]
    fun test_withdraw_funds(advertiser: &signer, user: &signer) acquires Ads, ModuleData {
        // 1. Initialize
        let advertiser_addr = signer::address_of(advertiser);
        let user_addr = signer::address_of(user);

        sym_token::init_for_test(advertiser);
        initialize_escrow(advertiser);

        // 2. Mint tokens to advertiser
        sym_token::mint(advertiser, advertiser_addr, 1000);
        let metadata = sym_token::get_metadata();

        // 3. Create Ad (Deposit 100)
        let ad_id = b"test_ad_withdraw";
        let root = b"root";
        create_ad(advertiser, ad_id, metadata, 100, root, 1);

        let escrow_addr = account::create_resource_address(&@pdtt, b"AD_REWARDS_ESCROW");
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 100, 1);

        // 4. Withdraw funds (50)
        withdraw_funds(advertiser, metadata, 50, user_addr);

        // Verify balances
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 50, 2);
        assert!(primary_fungible_store::balance(user_addr, metadata) == 50, 3);
    }
}

