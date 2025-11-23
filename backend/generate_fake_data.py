"""
Generate fake data: 10 wallet addresses, each with 20 receipts, each receipt with at least 5 items.
Creates user portraits first, then generates receipts matching those portraits using AI.

Usage:
    uv run generate_fake_data.py
"""
import asyncio
import random
import json
from datetime import datetime, timedelta
from decimal import Decimal
from main import (
    AsyncSessionFactory,
    Receipt,
    ReceiptItem,
    Category,
    UserPortrait,
    settings,
)
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from openai import AsyncOpenAI

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


# Sample store names
STORE_NAMES = [
    "MiX Store@Kuc North Bank",
    "Giant Hypermarket",
    "Tesco Extra",
    "Aeon Big",
    "Cold Storage",
    "Jaya Grocer",
    "Village Grocer",
    "99 Speedmart",
    "KK Super Mart",
    "7-Eleven",
    "Watsons",
    "Guardian",
    "Aeon Wellness",
    "Uniqlo",
    "H&M",
    "Zara",
    "Marks & Spencer",
    "IKEA",
    "Popular Bookstore",
    "MPH Bookstore",
]

# Sample item descriptions by category with brands (at least 3 per type)
ITEM_DESCRIPTIONS = {
    "Fresh Produce": [
        "Apple Red Delicious - Premium", "Apple Granny Smith - Fresh", "Apple Fuji - Organic",
        "Banana - Cavendish", "Banana - Lady Finger", "Banana - Red",
        "Orange - Navel", "Orange - Valencia", "Orange - Blood",
        "Grapes - Red Seedless", "Grapes - Green Seedless", "Grapes - Black",
        "Strawberry - Fresh", "Strawberry - Organic", "Strawberry - Premium",
        "Tomato - Roma", "Tomato - Cherry", "Tomato - Beef",
        "Carrot - Baby", "Carrot - Regular", "Carrot - Organic",
        "Broccoli - Fresh", "Broccoli - Organic", "Broccoli - Premium",
        "Lettuce - Iceberg", "Lettuce - Romaine", "Lettuce - Butter",
        "Cucumber - English", "Cucumber - Regular", "Cucumber - Mini",
        "Spinach - Fresh", "Spinach - Baby", "Spinach - Organic",
        "Cabbage - Green", "Cabbage - Red", "Cabbage - Napa",
        "Potato - Russet", "Potato - Red", "Potato - Sweet",
        "Onion - Yellow", "Onion - Red", "Onion - White",
        "Garlic - Fresh", "Garlic - Organic", "Garlic - Premium",
    ],
    "Meat, Poultry & Seafood": [
        "Chicken Breast - Ayamas", "Chicken Breast - Farm Fresh", "Chicken Breast - Premium",
        "Chicken Thigh - Ayamas", "Chicken Thigh - Farm Fresh", "Chicken Thigh - Organic",
        "Beef Steak - Australian", "Beef Steak - Local", "Beef Steak - Wagyu",
        "Pork Chop - Farm Fresh", "Pork Chop - Premium", "Pork Chop - Organic",
        "Salmon Fillet - Norwegian", "Salmon Fillet - Atlantic", "Salmon Fillet - Premium",
        "Prawn - Tiger", "Prawn - White", "Prawn - King",
        "Fish Fillet - Dory", "Fish Fillet - Snapper", "Fish Fillet - Cod",
        "Lamb Chop - Australian", "Lamb Chop - New Zealand", "Lamb Chop - Premium",
        "Duck Breast - Premium", "Duck Breast - Organic", "Duck Breast - Farm Fresh",
        "Chicken Wing - Ayamas", "Chicken Wing - Farm Fresh", "Chicken Wing - Premium",
        "Beef Mince - Australian", "Beef Mince - Local", "Beef Mince - Premium",
        "Pork Mince - Farm Fresh", "Pork Mince - Premium", "Pork Mince - Organic",
    ],
    "Dairy, Chilled & Eggs": [
        "Fresh Milk - Farm Fresh", "Fresh Milk - Dutch Lady", "Fresh Milk - Marigold",
        "Yoghurt - Nestle", "Yoghurt - Yoplait", "Yoghurt - Greek",
        "Cheese - Kraft", "Cheese - Bega", "Cheese - Anchor",
        "Butter - Anchor", "Butter - Lurpak", "Butter - SCS",
        "Eggs - Farm Fresh", "Eggs - Organic", "Eggs - Free Range",
        "Cream - Nestle", "Cream - Anchor", "Cream - Bulla",
        "Sour Cream - Anchor", "Sour Cream - Bulla", "Sour Cream - Premium",
        "Cottage Cheese - Kraft", "Cottage Cheese - Anchor", "Cottage Cheese - Organic",
        "Mozzarella - Kraft", "Mozzarella - Galbani", "Mozzarella - Premium",
    ],
    "Pantry / Groceries": [
        "Rice - Jasmine", "Rice - Basmati", "Rice - Fragrant",
        "Pasta - Barilla", "Pasta - San Remo", "Pasta - Prego",
        "Noodles - Maggi", "Noodles - Indomie", "Noodles - Cintan",
        "Bread - Gardenia", "Bread - Massimo", "Bread - High 5",
        "Flour - Prima", "Flour - Red Man", "Flour - Organic",
        "Sugar - Gula Melaka", "Sugar - White", "Sugar - Brown",
        "Salt - Table Salt", "Salt - Sea Salt", "Salt - Himalayan",
        "Cooking Oil - Bunga", "Cooking Oil - Knife", "Cooking Oil - Olive",
        "Soy Sauce - Kikkoman", "Soy Sauce - Lee Kum Kee", "Soy Sauce - Maggi",
        "Vinegar - Apple Cider", "Vinegar - White", "Vinegar - Balsamic",
    ],
    "Beverages": [
        "Mineral Water - Spritzer", "Mineral Water - Evian", "Mineral Water - Crystal",
        "Orange Juice - Tropicana", "Orange Juice - Minute Maid", "Orange Juice - Fresh",
        "Apple Juice - Tropicana", "Apple Juice - Minute Maid", "Apple Juice - Organic",
        "Coffee - Nescafe", "Coffee - Old Town", "Coffee - Starbucks",
        "Tea - Lipton", "Tea - Boh", "Tea - Twinings",
        "Soft Drink - Coca Cola", "Soft Drink - Pepsi", "Soft Drink - 100 Plus",
        "Energy Drink - Red Bull", "Energy Drink - Monster", "Energy Drink - Livita",
        "Beer - Tiger", "Beer - Heineken", "Beer - Carlsberg",
        "Wine - Red Wine", "Wine - White Wine", "Wine - Rose Wine",
    ],
    "Snacks & Confectionery": [
        "Potato Chips - Lay's", "Potato Chips - Pringles", "Potato Chips - Mister Potato",
        "Chocolate Bar - Cadbury", "Chocolate Bar - Hershey's", "Chocolate Bar - Kit Kat",
        "Cookies - Oreo", "Cookies - Famous Amos", "Cookies - Chips Ahoy",
        "Biscuits - Jacob's", "Biscuits - Hup Seng", "Biscuits - Julie's",
        "Candy - Mentos", "Candy - Skittles", "Candy - M&M's",
        "Nuts - Planters", "Nuts - Mister Nut", "Nuts - Organic",
        "Instant Noodles - Maggi", "Instant Noodles - Indomie", "Instant Noodles - Cintan",
        "Crackers - Ritz", "Crackers - Jacob's", "Crackers - Premium",
    ],
    "Household & Cleaning": [
        "Laundry Detergent - Dynamo", "Laundry Detergent - Persil", "Laundry Detergent - Breeze",
        "Dish Soap - Dawn", "Dish Soap - Palmolive", "Dish Soap - Ajax",
        "Toilet Paper - Kleenex", "Toilet Paper - Scott", "Toilet Paper - Presto",
        "Tissue - Kleenex", "Tissue - Tempo", "Tissue - Scott",
        "Trash Bags - Glad", "Trash Bags - Hefty", "Trash Bags - Premium",
        "Cleaning Spray - Dettol", "Cleaning Spray - Clorox", "Cleaning Spray - Lysol",
        "Sponge - Scotch Brite", "Sponge - O-Cedar", "Sponge - Premium",
        "Broom - Swiffer", "Broom - O-Cedar", "Broom - Premium",
    ],
    "Personal Care & Beauty": [
        "Shampoo - Pantene", "Shampoo - Head & Shoulders", "Shampoo - Dove",
        "Conditioner - Pantene", "Conditioner - Head & Shoulders", "Conditioner - Dove",
        "Soap - Dove", "Soap - Lux", "Soap - Lifebuoy",
        "Toothpaste - Colgate", "Toothpaste - Sensodyne", "Toothpaste - Oral-B",
        "Toothbrush - Oral-B", "Toothbrush - Colgate", "Toothbrush - Sensodyne",
        "Face Cream - Olay", "Face Cream - Nivea", "Face Cream - L'Oreal",
        "Sunscreen - Nivea", "Sunscreen - Neutrogena", "Sunscreen - Banana Boat",
        "Deodorant - Rexona", "Deodorant - Nivea", "Deodorant - Dove",
        "Razor - Gillette", "Razor - Schick", "Razor - Bic",
    ],
    "Baby & Child": [
        "Baby Formula - Similac", "Baby Formula - Enfamil", "Baby Formula - Friso",
        "Diapers - Pampers", "Diapers - Huggies", "Diapers - Mamy Poko",
        "Baby Wipes - Pampers", "Baby Wipes - Huggies", "Baby Wipes - WaterWipes",
        "Baby Food - Gerber", "Baby Food - Heinz", "Baby Food - Organic",
        "Baby Shampoo - Johnson's", "Baby Shampoo - Mustela", "Baby Shampoo - Aveeno",
        "Baby Lotion - Johnson's", "Baby Lotion - Mustela", "Baby Lotion - Aveeno",
    ],
    "Pet Care": [
        "Dog Food - Pedigree", "Dog Food - Royal Canin", "Dog Food - Purina",
        "Cat Food - Whiskas", "Cat Food - Royal Canin", "Cat Food - Friskies",
        "Pet Treats - Pedigree", "Pet Treats - Whiskas", "Pet Treats - Premium",
        "Cat Litter - Tidy Cats", "Cat Litter - Fresh Step", "Cat Litter - Premium",
        "Pet Shampoo - Hartz", "Pet Shampoo - TropiClean", "Pet Shampoo - Premium",
        "Pet Toys - Kong", "Pet Toys - Nylabone", "Pet Toys - Premium",
    ],
}


