"""
Seed script to add initial model data to the database.

Usage:
    uv run seed_models.py
"""
import asyncio
from sqlalchemy import text
from main import engine, settings, Model
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker


async def seed_models() -> None:
    """Seed initial model data."""
    print("Connecting to database...")
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Check if models already exist
        check_stmt = text("SELECT COUNT(*) FROM models")
        result = await session.execute(check_stmt)
        count = result.scalar()
        
        if count > 0:
            print(f"✓ Found {count} existing models. Skipping seed.")
            return
        
        print("Seeding initial model data...")
        
        # Default wallet address for model supplier (can be changed)
        default_wallet = "0x0000000000000000000000000000000000000000000000000000000000000001"
        
        models_data = [
            {
                "wallet_address": default_wallet,
                "name": "Customer Segmentation Model",
                "abbreviation": "CSM",
                "description": "Advanced ML model for identifying customer segments based on purchase behavior",
                "category": "Marketing",
                "rank": 1,
                "used_times": 1245,
                "reward_tokens": 12500.0,
                "version": "2.1.0",
                "accuracy": 94.5,
                "parameters": 1250000,
            },
            {
                "wallet_address": default_wallet,
                "name": "Churn Prediction Model",
                "abbreviation": "CPM",
                "description": "Predicts customer churn probability with 92% accuracy",
                "category": "Analytics",
                "rank": 2,
                "used_times": 892,
                "reward_tokens": 8900.0,
                "version": "1.5.2",
                "accuracy": 92.0,
                "parameters": 850000,
            },
            {
                "wallet_address": default_wallet,
                "name": "Recommendation Engine",
                "abbreviation": "RE",
                "description": "Personalized product recommendations using collaborative filtering",
                "category": "E-commerce",
                "rank": 3,
                "used_times": 567,
                "reward_tokens": 5600.0,
                "version": "3.0.1",
                "accuracy": 88.3,
                "parameters": 2100000,
            },
        ]
        
        for model_data in models_data:
            model = Model(**model_data)
            session.add(model)
            print(f"  - Added: {model_data['name']}")
        
        await session.commit()
        
        print(f"\n✓ Successfully seeded {len(models_data)} models!")


if __name__ == "__main__":
    asyncio.run(seed_models())

