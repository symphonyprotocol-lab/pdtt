module pdtt::activity {
    use std::signer;
    use aptos_framework::object::Object;
    use aptos_framework::fungible_asset::Metadata;
    use std::vector;
    use aptos_std::simple_map::{Self, SimpleMap};
    use pdtt::sym_token;
    use aptos_framework::account;
    use aptos_framework::primary_fungible_store;
    use std::error;

    /// Error codes
    const EACTIVITY_NOT_FOUND: u64 = 1;
    const EACTIVITY_NOT_COMPLETED: u64 = 2;
    const EALREADY_CLAIMED: u64 = 3;
    const EINSUFFICIENT_BALANCE: u64 = 4;
    const ENOT_CREATOR: u64 = 5;
    const ENOT_INITIALIZED: u64 = 6;

    /// Module data to store escrow signer capability
    struct ModuleData has key {
        signer_cap: account::SignerCapability
    }

    /// Activity information
    struct Activity has store {
        creator: address,              // Activity creator
        activity_id: vector<u8>,       // Unique activity ID
        token_metadata: Object<Metadata>, // SYM token metadata object
        total_amount: u64,             // Total tokens locked in this activity
        claimed_amount: u64,           // Total tokens claimed by users
        reward_per_user: u64,          // Reward amount per user
        max_users: u64,                // Maximum number of users who can claim
        current_users: u64,            // Current number of users who have claimed
        is_active: bool,                // Whether activity is still active
        completed: bool                 // Whether activity is completed
    }

    /// User claim record
    struct UserClaim has store {
        claimed: bool,                 // Whether user has claimed
        claimed_at: u64                // Timestamp when claimed (optional, can be 0)
    }

    /// Activity ID to Activity mapping (stored per creator)
    struct Activities has key {
        map: SimpleMap<vector<u8>, Activity>
    }

    /// User claims tracking (activity_id -> user_address -> UserClaim)
    struct UserClaims has key {
        map: SimpleMap<vector<u8>, SimpleMap<address, UserClaim>>
    }

    /// Initialize the activity module - creates escrow account
    public entry fun initialize(admin: &signer) {
        let (_resource_signer, signer_cap) =
            account::create_resource_account(admin, b"ACTIVITY_ESCROW");
        move_to(admin, ModuleData { signer_cap });
    }

    /// Initialize activities map for a creator
    public entry fun init_activities(creator: &signer) {
        let creator_addr = signer::address_of(creator);
        if (!exists<Activities>(creator_addr)) {
            move_to(creator, Activities { map: simple_map::create() });
        };
        if (!exists<UserClaims>(creator_addr)) {
            move_to(creator, UserClaims { map: simple_map::create() });
        };
    }

    /// Create an activity and deposit SYM tokens
    /// Creator sends tokens to the escrow account
    public entry fun create_activity(
        creator: &signer,
        activity_id: vector<u8>,
        token_metadata: Object<Metadata>,
        total_amount: u64,
        reward_per_user: u64,
        max_users: u64
    ) acquires Activities, ModuleData {
        let creator_addr = signer::address_of(creator);
        
        // Initialize if not exists
        if (!exists<Activities>(creator_addr)) {
            init_activities(creator);
        };
        if (!exists<UserClaims>(creator_addr)) {
            init_activities(creator);
        };

        // Verify total amount matches reward_per_user * max_users
        assert!(total_amount == reward_per_user * max_users, error::invalid_argument(EINSUFFICIENT_BALANCE));

        // Get escrow account address
        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);
        let escrow_addr = signer::address_of(&resource_signer);

        // Transfer tokens from creator to escrow
        primary_fungible_store::transfer(
            creator,
            token_metadata,
            escrow_addr,
            total_amount
        );

        // Create activity
        let activity = Activity {
            creator: creator_addr,
            activity_id: activity_id,
            token_metadata: token_metadata,
            total_amount: total_amount,
            claimed_amount: 0,
            reward_per_user: reward_per_user,
            max_users: max_users,
            current_users: 0,
            is_active: true,
            completed: false
        };

        let activities_ref = borrow_global_mut<Activities>(creator_addr);
        assert!(!simple_map::contains_key(&activities_ref.map, &activity_id), error::already_exists(EACTIVITY_NOT_FOUND));
        simple_map::add(&mut activities_ref.map, activity_id, activity);
    }

    /// Mark activity as completed (only creator can call this)
    public entry fun complete_activity(
        creator: &signer,
        activity_id: vector<u8>
    ) acquires Activities {
        let creator_addr = signer::address_of(creator);
        let activities_ref = borrow_global_mut<Activities>(creator_addr);
        assert!(simple_map::contains_key(&activities_ref.map, &activity_id), error::not_found(EACTIVITY_NOT_FOUND));
        
        let activity = simple_map::borrow_mut(&mut activities_ref.map, &activity_id);
        assert!(activity.creator == creator_addr, error::permission_denied(ENOT_CREATOR));
        activity.completed = true;
    }

    /// User claims reward if activity is completed
    public entry fun claim_reward(
        user: &signer,
        creator_addr: address,
        activity_id: vector<u8>
    ) acquires Activities, UserClaims, ModuleData {
        let user_addr = signer::address_of(user);

        // Get activity
        let activities_ref = borrow_global_mut<Activities>(creator_addr);
        assert!(simple_map::contains_key(&activities_ref.map, &activity_id), error::not_found(EACTIVITY_NOT_FOUND));
        let activity = simple_map::borrow_mut(&mut activities_ref.map, &activity_id);

        // Check if activity is completed
        assert!(activity.completed, error::invalid_state(EACTIVITY_NOT_COMPLETED));

        // Check if activity is still active
        assert!(activity.is_active, error::invalid_state(EACTIVITY_NOT_COMPLETED));

        // Check if user has already claimed
        let user_claims_ref = borrow_global_mut<UserClaims>(creator_addr);
        if (!simple_map::contains_key(&user_claims_ref.map, &activity_id)) {
            simple_map::add(&mut user_claims_ref.map, activity_id, simple_map::create<address, UserClaim>());
        };
        let activity_claims = simple_map::borrow_mut(&mut user_claims_ref.map, &activity_id);
        
        if (simple_map::contains_key(activity_claims, &user_addr)) {
            let user_claim = simple_map::borrow(activity_claims, &user_addr);
            assert!(!user_claim.claimed, error::already_exists(EALREADY_CLAIMED));
        };

        // Check if max users reached
        assert!(activity.current_users < activity.max_users, error::invalid_state(EINSUFFICIENT_BALANCE));

        // Get escrow account
        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);

        // Transfer tokens from escrow to user
        primary_fungible_store::transfer(
            &resource_signer,
            activity.token_metadata,
            user_addr,
            activity.reward_per_user
        );

        // Update activity state
        activity.claimed_amount = activity.claimed_amount + activity.reward_per_user;
        activity.current_users = activity.current_users + 1;

        // Mark user as claimed
        let user_claim = UserClaim {
            claimed: true,
            claimed_at: 0 // Can be updated with timestamp if needed
        };
        simple_map::add(activity_claims, user_addr, user_claim);
    }

    /// Creator can deactivate an activity (stop new claims)
    public entry fun deactivate_activity(
        creator: &signer,
        activity_id: vector<u8>
    ) acquires Activities {
        let creator_addr = signer::address_of(creator);
        let activities_ref = borrow_global_mut<Activities>(creator_addr);
        assert!(simple_map::contains_key(&activities_ref.map, &activity_id), error::not_found(EACTIVITY_NOT_FOUND));
        
        let activity = simple_map::borrow_mut(&mut activities_ref.map, &activity_id);
        assert!(activity.creator == creator_addr, error::permission_denied(ENOT_CREATOR));
        activity.is_active = false;
    }

    /// Creator can withdraw remaining tokens (if activity is deactivated or completed)
    public entry fun withdraw_remaining(
        creator: &signer,
        activity_id: vector<u8>,
        amount: u64
    ) acquires Activities, ModuleData {
        let creator_addr = signer::address_of(creator);
        let activities_ref = borrow_global_mut<Activities>(creator_addr);
        assert!(simple_map::contains_key(&activities_ref.map, &activity_id), error::not_found(EACTIVITY_NOT_FOUND));
        
        let activity = simple_map::borrow_mut(&mut activities_ref.map, &activity_id);
        assert!(activity.creator == creator_addr, error::permission_denied(ENOT_CREATOR));
        
        // Can withdraw if activity is deactivated or completed
        assert!(!activity.is_active || activity.completed, error::invalid_state(EACTIVITY_NOT_COMPLETED));

        // Calculate remaining balance
        let remaining = activity.total_amount - activity.claimed_amount;
        assert!(amount <= remaining, error::invalid_argument(EINSUFFICIENT_BALANCE));

        // Get escrow account
        let admin_addr = @pdtt;
        let module_data = borrow_global<ModuleData>(admin_addr);
        let resource_signer =
            account::create_signer_with_capability(&module_data.signer_cap);

        // Transfer tokens from escrow back to creator
        primary_fungible_store::transfer(
            &resource_signer,
            activity.token_metadata,
            creator_addr,
            amount
        );
    }

    /// View function: Get activity info
    #[view]
    public fun get_activity(
        creator_addr: address,
        activity_id: vector<u8>
    ): (address, u64, u64, u64, u64, u64, bool, bool) acquires Activities {
        let activities_ref = borrow_global<Activities>(creator_addr);
        assert!(simple_map::contains_key(&activities_ref.map, &activity_id), error::not_found(EACTIVITY_NOT_FOUND));
        
        let activity = simple_map::borrow(&activities_ref.map, &activity_id);
        (
            activity.creator,
            activity.total_amount,
            activity.claimed_amount,
            activity.reward_per_user,
            activity.max_users,
            activity.current_users,
            activity.is_active,
            activity.completed
        )
    }

    /// View function: Check if user has claimed
    #[view]
    public fun has_user_claimed(
        creator_addr: address,
        activity_id: vector<u8>,
        user_addr: address
    ): bool acquires UserClaims {
        if (!exists<UserClaims>(creator_addr)) {
            return false
        };
        let user_claims_ref = borrow_global<UserClaims>(creator_addr);
        if (!simple_map::contains_key(&user_claims_ref.map, &activity_id)) {
            return false
        };
        let activity_claims = simple_map::borrow(&user_claims_ref.map, &activity_id);
        if (!simple_map::contains_key(activity_claims, &user_addr)) {
            return false
        };
        let user_claim = simple_map::borrow(activity_claims, &user_addr);
        user_claim.claimed
    }

    #[test(creator = @pdtt, user = @0x123)]
    fun test_activity_flow(creator: &signer, user: &signer) acquires Activities, UserClaims, ModuleData {
        let creator_addr = signer::address_of(creator);
        let user_addr = signer::address_of(user);

        // Initialize
        sym_token::init_for_test(creator);
        initialize(creator);
        init_activities(creator);

        // Mint tokens to creator
        sym_token::mint(creator, creator_addr, 1000);
        let metadata = sym_token::get_metadata();
        assert!(primary_fungible_store::balance(creator_addr, metadata) == 1000, 1);

        // Create activity: 100 tokens total, 10 per user, max 10 users
        let activity_id = b"test_activity";
        create_activity(creator, activity_id, metadata, 100, 10, 10);

        // Verify tokens moved to escrow
        let escrow_addr = account::create_resource_address(&@pdtt, b"ACTIVITY_ESCROW");
        assert!(primary_fungible_store::balance(creator_addr, metadata) == 900, 2);
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 100, 3);

        // Try to claim before completion (should fail)
        // Note: We can't test expected_failure in entry functions easily, so we'll test the flow

        // Complete activity
        complete_activity(creator, activity_id);

        // User claims reward
        claim_reward(user, creator_addr, activity_id);

        // Verify tokens moved to user
        assert!(primary_fungible_store::balance(escrow_addr, metadata) == 90, 4);
        assert!(primary_fungible_store::balance(user_addr, metadata) == 10, 5);

        // Verify user has claimed
        assert!(has_user_claimed(creator_addr, activity_id, user_addr), 6);
    }
}

