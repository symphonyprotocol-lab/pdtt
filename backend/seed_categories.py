"""
Seed script to populate categories and subcategories.
Run this to add product categories to the database.

Usage:
    uv run seed_categories.py
    or
    python seed_categories.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import main
sys.path.insert(0, str(Path(__file__).parent))

from main import AsyncSessionFactory, Category, SubCategory
from sqlalchemy import select


CATEGORY_DATA = [
    {
        "name": "Fresh Produce",
        "display_order": 1,
        "subcategories": [
            "Fruits",
            "Vegetables",
            "Salad & Herbs",
            "Ready-to-eat / Cut Fruit",
        ],
    },
    {
        "name": "Meat, Poultry & Seafood",
        "display_order": 2,
        "subcategories": [
            "Fresh Meat (pork, beef, lamb)",
            "Poultry (chicken, duck)",
            "Seafood (fish, shellfish, frozen seafood)",
            "Marinated / Ready-to-cook",
        ],
    },
    {
        "name": "Dairy, Chilled & Eggs",
        "display_order": 3,
        "subcategories": [
            "Milk & Milk Alternatives",
            "Cheese & Spreads",
            "Yoghurt & Desserts",
            "Eggs",
            "Chilled ready meals",
        ],
    },
    {
        "name": "Frozen",
        "display_order": 4,
        "subcategories": [
            "Frozen Vegetables & Fruits",
            "Frozen Seafood & Meat",
            "Frozen Ready Meals / Dim Sum / Desserts",
            "Ice Cream & Novelties",
        ],
    },
    {
        "name": "Pantry / Groceries",
        "display_order": 5,
        "subcategories": [
            "Rice, Noodles & Pasta",
            "Canned & Jarred Foods",
            "Sauces, Condiments & Cooking Pastes",
            "Cooking Oils & Vinegars",
            "Baking & Cooking Ingredients",
            "Breakfast & Spreads",
        ],
    },
    {
        "name": "Beverages",
        "display_order": 6,
        "subcategories": [
            "Water & Flavoured Water",
            "Juices & Isotonic Drinks",
            "Soft Drinks",
            "Coffee & Tea",
            "Alcoholic Beverages (beer, wine, spirits)",
        ],
    },
    {
        "name": "Snacks & Confectionery",
        "display_order": 7,
        "subcategories": [
            "Chips & Crisps",
            "Biscuits & Cookies",
            "Confectionery & Chocolates",
            "Local snacks / Instant noodles",
        ],
    },
    {
        "name": "Household & Cleaning",
        "display_order": 8,
        "subcategories": [
            "Laundry",
            "Dishwashing",
            "Household Cleaning (floor, toilet, multipurpose)",
            "Paper goods (tissues, toilet paper, kitchen towels)",
        ],
    },
    {
        "name": "Personal Care & Beauty",
        "display_order": 9,
        "subcategories": [
            "Skin care",
            "Hair care",
            "Oral care",
            "Bath & Body",
            "Health supplies (first aid, supplements)",
        ],
    },
    {
        "name": "Baby & Child",
        "display_order": 10,
        "subcategories": [
            "Baby Food & Formula",
            "Diapers & Wipes",
            "Baby Care products",
        ],
    },
    {
        "name": "Pet Care",
        "display_order": 11,
        "subcategories": [
            "Pet Food (cat, dog)",
            "Pet Accessories / Treats",
        ],
    },
]


async def seed_categories() -> None:
    """Seed categories and subcategories into the database."""
    async with AsyncSessionFactory() as session:
        try:
            # Check if categories already exist
            stmt = select(Category)
            result = await session.execute(stmt)
            existing_categories = result.scalars().all()
            
            if existing_categories:
                print(f"⚠ Found {len(existing_categories)} existing categories. Skipping seed.")
                print("To re-seed, delete existing categories first.")
                return

            print("Seeding categories and subcategories...")
            
            for cat_data in CATEGORY_DATA:
                # Create category
                category = Category(
                    name=cat_data["name"],
                    display_order=cat_data["display_order"],
                )
                session.add(category)
                await session.flush()
                
                # Create subcategories
                for idx, subcat_name in enumerate(cat_data["subcategories"]):
                    subcategory = SubCategory(
                        category_id=category.id,
                        name=subcat_name,
                        display_order=idx + 1,
                    )
                    session.add(subcategory)
                
                print(f"  ✓ Added category: {cat_data['name']} ({len(cat_data['subcategories'])} subcategories)")
            
            await session.commit()
            print(f"\n✓ Successfully seeded {len(CATEGORY_DATA)} categories!")
            
            # Print summary
            total_subcategories = sum(len(cat["subcategories"]) for cat in CATEGORY_DATA)
            print(f"  Total subcategories: {total_subcategories}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error seeding categories: {e}")
            raise


async def clear_categories() -> None:
    """Clear all categories and subcategories (use with caution!)."""
    async with AsyncSessionFactory() as session:
        try:
            print("⚠ WARNING: Deleting all categories and subcategories...")
            
            # Delete all subcategories (cascade will handle it, but explicit is clearer)
            from sqlalchemy import delete
            await session.execute(delete(SubCategory))
            await session.execute(delete(Category))
            await session.commit()
            
            print("✓ All categories and subcategories deleted!")
        except Exception as e:
            await session.rollback()
            print(f"❌ Error clearing categories: {e}")
            raise


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        asyncio.run(clear_categories())
    else:
        asyncio.run(seed_categories())