def generate_wallet_address(index: int) -> str:
    """Generate a fake Aptos wallet address."""
    # Aptos addresses are 32 bytes (64 hex chars)
    # Generate random hex string
    hex_part = ''.join(random.choices('0123456789abcdef', k=64))
    return f"0x{hex_part}"


def generate_receipt_data(store_name: str, receipt_date: datetime) -> dict:
    """Generate fake receipt data."""
    return {
        "meta": {
            "source_image": f"https://example.com/receipts/{random.randint(1000, 9999)}.jpg",
            "extracted_at": receipt_date.isoformat(),
            "ocr_engine": "gpt-4o",
            "language": "en",
            "currency": "MYR",
        },
        "store": {
            "name": store_name,
            "company": f"{store_name} Sdn Bhd",
            "registration_no": f"REG{random.randint(100000, 999999)}",
            "branch": f"Branch {random.randint(1, 10)}",
            "address": f"{random.randint(1, 999)} Jalan Test, Kuala Lumpur",
            "phone": f"+60{random.randint(100000000, 999999999)}",
            "email": "",
            "website": "",
        },
        "invoice": {
            "invoice_no": f"INV{random.randint(100000, 999999)}",
            "order_no": f"ORD{random.randint(100000, 999999)}",
            "date": receipt_date.strftime("%Y-%m-%d"),
            "time": receipt_date.strftime("%H:%M:%S"),
            "cashier": f"Cashier {random.randint(1, 10)}",
            "buyer_tin": "",
            "e_invoice_uuid": "",
            "items": [],  # Will be populated separately
            "summary": {
                "subtotal": 0.0,
                "discount_total": 0.0,
                "tax": 0.0,
                "rounding_adjustment": 0.0,
                "total": 0.0,
            },
            "payment": {
                "method": random.choice(["Cash", "Card", "E-Wallet"]),
                "amount_paid": 0.0,
                "change": 0.0,
                "card_type": "",
                "transaction_id": "",
            },
        },
        "footer": {
            "thank_you_message": "Thank you for shopping with us!",
            "notes": "",
            "socials": {},
            "contact": {},
        },
    }


