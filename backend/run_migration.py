import asyncio
from sqlalchemy import text
from main import engine

async def run_migration():
    print("Running migration...")
    async with engine.begin() as conn:
        with open("migrate_models_add_github.sql", "r") as f:
            sql = f.read()
            # Split by semicolon to handle multiple statements if any, though we only have one
            statements = [s.strip() for s in sql.split(";") if s.strip()]
            for statement in statements:
                print(f"Executing: {statement}")
                await conn.execute(text(statement))
    print("Migration completed.")

if __name__ == "__main__":
    asyncio.run(run_migration())
