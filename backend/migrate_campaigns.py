"""
Migration script to add target_wallet_addresses column to campaigns table.

Usage:
    uv run migrate_campaigns.py
"""
import asyncio
from sqlalchemy import text
from main import engine, settings


async def migrate_campaigns() -> None:
    """Add target_wallet_addresses column to campaigns table."""
    print(f"Connecting to database...")
    
    async with engine.begin() as conn:
        print("Checking campaigns table structure...")
        
        # Check if target_wallet_addresses column exists
        check_column = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns' AND column_name = 'target_wallet_addresses'
        """)
        result = await conn.execute(check_column)
        column_exists = result.fetchone() is not None
        
        # Check if campaigns table exists
        check_table = text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'campaigns'
        """)
        result = await conn.execute(check_table)
        table_exists = result.fetchone() is not None
        
        if not table_exists:
            print("⚠ campaigns table does not exist. It will be created automatically on next startup.")
            return
        
        # Add target_wallet_addresses column if it doesn't exist
        if not column_exists:
            print("Adding target_wallet_addresses column to campaigns table...")
            # Use JSONB type (PostgreSQL standard) with default empty array
            await conn.execute(text("""
                ALTER TABLE campaigns 
                ADD COLUMN target_wallet_addresses JSONB DEFAULT '[]'::jsonb
            """))
            print("✓ Added target_wallet_addresses column")
        else:
            print("✓ target_wallet_addresses column already exists")
        
        print("\n✓ Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate_campaigns())