async def generate_user_portrait_with_ai(wallet_idx: int) -> dict:
    """Generate a user portrait using AI."""
    prompt = f"""Generate a realistic shopping profile for a fictional user #{wallet_idx + 1}. 
Return a JSON object with:
- "interests": array of at least 5 different shopping interests (e.g., ["Fresh Produce Enthusiast", "Pet Owner", "Beauty Enthusiast", "Coffee Lover", "Organic Shopper", "Premium Spender"])
- "estimated_age": integer between 20-60
- "purchase_behaviors": object with keys: spending_level ("High"/"Moderate"/"Low"), frequency ("High"/"Moderate"/"Low"), preferred_time ("Morning"/"Afternoon"/"Evening"), store_preference ("Grocery"/"Retail"/"Mixed"), category_diversity ("High"/"Moderate"/"Low")
- "description": a one-sentence description of the shopping profile
- "preferred_categories": array of 3-5 category names from: Fresh Produce, Meat Poultry & Seafood, Dairy Chilled & Eggs, Frozen, Pantry / Groceries, Beverages, Snacks & Confectionery, Household & Cleaning, Personal Care & Beauty, Baby & Child, Pet Care
- "preferred_brands": array of 2-3 brand names
- "spending_range": object with "min" and "max" (typical receipt total in MYR)

Return only valid JSON, no markdown formatting."""

    try:
        completion = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a data generation assistant. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=500,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        
        # Clean JSON response
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        portrait_data = json.loads(content)
        # Convert interests to new format with model info
        if "interests" in portrait_data and isinstance(portrait_data["interests"], list):
            interests_list = []
            for interest in portrait_data["interests"]:
                if isinstance(interest, str):
                    interests_list.append({"name": interest, "model": "Customer Segmentation Model"})
                elif isinstance(interest, dict) and "name" in interest:
                    # Already in correct format, ensure model is set
                    interest["model"] = interest.get("model", "Customer Segmentation Model")
                    interests_list.append(interest)
            portrait_data["interests"] = interests_list
        return portrait_data
    except Exception as e:
        print(f"⚠ AI portrait generation failed for wallet {wallet_idx + 1}, using fallback: {e}")
        # Fallback portrait with new format
        fallback_interests = ["Active Consumer", "Regular Shopper", "Budget-Conscious", "Afternoon Shopper", "Grocery Shopper"]
        return {
            "interests": [{"name": interest, "model": "Customer Segmentation Model"} for interest in fallback_interests],
            "estimated_age": random.randint(25, 45),
            "purchase_behaviors": {
                "spending_level": random.choice(["High", "Moderate", "Low"]),
                "frequency": random.choice(["High", "Moderate", "Low"]),
                "preferred_time": random.choice(["Morning", "Afternoon", "Evening"]),
                "store_preference": random.choice(["Grocery", "Retail", "Mixed"]),
                "category_diversity": random.choice(["High", "Moderate", "Low"]),
            },
            "description": "A regular shopper with diverse interests.",
            "preferred_categories": random.sample(["Fresh Produce", "Pantry / Groceries", "Beverages", "Snacks & Confectionery", "Household & Cleaning"], 3),
            "preferred_brands": ["Nestle", "Farm Fresh"],
            "spending_range": {"min": 50, "max": 200},
        }


