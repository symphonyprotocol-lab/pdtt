"""
Migration script to add store_name and receipt_time columns to receipts table
and create receipt_items table.

Usage:
    uv run migrate_receipts.py
"""
import asyncio
from sqlalchemy import text
from main import engine, settings, _normalize_database_url


async def migrate_receipts() -> None:
    """Add new columns to receipts table and create receipt_items table."""
    database_url = _normalize_database_url(settings.database_url)
    print(f"Connecting to database: {database_url.split('@')[-1] if '@' in database_url else '***'}")
    
    async with engine.begin() as conn:
        print("Checking receipts table structure...")
        
        # Check if store_name column exists
        check_store_name = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'store_name'
        """)
        result = await conn.execute(check_store_name)
        store_name_exists = result.fetchone() is not None
        
        # Check if receipt_time column exists
        check_receipt_time = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'receipts' AND column_name = 'receipt_time'
        """)
        result = await conn.execute(check_receipt_time)
        receipt_time_exists = result.fetchone() is not None
        
        # Check if receipt_items table exists
        check_table = text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'receipt_items'
        """)
        result = await conn.execute(check_table)
        receipt_items_exists = result.fetchone() is not None
        
        # Add store_name column if it doesn't exist
        if not store_name_exists:
            print("Adding store_name column to receipts table...")
            await conn.execute(text("""
                ALTER TABLE receipts 
                ADD COLUMN store_name VARCHAR(256)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_receipts_store_name ON receipts(store_name)
            """))
            print("✓ Added store_name column")
        else:
            print("✓ store_name column already exists")
        
        # Add receipt_time column if it doesn't exist
        if not receipt_time_exists:
            print("Adding receipt_time column to receipts table...")
            await conn.execute(text("""
                ALTER TABLE receipts 
                ADD COLUMN receipt_time TIMESTAMP WITHOUT TIME ZONE
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_receipts_receipt_time ON receipts(receipt_time)
            """))
            print("✓ Added receipt_time column")
        else:
            print("✓ receipt_time column already exists")
        
        # Create receipt_items table if it doesn't exist
        if not receipt_items_exists:
            print("Creating receipt_items table...")
            await conn.execute(text("""
                CREATE TABLE receipt_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    receipt_id UUID NOT NULL,
                    description VARCHAR(512) NOT NULL,
                    barcode VARCHAR(128),
                    quantity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
                    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    discount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                    currency VARCHAR(8) NOT NULL DEFAULT 'MYR',
                    category VARCHAR(128),
                    sub_category VARCHAR(128),
                    display_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_receipt_items_receipt_id 
                        FOREIGN KEY (receipt_id) 
                        REFERENCES receipts(id) 
                        ON DELETE CASCADE
                )
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_receipt_items_receipt_id ON receipt_items(receipt_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_receipt_items_category ON receipt_items(category)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_receipt_items_sub_category ON receipt_items(sub_category)
            """))
            print("✓ Created receipt_items table")
        else:
            print("✓ receipt_items table already exists")
        
        print("\n✓ Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate_receipts())

