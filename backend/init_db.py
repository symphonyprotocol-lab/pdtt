"""
Database initialization script.
Run this to create all tables in the remote database.

Usage:
    uv run init_db.py
    or
    python init_db.py
"""
import asyncio
from main import Base, engine, settings, _normalize_database_url


async def init_database() -> None:
    """Create all database tables."""
    database_url = _normalize_database_url(settings.database_url)
    print(f"Connecting to database: {database_url.split('@')[-1] if '@' in database_url else '***'}")
    
    async with engine.begin() as conn:
        print("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✓ Database schema created successfully!")
        print("\nTables created:")
        for table_name in Base.metadata.tables.keys():
            print(f"  - {table_name}")


async def drop_all_tables() -> None:
    """Drop all database tables (use with caution!)."""
    database_url = _normalize_database_url(settings.database_url)
    print(f"⚠ WARNING: Dropping all tables from: {database_url.split('@')[-1] if '@' in database_url else '***'}")
    
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("✓ All tables dropped!")


async def reset_database() -> None:
    """Drop and recreate all tables."""
    await drop_all_tables()
    await init_database()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        if command == "drop":
            asyncio.run(drop_all_tables())
        elif command == "reset":
            asyncio.run(reset_database())
        else:
            print(f"Unknown command: {command}")
            print("Usage: python init_db.py [init|drop|reset]")
            sys.exit(1)
    else:
        # Default: just create tables
        asyncio.run(init_database())