async def generate_items_for_portrait(portrait: dict, categories: list, store_name: str) -> list:
    """Generate items for a receipt based on user portrait using AI."""
    preferred_cats = portrait.get("preferred_categories", [])
    preferred_brands = portrait.get("preferred_brands", [])
    spending_range = portrait.get("spending_range", {"min": 50, "max": 200})
    
    # Build category list for AI
    category_list = [cat.name for cat in categories]
    
    prompt = f"""Generate a realistic shopping list for a receipt at "{store_name}".

User Profile:
- Interests: {', '.join(portrait.get('interests', [])[:5])}
- Preferred Categories: {', '.join(preferred_cats)}
- Preferred Brands: {', '.join(preferred_brands)}
- Spending Level: {portrait.get('purchase_behaviors', {}).get('spending_level', 'Moderate')}
- Target Total: Between {spending_range.get('min', 50)}-{spending_range.get('max', 200)} MYR

Available Categories: {', '.join(category_list)}

Return a JSON array of 5-10 items. Each item should be an object with:
- "description": item name with brand (format: "Item Name - Brand")
- "category": category name from available categories
- "sub_category": appropriate subcategory
- "quantity": number (1-5)
- "unit": "pcs", "kg", "g", "L", or "ml"
- "unit_price": price in MYR (5-100)
- "discount": discount amount (0-5)
- "amount": quantity * unit_price - discount

Make items realistic and match the user's profile. Return only valid JSON array."""

    try:
        completion = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a shopping data generator. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        
        # Clean JSON response
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        items_data = json.loads(content)
        
        # Validate and ensure we have at least 5 items
        if not isinstance(items_data, list):
            raise ValueError("Response is not a list")
        if len(items_data) < 5:
            # Add more items if needed
            while len(items_data) < 5:
                cat = random.choice(categories)
                cat_name = cat.name
                if cat_name in ITEM_DESCRIPTIONS:
                    desc = random.choice(ITEM_DESCRIPTIONS[cat_name])
                else:
                    desc = f"Item {len(items_data) + 1}"
                items_data.append({
                    "description": desc,
                    "category": cat_name,
                    "sub_category": random.choice(cat.subcategories).name if cat.subcategories else None,
                    "quantity": random.uniform(1, 3),
                    "unit": random.choice(["pcs", "kg", "g"]),
                    "unit_price": random.uniform(5, 30),
                    "discount": random.uniform(0, 2),
                    "amount": 0,  # Will be calculated
                })
        
        # Calculate amounts and validate
        for item in items_data:
            if "amount" not in item or item["amount"] == 0:
                item["amount"] = (item.get("quantity", 1) * item.get("unit_price", 10)) - item.get("discount", 0)
            item["amount"] = round(float(item["amount"]), 2)
            item["quantity"] = round(float(item.get("quantity", 1)), 2)
            item["unit_price"] = round(float(item.get("unit_price", 10)), 2)
            item["discount"] = round(float(item.get("discount", 0)), 2)
            item["currency"] = "MYR"
            item["barcode"] = f"BAR{random.randint(100000, 999999)}"
        
        return items_data[:10]  # Limit to 10 items
    except Exception as e:
        print(f"⚠ AI item generation failed, using fallback: {e}")
        # Fallback: generate items based on preferred categories
        items_data = []
        num_items = random.randint(5, 10)
        for _ in range(num_items):
            # Prefer user's preferred categories
            if preferred_cats and random.random() < 0.7:
                cat_name = random.choice(preferred_cats)
                category = next((c for c in categories if c.name == cat_name), random.choice(categories))
            else:
                category = random.choice(categories)
            
            subcategory = random.choice(category.subcategories) if category.subcategories else None
            
            cat_name = category.name
            if cat_name in ITEM_DESCRIPTIONS:
                description = random.choice(ITEM_DESCRIPTIONS[cat_name])
            else:
                description = f"Item {len(items_data) + 1}"
            
            quantity = Decimal(str(random.uniform(1, 5))).quantize(Decimal("0.01"))
            unit_price = Decimal(str(random.uniform(5, 50))).quantize(Decimal("0.01"))
            discount = Decimal(str(random.uniform(0, 2))).quantize(Decimal("0.01"))
            amount = (quantity * unit_price - discount).quantize(Decimal("0.01"))
            
            items_data.append({
                "description": description,
                "barcode": f"BAR{random.randint(100000, 999999)}",
                "quantity": float(quantity),
                "unit": random.choice(["pcs", "kg", "g", "L", "ml"]),
                "unit_price": float(unit_price),
                "discount": float(discount),
                "amount": float(amount),
                "currency": "MYR",
                "category": cat_name,
                "sub_category": subcategory.name if subcategory else None,
            })
        
        return items_data


async def generate_fake_data() -> None:
    """Generate fake receipts and items for 10 wallet addresses with AI-generated profiles."""
    async with AsyncSessionFactory() as session:
        try:
            # Get all categories
            stmt = select(Category).options(selectinload(Category.subcategories)).order_by(Category.display_order)
            result = await session.execute(stmt)
            categories = result.scalars().all()
            
            if not categories:
                print("⚠ No categories found. Please run seed_categories.py first.")
                return
            
            print(f"Found {len(categories)} categories")
            
            # Generate 10 wallet addresses
            wallet_addresses = [generate_wallet_address(i) for i in range(10)]
            
            # Step 1: Generate user portraits for each wallet
            print("\n👤 Generating user portraits...")
            portraits = {}
            for wallet_idx, wallet_address in enumerate(wallet_addresses):
                print(f"  Generating portrait for wallet {wallet_idx + 1}/10...")
                portrait_data = await generate_user_portrait_with_ai(wallet_idx)
                
                # Ensure interests are in correct format
                interests_data = portrait_data.get("interests", [])
                if interests_data and isinstance(interests_data[0], str):
                    # Convert old format to new format
                    interests_data = [{"name": interest, "model": "Customer Segmentation Model"} for interest in interests_data]
                elif interests_data and isinstance(interests_data[0], dict):
                    # Ensure model is set
                    for interest in interests_data:
                        if "model" not in interest:
                            interest["model"] = "Customer Segmentation Model"
                
                # Save portrait to database
                portrait = UserPortrait(
                    wallet_address=wallet_address,
                    interests=interests_data[:10],
                    estimated_age=portrait_data.get("estimated_age"),
                    purchase_behaviors=portrait_data.get("purchase_behaviors", {}),
                    description=portrait_data.get("description"),
                )
                session.add(portrait)
                portraits[wallet_address] = portrait_data
                print(f"    ✓ Created portrait: {portrait_data.get('description', 'N/A')[:50]}...")
            
            await session.commit()
            print("✓ All portraits created\n")
            
            # Step 2: Generate receipts based on portraits
            # Date range: last 6 months
            end_date = datetime.utcnow()
            
            total_receipts = 0
            total_items = 0
            
            for wallet_idx, wallet_address in enumerate(wallet_addresses):
                portrait = portraits[wallet_address]
                print(f"\n📦 Generating receipts for wallet {wallet_idx + 1}/10: {wallet_address[:20]}...")
                print(f"   Profile: {portrait.get('description', 'N/A')[:60]}...")
                
                # Generate 20 receipts for this wallet
                for receipt_idx in range(20):
                    # Random date within the last 6 months
                    days_ago = random.randint(0, 180)
                    receipt_date = end_date - timedelta(days=days_ago)
                    
                    # Use preferred time from portrait
                    preferred_time = portrait.get("purchase_behaviors", {}).get("preferred_time", "Afternoon")
                    if preferred_time == "Morning":
                        hour = random.randint(8, 12)
                    elif preferred_time == "Evening":
                        hour = random.randint(18, 22)
                    else:
                        hour = random.randint(12, 18)
                    
                    receipt_date = receipt_date.replace(
                        hour=hour,
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59),
                    )
                    
                    # Select store based on preference
                    store_pref = portrait.get("purchase_behaviors", {}).get("store_preference", "Mixed")
                    if store_pref == "Grocery":
                        store_name = random.choice([s for s in STORE_NAMES if any(x in s.lower() for x in ["groc", "super", "mart", "market"])])
                    elif store_pref == "Retail":
                        store_name = random.choice([s for s in STORE_NAMES if any(x in s.lower() for x in ["uniqlo", "h&m", "zara", "ikea"])])
                    else:
                        store_name = random.choice(STORE_NAMES)
                    
                    receipt_data = generate_receipt_data(store_name, receipt_date)
                    
                    # Generate items using AI based on portrait
                    items_data = await generate_items_for_portrait(portrait, categories, store_name)
                    
                    # Calculate totals
                    subtotal = Decimal(str(sum(item["amount"] for item in items_data)))
                    tax = subtotal * Decimal("0.06")  # 6% tax
                    total = (subtotal + tax).quantize(Decimal("0.01"))
                    
                    # Adjust total to match spending range if needed
                    spending_range = portrait.get("spending_range", {"min": 50, "max": 200})
                    if float(total) < spending_range["min"]:
                        # Scale up items slightly
                        scale_factor = Decimal(str(spending_range["min"] / float(total)))
                        for item in items_data:
                            item["unit_price"] = round(float(Decimal(str(item["unit_price"])) * scale_factor), 2)
                            item["amount"] = round((item["quantity"] * item["unit_price"]) - item["discount"], 2)
                        subtotal = Decimal(str(sum(item["amount"] for item in items_data)))
                        tax = subtotal * Decimal("0.06")
                        total = (subtotal + tax).quantize(Decimal("0.01"))
                    
                    receipt_data["invoice"]["items"] = items_data
                    receipt_data["invoice"]["summary"]["subtotal"] = float(subtotal)
                    receipt_data["invoice"]["summary"]["tax"] = float(tax)
                    receipt_data["invoice"]["summary"]["total"] = float(total)
                    receipt_data["invoice"]["payment"]["amount_paid"] = float(total)
                    
                    # Create receipt
                    receipt = Receipt(
                        wallet_address=wallet_address,
                        source_image_url=receipt_data["meta"]["source_image"],
                        receipt_data=receipt_data,
                        store_name=store_name,
                        receipt_time=receipt_date,
                    )
                    session.add(receipt)
                    await session.flush()
                    
                    # Create receipt items
                    for item_idx, item_data in enumerate(items_data):
                        receipt_item = ReceiptItem(
                            receipt_id=receipt.id,
                            description=item_data["description"],
                            barcode=item_data.get("barcode"),
                            quantity=item_data["quantity"],
                            unit=item_data["unit"],
                            unit_price=item_data["unit_price"],
                            discount=item_data["discount"],
                            amount=item_data["amount"],
                            currency=item_data["currency"],
                            category=item_data["category"],
                            sub_category=item_data.get("sub_category"),
                            display_order=item_idx + 1,
                        )
                        session.add(receipt_item)
                    
                    total_receipts += 1
                    total_items += len(items_data)
                
                await session.commit()
                print(f"  ✓ Created 20 receipts with {total_items} items")
            
            print("\n✅ Successfully generated fake data!")
            print(f"   - {len(wallet_addresses)} wallet addresses")
            print(f"   - {len(wallet_addresses)} user portraits")
            print(f"   - {total_receipts} receipts")
            print(f"   - {total_items} items")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error generating fake data: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(generate_fake_data())

