from __future__ import annotations
from datetime import datetime
from typing import Annotated, List
from uuid import UUID, uuid4
import random

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, Field, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import ForeignKey, String, Text, JSON, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, selectinload
import json
import os


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini")
    cors_origins: str | None = None
    system_prompt: str = Field(
        default=(
            "You are Persdato, a helpful AI assistant that helps users tokenize "
            "and trade their personal data responsibly. Keep responses concise "
            "and actionable."
        )
    )

    model_config = SettingsConfigDict(
        env_file=".env.local", 
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra environment variables that aren't defined in the model
    )


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


settings = Settings()

database_url = _normalize_database_url(settings.database_url)
engine = create_async_engine(database_url, future=True)
AsyncSessionFactory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), index=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    messages: Mapped[List["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id: Mapped[UUID] = mapped_column(
        PGUUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    attachment_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), index=True)
    source_image_url: Mapped[str] = mapped_column(String(512))
    receipt_data: Mapped[dict] = mapped_column(JSON)
    store_name: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    receipt_time: Mapped[datetime | None] = mapped_column(nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    items: Mapped[List["ReceiptItem"]] = relationship(
        back_populates="receipt", cascade="all, delete-orphan", order_by="ReceiptItem.display_order"
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    display_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    subcategories: Mapped[List["SubCategory"]] = relationship(
        back_populates="category", cascade="all, delete-orphan", order_by="SubCategory.display_order"
    )


class SubCategory(Base):
    __tablename__ = "subcategories"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    category_id: Mapped[UUID] = mapped_column(
        PGUUID, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128))
    display_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    category: Mapped[Category] = relationship(back_populates="subcategories")


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    receipt_id: Mapped[UUID] = mapped_column(
        PGUUID, ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(512))
    barcode: Mapped[str | None] = mapped_column(String(128), nullable=True)
    quantity: Mapped[float] = mapped_column(default=0.0)
    unit: Mapped[str] = mapped_column(String(32), default="pcs")
    unit_price: Mapped[float] = mapped_column(default=0.0)
    discount: Mapped[float] = mapped_column(default=0.0)
    amount: Mapped[float] = mapped_column(default=0.0)
    currency: Mapped[str] = mapped_column(String(8), default="MYR")
    category: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    sub_category: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    display_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    receipt: Mapped[Receipt] = relationship(back_populates="items")


class ShareToEarnSettings(Base):
    __tablename__ = "share_to_earn_settings"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    agreed: Mapped[bool] = mapped_column(default=False)
    selected_categories: Mapped[dict] = mapped_column(JSON, default=dict)  # {category_id: bool}
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class UserPortrait(Base):
    __tablename__ = "user_portraits"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    interests: Mapped[dict] = mapped_column(JSON, default=dict)  # List of interest types
    estimated_age: Mapped[int | None] = mapped_column(nullable=True)
    purchase_behaviors: Mapped[dict] = mapped_column(JSON, default=dict)  # Purchase behavior traits
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # Generated description
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    query: Mapped[str] = mapped_column(Text)
    budget: Mapped[float] = mapped_column(default=0.0)
    target_group: Mapped[str] = mapped_column(Text)
    user_portrait: Mapped[dict] = mapped_column(JSON)  # {demographics, interests[], behavior, usedModels[]}
    coupon_design: Mapped[dict] = mapped_column(JSON)  # {description, imageUrl}
    target_wallet_addresses: Mapped[List[str]] = mapped_column(JSON, default=list)  # List of target wallet addresses
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, completed, failed, stopped
    user_count: Mapped[int] = mapped_column(default=0)
    coupon_sent: Mapped[int] = mapped_column(default=0)
    coupon_used: Mapped[int] = mapped_column(default=0)  # Number of coupons actually used/redeemed
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(nullable=True)  # When the campaign was stopped
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    campaign_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    target_user_address: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    voucher_detail: Mapped[dict] = mapped_column(JSON)  # Stores coupon design details
    delivered: Mapped[bool] = mapped_column(default=False)  # User clicked/viewed the notification
    read: Mapped[bool] = mapped_column(default=False, index=True)  # User clicked on the notification
    user_accepted: Mapped[bool] = mapped_column(default=False)  # User accepted/claimed the coupon
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)  # When user clicked/viewed
    read_at: Mapped[datetime | None] = mapped_column(nullable=True)  # When user clicked on notification
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)  # When user accepted/claimed


class UserVoucher(Base):
    __tablename__ = "user_vouchers"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    notification_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    campaign_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    voucher_detail: Mapped[dict] = mapped_column(JSON)  # Stores coupon design details
    condition: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-readable validation criteria for receipt matching
    status: Mapped[str] = mapped_column(String(32), default="wait_to_user", index=True)  # wait_to_user, accepted, declined, used, expired
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    declined_at: Mapped[datetime | None] = mapped_column(nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(nullable=True)


class Model(Base):
    __tablename__ = "models"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(128), nullable=False, index=True)  # Model supplier's wallet
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    abbreviation: Mapped[str] = mapped_column(String(32), nullable=False)  # 3-word short abbreviation
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    rank: Mapped[int] = mapped_column(default=0, index=True)  # Ranking based on usage/performance
    used_times: Mapped[int] = mapped_column(default=0)  # Number of times the model has been used
    reward_tokens: Mapped[float] = mapped_column(default=0.0)  # Total reward tokens earned
    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    accuracy: Mapped[float] = mapped_column(default=0.0)  # Model accuracy percentage
    parameters: Mapped[int] = mapped_column(default=0)  # Number of model parameters
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


async def get_session() -> AsyncSession:
    async with AsyncSessionFactory() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


class MessageResource(BaseModel):
    id: UUID
    role: str
    content: str
    attachment_url: str | None = Field(default=None, alias="attachmentUrl")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ConversationResource(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    messages: List[MessageResource]

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ChatRequest(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    message: str
    attachment_url: str | None = Field(default=None, alias="attachmentUrl")


class ChatResponse(ConversationResource):
    pass


class ClearResponse(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    cleared: bool = True


def _normalize_wallet_address(address: str) -> str:
    return address.lower().strip()


openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

app = FastAPI(title="PDTT Backend", version="1.0.0")

allowed_origins = ["*"]
if settings.cors_origins:
    allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _get_conversation(session: AsyncSession, wallet_address: str) -> Conversation | None:
    stmt = select(Conversation).where(Conversation.wallet_address == wallet_address)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _get_or_create_conversation(session: AsyncSession, wallet_address: str) -> Conversation:
    conversation = await _get_conversation(session, wallet_address)
    if conversation:
        return conversation

    conversation = Conversation(wallet_address=wallet_address)
    session.add(conversation)
    await session.flush()
    return conversation


async def _list_messages(session: AsyncSession, conversation_id: UUID, limit: int = 20) -> List[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    messages = list(reversed(result.scalars().all()))
    return messages


async def _call_openai(history: List[dict[str, str]]) -> str:
    try:
        completion = await openai_client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.3,
            messages=[
                {"role": "system", "content": settings.system_prompt},
                *history,
            ],
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        return content
    except OpenAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI request failed: {exc}",
        ) from exc


async def _load_ocr_prompt(session: AsyncSession) -> str:
    """Load the OCR prompt template from file and inject category data."""
    # Fetch categories and subcategories from database
    stmt = (
        select(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.display_order)
    )
    result = await session.execute(stmt)
    categories = result.scalars().all()
    
    # Format categories for the prompt
    categories_text = "Available Categories and Subcategories:\n"
    for cat in categories:
        categories_text += f"\n{cat.display_order}. {cat.name}:\n"
        for subcat in cat.subcategories:
            categories_text += f"   - {subcat.name}\n"
    
    prompt_path = os.path.join(os.path.dirname(__file__), "test", "ocr_prompt.md")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            template = f.read()
            # Inject categories into the template
            if "{{categories}}" in template:
                template = template.replace("{{categories}}", categories_text)
            else:
                # If template doesn't have placeholder, append categories before "Return only the final JSON"
                if "Return only the final JSON" in template:
                    template = template.replace(
                        "Return only the final JSON",
                        f"{categories_text}\n\nReturn only the final JSON"
                    )
                else:
                    template = f"{template}\n\n{categories_text}"
            return template
    except FileNotFoundError:
        # Fallback prompt if file doesn't exist
        fallback_prompt = """Extract receipt information into JSON format following this schema:
{
  "meta": {
    "source_image": "",
    "extracted_at": "<ISO 8601 datetime>",
    "ocr_engine": "gpt-4o",
    "language": "en",
    "currency": "MYR"
  },
  "store": {
    "name": "",
    "company": "",
    "registration_no": "",
    "branch": "",
    "address": "",
    "phone": "",
    "email": "",
    "website": ""
  },
  "invoice": {
    "invoice_no": "",
    "order_no": "",
    "date": "",
    "time": "",
    "cashier": "",
    "buyer_tin": "",
    "e_invoice_uuid": "",
    "items": [
      {
        "description": "",
        "barcode": "",
        "quantity": 0,
        "unit": "pcs",
        "unit_price": 0.0,
        "discount": 0.0,
        "amount": 0.0,
        "currency": "",
        "category": "",
        "sub_category": ""
      }
    ],
    "summary": {
      "subtotal": 0.0,
      "discount_total": 0.0,
      "tax": 0.0,
      "rounding_adjustment": 0.0,
      "total": 0.0
    },
    "payment": {
      "method": "",
      "amount_paid": 0.0,
      "change": 0.0,
      "card_type": "",
      "transaction_id": ""
    }
  },
  "footer": {
    "thank_you_message": "",
    "notes": "",
    "socials": {},
    "contact": {}
  }
}

=== Additional Rules ===
- Normalize all numbers (e.g. 61.85, not "RM61.85" OR "$61.85").
- Include tax, rounding, or discount lines under `summary`.
- Extract all visible line items under `items`.
- Preserve multilingual text (Chinese, Malay, English) exactly as shown.
- Do not guess missing data.
- Always include `currency` as "$" unless clearly another.
- For each item, assign the most appropriate `category` and `sub_category` from the available categories list below.
- Match item descriptions to the closest category/subcategory. If unsure, use the most general category that fits.

""" + categories_text + "\n\nReturn only the final JSON."
        return fallback_prompt


async def _process_receipt_ocr(image_url: str, session: AsyncSession) -> dict:
    """Process receipt image using OCR and return structured JSON."""
    try:
        # Step 1: Extract text from image using gpt-4o vision
        ocr_prompt = "Read all text on the receipt including Chinese\nExtract the receipt into JSON\nReturn only the final JSON"
        
        ocr_completion = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": ocr_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            max_tokens=4000,
        )
        
        raw_json_text = ocr_completion.choices[0].message.content
        if not raw_json_text:
            raise ValueError("Empty OCR response")
        
        # Step 2: Use the OCR prompt template to structure the data
        ocr_template = await _load_ocr_prompt(session)
        structured_prompt = ocr_template.replace("{{inputJson}}", raw_json_text)
        
        # Step 3: Structure the JSON according to schema
        try:
            structure_completion = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": structured_prompt
                    }
                ],
                max_tokens=4000,
                response_format={"type": "json_object"},
            )
        except Exception:
            # If JSON mode fails, try without it
            structure_completion = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": structured_prompt
                    }
                ],
                max_tokens=4000,
            )
        
        structured_json_text = structure_completion.choices[0].message.content
        if not structured_json_text:
            raise ValueError("Empty structured response")
        
        # Clean up the JSON text (remove markdown code blocks if present)
        cleaned_text = structured_json_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()
        
        # Parse and validate JSON
        receipt_data = json.loads(cleaned_text)
        
        # Add metadata
        receipt_data.setdefault("meta", {})
        receipt_data["meta"]["source_image"] = image_url
        receipt_data["meta"]["extracted_at"] = datetime.utcnow().isoformat()
        receipt_data["meta"]["ocr_engine"] = "gpt-4o"
        
        return receipt_data
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse receipt JSON: {exc}",
        ) from exc
    except OpenAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI OCR request failed: {exc}",
        ) from exc


async def _update_user_portrait(session: AsyncSession, wallet_address: str) -> None:
    """Analyze user's receipts and update their portrait using Customer Segmentation Model."""
    # Get Customer Segmentation Model
    segmentation_model_name = "Customer Segmentation Model"
    stmt_model = select(Model).where(Model.name == segmentation_model_name)
    result_model = await session.execute(stmt_model)
    segmentation_model = result_model.scalar_one_or_none()
    
    if not segmentation_model:
        print(f"Warning: {segmentation_model_name} not found. Interests will not be marked with model.")
    
    # Get all receipts with items for this wallet
    stmt = (
        select(Receipt)
        .options(selectinload(Receipt.items))
        .where(Receipt.wallet_address == wallet_address)
        .order_by(Receipt.created_at.desc())
    )
    result = await session.execute(stmt)
    receipts = result.scalars().all()
    
    if not receipts:
        return
    
    # Analyze purchase patterns
    category_counts: dict[str, int] = {}
    subcategory_counts: dict[str, int] = {}
    total_spent = 0.0
    receipt_count = len(receipts)
    item_count = 0
    store_types: dict[str, int] = {}
    purchase_times: list[int] = []  # Hour of day
    purchase_days: list[int] = []  # Day of week
    brands: dict[str, int] = {}
    
    for receipt in receipts:
        if receipt.receipt_time:
            purchase_times.append(receipt.receipt_time.hour)
            purchase_days.append(receipt.receipt_time.weekday())
        
        receipt_data = receipt.receipt_data
        total = receipt_data.get("invoice", {}).get("summary", {}).get("total", 0.0)
        total_spent += float(total)
        
        store_name = receipt.store_name or ""
        if store_name:
            # Categorize store type
            store_type = "Grocery" if any(x in store_name.lower() for x in ["groc", "super", "mart", "store", "market"]) else "Other"
            store_types[store_type] = store_types.get(store_type, 0) + 1
        
        for item in receipt.items:
            item_count += 1
            if item.category:
                category_counts[item.category] = category_counts.get(item.category, 0) + 1
            if item.sub_category:
                subcategory_counts[item.sub_category] = subcategory_counts.get(item.sub_category, 0) + 1
            
            # Extract brand from description (format: "Item - Brand")
            if " - " in item.description:
                brand = item.description.split(" - ")[-1]
                brands[brand] = brands.get(brand, 0) + 1
    
    # Generate interests using Customer Segmentation Model (all interests are from this model)
    interests = []
    model_name = segmentation_model.name if segmentation_model else segmentation_model_name
    
    # 1. Shopping category interest
    top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    for cat, count in top_categories:
        interests.append({"name": f"{cat} Enthusiast", "model": model_name})
    
    # 2. Store preference
    if store_types:
        top_store_type = max(store_types.items(), key=lambda x: x[1])[0]
        interests.append({"name": f"{top_store_type} Shopper", "model": model_name})
    
    # 3. Brand loyalty
    if brands:
        top_brands = sorted(brands.items(), key=lambda x: x[1], reverse=True)[:2]
        for brand, count in top_brands:
            if count >= 3:  # Only if purchased multiple times
                interests.append({"name": f"{brand} Fan", "model": model_name})
    
    # 4. Purchase frequency
    if receipt_count > 0:
        days_since_first = (datetime.utcnow() - receipts[-1].created_at).days
        avg_receipts_per_month = receipt_count / max(1, days_since_first / 30)
        if avg_receipts_per_month > 10:
            interests.append({"name": "Frequent Shopper", "model": model_name})
        elif avg_receipts_per_month > 5:
            interests.append({"name": "Regular Shopper", "model": model_name})
        else:
            interests.append({"name": "Occasional Shopper", "model": model_name})
    
    # 5. Spending pattern
    avg_spending = total_spent / receipt_count if receipt_count > 0 else 0
    if avg_spending > 200:
        interests.append({"name": "Premium Spender", "model": model_name})
    elif avg_spending > 100:
        interests.append({"name": "Moderate Spender", "model": model_name})
    else:
        interests.append({"name": "Budget-Conscious", "model": model_name})
    
    # 6. Time-based interest
    if purchase_times:
        avg_hour = sum(purchase_times) / len(purchase_times)
        if avg_hour < 12:
            interests.append({"name": "Morning Shopper", "model": model_name})
        elif avg_hour < 18:
            interests.append({"name": "Afternoon Shopper", "model": model_name})
        else:
            interests.append({"name": "Evening Shopper", "model": model_name})
    
    # 7. Category-specific interests
    if "Baby & Child" in category_counts:
        interests.append({"name": "Parent", "model": model_name})
    if "Pet Care" in category_counts:
        interests.append({"name": "Pet Owner", "model": model_name})
    if "Personal Care & Beauty" in category_counts and category_counts["Personal Care & Beauty"] > 5:
        interests.append({"name": "Beauty Enthusiast", "model": model_name})
    if "Snacks & Confectionery" in category_counts and category_counts["Snacks & Confectionery"] > 5:
        interests.append({"name": "Snack Lover", "model": model_name})
    
    # Ensure at least 5 interests
    while len(interests) < 5:
        interests.append({"name": "Active Consumer", "model": model_name})
    
    # Estimate age based on purchase patterns
    estimated_age = None
    if "Baby & Child" in category_counts:
        estimated_age = random.randint(25, 40)  # Likely parent age
    elif "Pet Care" in category_counts and "Snacks & Confectionery" in category_counts:
        estimated_age = random.randint(22, 35)  # Young adult
    elif "Personal Care & Beauty" in category_counts and category_counts["Personal Care & Beauty"] > 10:
        estimated_age = random.randint(20, 35)  # Beauty-focused
    elif avg_spending > 150:
        estimated_age = random.randint(30, 50)  # Higher income
    else:
        estimated_age = random.randint(25, 45)  # General range
    
    # Purchase behaviors
    behaviors = {
        "spending_level": "High" if avg_spending > 150 else "Moderate" if avg_spending > 80 else "Low",
        "frequency": "High" if receipt_count > 15 else "Moderate" if receipt_count > 8 else "Low",
        "preferred_time": "Morning" if purchase_times and sum(purchase_times) / len(purchase_times) < 12 else "Afternoon" if purchase_times and sum(purchase_times) / len(purchase_times) < 18 else "Evening",
        "store_preference": top_store_type if store_types else "Mixed",
        "category_diversity": "High" if len(category_counts) > 8 else "Moderate" if len(category_counts) > 5 else "Low",
    }
    
    # Generate description
    top_category = top_categories[0][0] if top_categories else "Shopping"
    description_parts = [
        f"A {behaviors['spending_level'].lower()} spender",
        f"who shops {behaviors['frequency'].lower()}ly",
        f"primarily for {top_category.lower()}",
    ]
    if brands and len(brands) > 0:
        top_brand = max(brands.items(), key=lambda x: x[1])[0]
        description_parts.append(f"with a preference for {top_brand}")
    description = ", ".join(description_parts) + "."
    
    # Save or update portrait
    stmt = select(UserPortrait).where(UserPortrait.wallet_address == wallet_address)
    result = await session.execute(stmt)
    portrait = result.scalar_one_or_none()
    
    if not portrait:
        portrait = UserPortrait(
            wallet_address=wallet_address,
            interests=interests[:10],  # Limit to 10 interests, each with model info
            estimated_age=estimated_age,
            purchase_behaviors=behaviors,
            description=description,
        )
        session.add(portrait)
    else:
        portrait.interests = interests[:10]
        portrait.estimated_age = estimated_age
        portrait.purchase_behaviors = behaviors
        portrait.description = description
        portrait.updated_at = datetime.utcnow()
    
    # Increment model usage count
    if segmentation_model:
        segmentation_model.used_times += 1
        await session.flush()
    
    await session.flush()
    print(f"User portrait updated: {len(interests)} interests from {model_name}, age {estimated_age}")


def _is_command_message(message: str) -> tuple[bool, str | None]:
    """Check if message is a command and extract command name."""
    message = message.strip()
    # Check for command prefixes or exact command names
    if message.startswith("/") or message.startswith("Command:"):
        # Extract command name (e.g., "UploadReceipt" from "/UploadReceipt" or "Command:UploadReceipt")
        parts = message.replace("/", "").replace("Command:", "").strip().split()
        if parts:
            return True, parts[0]
    # Also check for exact command names (e.g., "SendReceipt"
    known_commands = ["SendReceipt"]
    if message in known_commands:
        return True, message
    return False, None


@app.post("/api/chat", response_model=ChatResponse)
async def send_message(payload: ChatRequest, session: SessionDep) -> ChatResponse:
    print(payload)
    wallet_address = _normalize_wallet_address(payload.wallet_address)
    if not wallet_address:
        raise HTTPException(status_code=400, detail="walletAddress is required")

    conversation = await _get_or_create_conversation(session, wallet_address)

    # Check if this is a command message
    is_command, command_name = _is_command_message(payload.message)
    
    print(is_command, command_name)
    # Store user message
    user_message = Message(
        conversation_id=conversation.id,
        role="command" if is_command else "user",
        content=payload.message,
        attachment_url=payload.attachment_url,
    )
    session.add(user_message)
    await session.flush()

    # Handle command messages
    if is_command and command_name == "SendReceipt" and payload.attachment_url:
        try:
            print("Processing receipt OCR")
            # Process receipt OCR
            receipt_data = await _process_receipt_ocr(payload.attachment_url, session)
            print(receipt_data)
            
            # Extract store_name and receipt_time from receipt_data
            store_name = receipt_data.get("store", {}).get("name") or None
            receipt_time = None
            invoice_data = receipt_data.get("invoice", {})
            if invoice_data.get("date"):
                try:
                    date_str = invoice_data["date"]
                    time_str = invoice_data.get("time", "00:00:00")
                    # Try parsing date in various formats
                    if time_str and time_str != "00:00:00":
                        datetime_str = f"{date_str} {time_str}"
                        try:
                            receipt_time = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                        except ValueError:
                            try:
                                receipt_time = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
                            except ValueError:
                                pass
                    # If no time or parsing failed, try date only
                    if receipt_time is None:
                        try:
                            receipt_time = datetime.strptime(date_str, "%Y-%m-%d")
                        except ValueError:
                            pass
                except (ValueError, TypeError):
                    pass
            
            # Save receipt to database
            receipt = Receipt(
                wallet_address=wallet_address,
                source_image_url=payload.attachment_url,
                receipt_data=receipt_data,
                store_name=store_name,
                receipt_time=receipt_time,
            )
            session.add(receipt)
            await session.flush()
            
            # Save receipt items separately
            items_data = invoice_data.get("items", [])
            for idx, item_data in enumerate(items_data):
                receipt_item = ReceiptItem(
                    receipt_id=receipt.id,
                    description=item_data.get("description", ""),
                    barcode=item_data.get("barcode") or None,
                    quantity=float(item_data.get("quantity", 0.0)),
                    unit=item_data.get("unit", "pcs"),
                    unit_price=float(item_data.get("unit_price", 0.0)),
                    discount=float(item_data.get("discount", 0.0)),
                    amount=float(item_data.get("amount", 0.0)),
                    currency=item_data.get("currency", "MYR"),
                    category=item_data.get("category") or None,
                    sub_category=item_data.get("sub_category") or None,
                    display_order=idx + 1,
                )
                session.add(receipt_item)
            
            await session.flush()
            print("Receipt and items saved to database")
            
            # Update user portrait based on all receipts
            await _update_user_portrait(session, wallet_address)
            
            # Create command reply message with JSON result
            command_reply_json = {
                "command": command_name,
                "content": receipt_data,
            }
            command_reply_content = json.dumps(command_reply_json, indent=2, ensure_ascii=False)
            command_reply = Message(
                conversation_id=conversation.id,
                role="command_reply",
                content=command_reply_content,
            )
            session.add(command_reply)
            await session.commit()
            print("Command reply message created")
        except HTTPException:
            print("Error processing receipt")
            await session.rollback()
            raise
        except Exception as exc:
            print(f"Error processing receipt: {exc}")
            await session.rollback()
            # Re-fetch conversation after rollback to ensure it exists
            conversation = await _get_or_create_conversation(session, wallet_address)
            error_reply = Message(
                conversation_id=conversation.id,
                role="command_reply",
                content=f"Error processing receipt: {str(exc)}",
            )
            session.add(error_reply)
            await session.commit()
            print("Error reply message created")
    else:
        print("Regular chat flow")
        # Regular chat flow
        history_messages = await _list_messages(session, conversation.id, limit=25)
        # Filter out command messages from history for regular chat
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in history_messages
            if msg.role not in ("command", "command_reply")
        ]
        
        assistant_reply = await _call_openai(chat_history)
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_reply,
        )
        session.add(assistant_message)
        await session.commit()

    messages = await _list_messages(session, conversation.id, limit=500)

    return ChatResponse(
        walletAddress=conversation.wallet_address,
        messages=[
            MessageResource.model_validate(message, from_attributes=True)
            for message in messages
        ],
    )


@app.get("/api/conversations/{wallet_address}", response_model=ConversationResource)
async def fetch_conversation(wallet_address: str, session: SessionDep) -> ConversationResource:
    normalized = _normalize_wallet_address(wallet_address)
    conversation = await _get_conversation(session, normalized)
    if conversation is None:
        return ConversationResource(walletAddress=normalized, messages=[])

    messages = await _list_messages(session, conversation.id, limit=500)

    return ConversationResource(
        walletAddress=conversation.wallet_address,
        messages=[
            MessageResource.model_validate(message, from_attributes=True)
            for message in messages
        ],
    )


@app.delete("/api/conversations/{wallet_address}", response_model=ClearResponse)
async def clear_conversation(wallet_address: str, session: SessionDep) -> ClearResponse:
    normalized = _normalize_wallet_address(wallet_address)
    conversation = await _get_conversation(session, normalized)
    if conversation:
        await session.delete(conversation)
        await session.commit()
    return ClearResponse(walletAddress=normalized, cleared=True)


class ReceiptResource(BaseModel):
    id: UUID
    wallet_address: str = Field(alias="walletAddress")
    source_image_url: str = Field(alias="sourceImageUrl")
    receipt_data: dict = Field(alias="receiptData")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ReceiptsResponse(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    receipts: List[ReceiptResource]
    stats: dict


def _categorize_receipt(receipt_data: dict) -> str:
    """Categorize receipt based on store name and items."""
    store_name = (receipt_data.get("store", {}).get("name") or 
                  receipt_data.get("store", {}).get("company") or "").lower()
    items = receipt_data.get("invoice", {}).get("items", [])
    
    # Category keywords
    food_keywords = ["restaurant", "cafe", "food", "bakery", "pizza", "burger", "chicken", "meal", "dining"]
    grocery_keywords = ["supermarket", "grocery", "mart", "store", "market", "fresh", "food products"]
    retail_keywords = ["clothing", "fashion", "apparel", "shoes", "retail", "shop"]
    health_keywords = ["pharmacy", "drug", "medical", "health", "clinic", "hospital"]
    gas_keywords = ["petrol", "gas", "fuel", "station", "shell", "petronas"]
    entertainment_keywords = ["cinema", "movie", "theater", "entertainment", "game"]
    
    # Check store name
    if any(keyword in store_name for keyword in food_keywords):
        return "Food & Dining"
    if any(keyword in store_name for keyword in grocery_keywords):
        return "Groceries"
    if any(keyword in store_name for keyword in retail_keywords):
        return "Shopping"
    if any(keyword in store_name for keyword in health_keywords):
        return "Health & Pharmacy"
    if any(keyword in store_name for keyword in gas_keywords):
        return "Transportation"
    if any(keyword in store_name for keyword in entertainment_keywords):
        return "Entertainment"
    
    # Check items
    item_descriptions = " ".join([item.get("description", "").lower() for item in items])
    if any(keyword in item_descriptions for keyword in food_keywords):
        return "Food & Dining"
    if any(keyword in item_descriptions for keyword in grocery_keywords):
        return "Groceries"
    
    return "Other"


def _generate_savings_insights(monthly_data: dict, category_totals: dict) -> List[dict]:
    """Generate savings insights based on spending patterns."""
    insights = []
    
    # Find highest spending category
    if category_totals:
        highest_category = max(category_totals.items(), key=lambda x: x[1])
        if highest_category[1] > 0:
            insights.append({
                "type": "highest_spending",
                "category": highest_category[0],
                "amount": highest_category[1],
                "message": f"You spend the most on {highest_category[0]} ({highest_category[1]:.2f}). Consider setting a monthly budget for this category.",
            })
    
    # Check for frequent small purchases
    if monthly_data:
        for month, data in monthly_data.items():
            if data.get("transaction_count", 0) > 20:
                insights.append({
                    "type": "frequent_purchases",
                    "month": month,
                    "count": data.get("transaction_count", 0),
                    "message": f"In {month}, you made {data.get('transaction_count', 0)} transactions. Consider consolidating purchases to reduce transaction fees and impulse buying.",
                })
                break
    
    # Compare months
    if len(monthly_data) >= 2:
        months = sorted(monthly_data.keys())
        if len(months) >= 2:
            prev_month = monthly_data[months[-2]].get("total", 0)
            curr_month = monthly_data[months[-1]].get("total", 0)
            if curr_month > prev_month * 1.2:  # 20% increase
                insights.append({
                    "type": "spending_increase",
                    "message": f"Your spending increased by {((curr_month - prev_month) / prev_month * 100):.1f}% compared to last month. Review your recent purchases to identify areas to cut back.",
                })
    
    # Category-specific tips
    if "Food & Dining" in category_totals and category_totals["Food & Dining"] > 500:
        insights.append({
            "type": "dining_tip",
            "message": "You're spending significantly on dining out. Consider meal prepping or cooking at home more often to save money.",
        })
    
    if "Groceries" in category_totals:
        insights.append({
            "type": "grocery_tip",
            "message": "Look for bulk purchase discounts and compare prices across stores. Consider buying generic brands for non-essential items.",
        })
    
    if not insights:
        insights.append({
            "type": "general",
            "message": "Track your spending regularly and set monthly budgets for each category to better manage your finances.",
        })
    
    return insights


@app.get("/api/receipts/{wallet_address}", response_model=ReceiptsResponse)
async def get_receipts(wallet_address: str, session: SessionDep) -> ReceiptsResponse:
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = select(Receipt).where(Receipt.wallet_address == normalized).order_by(Receipt.created_at.desc())
    result = await session.execute(stmt)
    receipts = result.scalars().all()
    
    # Calculate stats
    total_receipts = len(receipts)
    total_amount = 0.0
    currency_counts: dict[str, int] = {}
    store_counts: dict[str, int] = {}
    
    for receipt in receipts:
        receipt_data = receipt.receipt_data
        if receipt_data.get("invoice", {}).get("summary", {}).get("total"):
            total_amount += float(receipt_data["invoice"]["summary"]["total"])
        
        currency = receipt_data.get("meta", {}).get("currency", "Unknown")
        currency_counts[currency] = currency_counts.get(currency, 0) + 1
        
        store_name = receipt_data.get("store", {}).get("name") or receipt_data.get("store", {}).get("company") or "Unknown"
        store_counts[store_name] = store_counts.get(store_name, 0) + 1
    
    stats = {
        "total_receipts": total_receipts,
        "total_amount": round(total_amount, 2),
        "currency_counts": currency_counts,
        "store_counts": store_counts,
        "average_amount": round(total_amount / total_receipts, 2) if total_receipts > 0 else 0.0,
    }
    
    return ReceiptsResponse(
        walletAddress=normalized,
        receipts=[
            ReceiptResource.model_validate(receipt, from_attributes=True)
            for receipt in receipts
        ],
        stats=stats,
    )


class MonthlySpendingResponse(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    monthly_data: dict
    category_totals: dict
    savings_insights: List[dict]


class SubCategoryResource(BaseModel):
    id: str
    name: str
    display_order: int

    model_config = ConfigDict(from_attributes=True)


class CategoryResource(BaseModel):
    id: str
    name: str
    display_order: int
    subcategories: List[SubCategoryResource]

    model_config = ConfigDict(from_attributes=True)


class CategoriesResponse(BaseModel):
    categories: List[CategoryResource]


class ShareToEarnSettingsResource(BaseModel):
    wallet_address: str
    agreed: bool
    selected_categories: dict[str, bool]

    model_config = ConfigDict(from_attributes=True)


class ShareToEarnSettingsResponse(BaseModel):
    settings: ShareToEarnSettingsResource


class UpdateShareToEarnRequest(BaseModel):
    agreed: bool | None = None
    selected_categories: dict[str, bool] | None = None


class CampaignAnalyzeRequest(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    query: str


class CampaignAnalyzeResponse(BaseModel):
    targetGroup: str
    userPortrait: dict
    couponDesign: dict
    targetPersonCount: int = Field(alias="targetPersonCount", default=0)
    targetWalletAddresses: List[str] = Field(alias="targetWalletAddresses", default_factory=list)


class CampaignCreateRequest(BaseModel):
    wallet_address: str = Field(alias="walletAddress")
    query: str
    budget: float
    targetGroup: str
    userPortrait: dict
    couponDesign: dict
    targetWalletAddresses: List[str] = Field(alias="targetWalletAddresses", default_factory=list)


class CampaignCreateResponse(BaseModel):
    jobId: str
    status: str


class CampaignResource(BaseModel):
    id: str
    query: str
    targetGroup: str
    budget: float
    status: str
    userCount: int = Field(alias="userCount")
    couponSent: int = Field(alias="couponSent")
    couponUsed: int = Field(alias="couponUsed", default=0)
    targetWalletAddresses: List[str] = Field(alias="targetWalletAddresses", default_factory=list)
    userPortrait: dict = Field(default_factory=dict, alias="userPortrait")
    couponDesign: dict = Field(default_factory=dict, alias="couponDesign")
    createdAt: datetime = Field(alias="createdAt")
    startedAt: datetime | None = Field(default=None, alias="startedAt")
    completedAt: datetime | None = Field(default=None, alias="completedAt")
    stoppedAt: datetime | None = Field(default=None, alias="stoppedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CampaignsResponse(BaseModel):
    campaigns: List[CampaignResource]


class CampaignActionRequest(BaseModel):
    action: str  # "start" or "stop"


class NotificationResource(BaseModel):
    id: str
    campaignId: str = Field(alias="campaign_id")
    targetUserAddress: str = Field(alias="target_user_address")
    title: str
    content: str
    voucherDetail: dict = Field(alias="voucher_detail")
    delivered: bool
    read: bool
    userAccepted: bool = Field(alias="user_accepted")
    createdAt: datetime = Field(alias="created_at")
    deliveredAt: datetime | None = Field(default=None, alias="delivered_at")
    readAt: datetime | None = Field(default=None, alias="read_at")
    acceptedAt: datetime | None = Field(default=None, alias="accepted_at")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class NotificationsResponse(BaseModel):
    notifications: List[NotificationResource]


class NotificationUpdateRequest(BaseModel):
    delivered: bool | None = None
    userAccepted: bool | None = None


class ModelResource(BaseModel):
    id: str
    name: str
    abbreviation: str  # 3-word short abbreviation
    description: str
    category: str
    rank: int
    usedTimes: int = Field(alias="usedTimes")
    rewardTokens: float = Field(alias="rewardTokens")
    version: str = "1.0.0"
    accuracy: float = 0.0
    parameters: int = 0
    createdAt: datetime = Field(alias="createdAt")
    updatedAt: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ModelsResponse(BaseModel):
    models: List[ModelResource]


class ModelCreateRequest(BaseModel):
    name: str
    abbreviation: str
    description: str
    category: str
    version: str = "1.0.0"
    accuracy: float = 0.0
    parameters: int = 0


class ModelCreateResponse(BaseModel):
    modelId: str = Field(alias="modelId")
    status: str = "created"

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


@app.get("/api/spending/{wallet_address}", response_model=MonthlySpendingResponse)
async def get_monthly_spending(wallet_address: str, session: SessionDep) -> MonthlySpendingResponse:
    normalized = _normalize_wallet_address(wallet_address)
    
    # Load receipts with items
    stmt = (
        select(Receipt)
        .options(selectinload(Receipt.items))
        .where(Receipt.wallet_address == normalized)
        .order_by(Receipt.created_at.desc())
    )
    result = await session.execute(stmt)
    receipts = result.scalars().all()
    
    # Group by month and category
    monthly_data: dict[str, dict] = {}
    category_totals: dict[str, float] = {}
    
    for receipt in receipts:
        receipt_data = receipt.receipt_data
        total = receipt_data.get("invoice", {}).get("summary", {}).get("total", 0.0)
        if not total:
            continue
        
        # Get month from receipt date or created_at
        receipt_date_str = receipt_data.get("invoice", {}).get("date")
        if receipt_date_str:
            try:
                receipt_date = datetime.strptime(receipt_date_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                receipt_date = receipt.created_at
        else:
            receipt_date = receipt.created_at
        
        month_key = receipt_date.strftime("%Y-%m")
        month_name = receipt_date.strftime("%B %Y")
        
        # Use category from receipt_items if available, otherwise fallback to old categorization
        category = None
        if receipt.items:
            # Group items by category and sum amounts
            category_amounts: dict[str, float] = {}
            for item in receipt.items:
                item_category = item.category or "Uncategorized"
                category_amounts[item_category] = category_amounts.get(item_category, 0.0) + float(item.amount)
            
            # Use the category with the highest amount for the receipt
            if category_amounts:
                category = max(category_amounts.items(), key=lambda x: x[1])[0]
        
        # Fallback to old categorization if no items or no category
        if not category:
            category = _categorize_receipt(receipt_data)
        
        # Update monthly data
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "month": month_name,
                "total": 0.0,
                "transaction_count": 0,
                "categories": {},
            }
        
        monthly_data[month_key]["total"] += float(total)
        monthly_data[month_key]["transaction_count"] += 1
        
        if category not in monthly_data[month_key]["categories"]:
            monthly_data[month_key]["categories"][category] = 0.0
        monthly_data[month_key]["categories"][category] += float(total)
        
        # Update category totals
        if category not in category_totals:
            category_totals[category] = 0.0
        category_totals[category] += float(total)
    
    # Round values
    for month_data in monthly_data.values():
        month_data["total"] = round(month_data["total"], 2)
        for cat in month_data["categories"]:
            month_data["categories"][cat] = round(month_data["categories"][cat], 2)
    
    category_totals = {k: round(v, 2) for k, v in category_totals.items()}
    
    # Generate savings insights
    savings_insights = _generate_savings_insights(monthly_data, category_totals)
    
    return MonthlySpendingResponse(
        walletAddress=normalized,
        monthly_data=monthly_data,
        category_totals=category_totals,
        savings_insights=savings_insights,
    )


@app.get("/api/categories", response_model=CategoriesResponse)
async def get_categories(session: SessionDep) -> CategoriesResponse:
    """Get all categories with their subcategories."""
    stmt = (
        select(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.display_order)
    )
    result = await session.execute(stmt)
    categories = result.scalars().all()
    
    return CategoriesResponse(
        categories=[
            CategoryResource(
                id=str(cat.id),
                name=cat.name,
                display_order=cat.display_order,
                subcategories=[
                    SubCategoryResource(
                        id=str(sub.id),
                        name=sub.name,
                        display_order=sub.display_order,
                    )
                    for sub in cat.subcategories
                ],
            )
            for cat in categories
        ]
    )


@app.get("/api/share-to-earn/{wallet_address}", response_model=ShareToEarnSettingsResponse)
async def get_share_to_earn_settings(wallet_address: str, session: SessionDep) -> ShareToEarnSettingsResponse:
    """Get share to earn settings for a wallet address."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = select(ShareToEarnSettings).where(ShareToEarnSettings.wallet_address == normalized)
    result = await session.execute(stmt)
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings if they don't exist
        settings = ShareToEarnSettings(
            wallet_address=normalized,
            agreed=False,
            selected_categories={},
        )
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    
    return ShareToEarnSettingsResponse(
        settings=ShareToEarnSettingsResource(
            wallet_address=settings.wallet_address,
            agreed=settings.agreed,
            selected_categories=settings.selected_categories or {},
        )
    )


@app.put("/api/share-to-earn/{wallet_address}", response_model=ShareToEarnSettingsResponse)
async def update_share_to_earn_settings(
    wallet_address: str,
    payload: UpdateShareToEarnRequest,
    session: SessionDep,
) -> ShareToEarnSettingsResponse:
    """Update share to earn settings for a wallet address."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = select(ShareToEarnSettings).where(ShareToEarnSettings.wallet_address == normalized)
    result = await session.execute(stmt)
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = ShareToEarnSettings(
            wallet_address=normalized,
            agreed=payload.agreed or False,
            selected_categories=payload.selected_categories or {},
        )
        session.add(settings)
    else:
        if payload.agreed is not None:
            settings.agreed = payload.agreed
        if payload.selected_categories is not None:
            settings.selected_categories = payload.selected_categories
        settings.updated_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(settings)
    
    return ShareToEarnSettingsResponse(
        settings=ShareToEarnSettingsResource(
            wallet_address=settings.wallet_address,
            agreed=settings.agreed,
            selected_categories=settings.selected_categories or {},
        )
    )


class InterestResource(BaseModel):
    name: str
    model: str

    model_config = ConfigDict(from_attributes=True)


class UserPortraitResource(BaseModel):
    wallet_address: str
    interests: List[InterestResource]
    estimated_age: int | None
    purchase_behaviors: dict
    description: str | None

    model_config = ConfigDict(from_attributes=True)


class UserPortraitResponse(BaseModel):
    portrait: UserPortraitResource | None


@app.get("/api/user-portrait/{wallet_address}", response_model=UserPortraitResponse)
async def get_user_portrait(wallet_address: str, session: SessionDep) -> UserPortraitResponse:
    """Get user portrait for a wallet address."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = select(UserPortrait).where(UserPortrait.wallet_address == normalized)
    result = await session.execute(stmt)
    portrait = result.scalar_one_or_none()
    
    if not portrait:
        return UserPortraitResponse(portrait=None)
    
    # Convert interests to InterestResource format
    # Handle both old format (list of strings) and new format (list of dicts)
    interests_data = portrait.interests or []
    interests_list = []
    for interest in interests_data:
        if isinstance(interest, str):
            # Old format: just a string, default to Customer Segmentation Model
            interests_list.append(InterestResource(name=interest, model="Customer Segmentation Model"))
        elif isinstance(interest, dict):
            # New format: dict with name and model
            interests_list.append(InterestResource(**interest))
        else:
            # Fallback
            interests_list.append(InterestResource(name=str(interest), model="Customer Segmentation Model"))
    
    return UserPortraitResponse(
        portrait=UserPortraitResource(
            wallet_address=portrait.wallet_address,
            interests=interests_list,
            estimated_age=portrait.estimated_age,
            purchase_behaviors=portrait.purchase_behaviors or {},
            description=portrait.description,
        )
    )


@app.post("/api/campaign/analyze", response_model=CampaignAnalyzeResponse)
async def analyze_campaign(
    payload: CampaignAnalyzeRequest,
    session: SessionDep,
) -> CampaignAnalyzeResponse:
    """Analyze campaign request using OpenAI and return structured response with matching users from receipts."""
    # Note: wallet_address in payload is for tracking who created the campaign, not for filtering receipts
    
    print(f"[CAMPAIGN_ANALYZE] Starting analysis for query: {payload.query}")
    print(f"[CAMPAIGN_ANALYZE] Request from wallet: {payload.wallet_address}")
    
    # Step 1: Use OpenAI to extract search criteria and analyze campaign
    campaign_prompt = """You are an expert marketing AI assistant. Analyze the campaign request and extract search criteria, then provide a structured response in JSON format.

The response must be valid JSON with this exact structure:
{
  "targetGroup": "A concise description of the target customer group (e.g., 'Coffee Enthusiasts (Ages 25-45)')",
  "userPortrait": {
    "demographics": "Detailed demographics description",
    "interests": ["Interest1", "Interest2", "Interest3", "Interest4"],
    "behavior": "Behavioral patterns and characteristics"
  },
  "couponDesign": {
    "description": "This voucher can be redeemed after you upload the related receipts for the detailed items mentioned in this voucher. Upon verification, you will receive SYM tokens as a reward.",
    "imagePrompt": "A detailed prompt for generating a coupon image using DALL-E (describe the visual design, colors, text, style)"
  },
  "searchCriteria": {
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "storeNames": ["store name 1", "store name 2"],
    "categories": ["category1", "category2"],
    "itemDescriptions": ["item description 1", "item description 2"]
  }
}

The searchCriteria should help identify users from their receipt data. Extract relevant keywords, store names, product categories, and item descriptions from the campaign query.
Make sure the coupon design is attractive and relevant to the target audience. The imagePrompt should be detailed enough for image generation."""

    try:
        # Call OpenAI with structured output
        completion = await openai_client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.7,
            messages=[
                {"role": "system", "content": campaign_prompt},
                {"role": "user", "content": f"Campaign request: {payload.query}"},
            ],
            response_format={"type": "json_object"},
        )
        
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")
        
        # Parse JSON response
        analysis_data = json.loads(content)
        search_criteria = analysis_data.get("searchCriteria", {})
        
        print(f"[CAMPAIGN_ANALYZE] OpenAI analysis complete")
        print(f"[CAMPAIGN_ANALYZE] Target Group: {analysis_data.get('targetGroup', 'N/A')}")
        print(f"[CAMPAIGN_ANALYZE] Search Criteria extracted:")
        print(f"  - Keywords: {search_criteria.get('keywords', [])}")
        print(f"  - Store Names: {search_criteria.get('storeNames', [])}")
        print(f"  - Categories: {search_criteria.get('categories', [])}")
        print(f"  - Item Descriptions: {search_criteria.get('itemDescriptions', [])}")
        print(f"[CAMPAIGN_ANALYZE] Coupon Design:")
        coupon_design_data = analysis_data.get("couponDesign", {})
        print(f"  - Description: {coupon_design_data.get('description', 'N/A')}")
        print(f"  - Image Prompt: {coupon_design_data.get('imagePrompt', 'N/A')}")
        
        # Step 2: Query receipts to find matching users
        matching_wallet_addresses = set()
        
        # Get all receipts
        print(f"[CAMPAIGN_ANALYZE] Querying all receipts from database...")
        stmt = select(Receipt).options(selectinload(Receipt.items))
        result = await session.execute(stmt)
        all_receipts = result.scalars().all()
        print(f"[CAMPAIGN_ANALYZE] Found {len(all_receipts)} total receipts in database")
        
        keywords = [kw.lower() for kw in search_criteria.get("keywords", [])]
        store_names = [sn.lower() for sn in search_criteria.get("storeNames", [])]
        categories = [cat.lower() for cat in search_criteria.get("categories", [])]
        item_descriptions = [desc.lower() for desc in search_criteria.get("itemDescriptions", [])]
        
        print(f"[CAMPAIGN_ANALYZE] Normalized search criteria:")
        print(f"  - Keywords (lowercase): {keywords}")
        print(f"  - Store Names (lowercase): {store_names}")
        print(f"  - Categories (lowercase): {categories}")
        print(f"  - Item Descriptions (lowercase): {item_descriptions}")
        
        matched_receipts_log = []
        total_checked = 0
        
        for receipt in all_receipts:
            total_checked += 1
            receipt_data = receipt.receipt_data
            receipt_text = json.dumps(receipt_data).lower()
            
            # Check store name
            store_name = (receipt_data.get("store", {}).get("name") or 
                         receipt_data.get("store", {}).get("company") or "").lower()
            
            # Check items
            items = receipt_data.get("invoice", {}).get("items", [])
            receipt_items = receipt.items if receipt.items else []
            
            # Match criteria
            matched = False
            match_reasons = []
            
            # Check keywords in receipt text
            if keywords:
                for keyword in keywords:
                    if keyword in receipt_text:
                        matched = True
                        match_reasons.append(f"keyword '{keyword}' found in receipt text")
                        break
            
            # Check store names
            if store_names and not matched:
                for store_name_pattern in store_names:
                    if store_name_pattern in store_name:
                        matched = True
                        match_reasons.append(f"store name '{store_name_pattern}' matches '{store_name}'")
                        break
            
            # Check categories
            if categories and not matched:
                for item in receipt_items:
                    item_category = (item.category or "").lower()
                    item_subcategory = (item.sub_category or "").lower()
                    for cat in categories:
                        if cat in item_category or cat in item_subcategory:
                            matched = True
                            match_reasons.append(f"category '{cat}' matches item category '{item_category}' or subcategory '{item_subcategory}'")
                            break
                    if matched:
                        break
                
                # Also check receipt data items
                if not matched:
                    for item in items:
                        item_desc = json.dumps(item).lower()
                        for cat in categories:
                            if cat in item_desc:
                                matched = True
                                match_reasons.append(f"category '{cat}' found in receipt item data")
                                break
                        if matched:
                            break
            
            # Check item descriptions
            if item_descriptions and not matched:
                for item in receipt_items:
                    item_desc = (item.description or "").lower()
                    for desc_pattern in item_descriptions:
                        if desc_pattern in item_desc:
                            matched = True
                            match_reasons.append(f"item description '{desc_pattern}' matches '{item_desc}'")
                            break
                    if matched:
                        break
                
                # Also check receipt data items
                if not matched:
                    for item in items:
                        item_desc = json.dumps(item).lower()
                        for desc_pattern in item_descriptions:
                            if desc_pattern in item_desc:
                                matched = True
                                match_reasons.append(f"item description '{desc_pattern}' found in receipt item data")
                                break
                        if matched:
                            break
            
            if matched:
                matching_wallet_addresses.add(receipt.wallet_address)
                matched_receipts_log.append({
                    "wallet_address": receipt.wallet_address,
                    "receipt_id": str(receipt.id),
                    "store_name": store_name,
                    "match_reasons": match_reasons,
                    "item_count": len(receipt_items),
                    "receipt_data_items_count": len(items)
                })
        
        print(f"[CAMPAIGN_ANALYZE] Matching process complete:")
        print(f"  - Total receipts checked: {total_checked}")
        print(f"  - Matching receipts found: {len(matched_receipts_log)}")
        print(f"  - Unique wallet addresses matched: {len(matching_wallet_addresses)}")
        
        if matched_receipts_log:
            print(f"[CAMPAIGN_ANALYZE] Matched receipts details:")
            for i, match_info in enumerate(matched_receipts_log[:10], 1):  # Log first 10 matches
                print(f"  Match {i}:")
                print(f"    - Wallet: {match_info['wallet_address']}")
                print(f"    - Receipt ID: {match_info['receipt_id']}")
                print(f"    - Store: {match_info['store_name']}")
                print(f"    - Reasons: {', '.join(match_info['match_reasons'])}")
                print(f"    - Items: {match_info['item_count']} (DB) / {match_info['receipt_data_items_count']} (JSON)")
            if len(matched_receipts_log) > 10:
                print(f"  ... and {len(matched_receipts_log) - 10} more matches")
        else:
            print(f"[CAMPAIGN_ANALYZE] WARNING: No receipts matched the search criteria!")
            print(f"[CAMPAIGN_ANALYZE] This might indicate:")
            print(f"  - No receipts in database")
            print(f"  - Search criteria too specific")
            print(f"  - Receipt data format doesn't match expected structure")
        
        # Step 3: Generate coupon image using DALL-E if imagePrompt is provided
        image_url = None
        coupon_design = analysis_data.get("couponDesign", {})
        
        if analysis_data.get("couponDesign", {}).get("imagePrompt"):
            try:
                print(f"[CAMPAIGN_ANALYZE] Generating image with DALL-E...")
                image_response = await openai_client.images.generate(
                    model="dall-e-3",
                    prompt=analysis_data["couponDesign"]["imagePrompt"],
                    size="1024x1024",
                    quality="standard",
                    n=1,
                )
                dall_e_url = image_response.data[0].url
                print(f"[CAMPAIGN_ANALYZE] Generated image from DALL-E: {dall_e_url}")
                print(f"[CAMPAIGN_ANALYZE] Returning DALL-E URL to admin-app for Pinata upload")
                
                # Return DALL-E URL directly - admin-app will handle Pinata upload
                image_url = dall_e_url
                coupon_design["imageUrl"] = dall_e_url
                    
            except Exception as img_error:
                import traceback
                print(f"[CAMPAIGN_ANALYZE] ✗ Error generating image: {img_error}")
                print(f"[CAMPAIGN_ANALYZE] Traceback: {traceback.format_exc()}")
                # Continue without image if generation fails
                coupon_design["imageUrl"] = None
        else:
            print(f"[CAMPAIGN_ANALYZE] No imagePrompt provided, skipping image generation")
            # Ensure imageUrl is set even if no imagePrompt
            if "imageUrl" not in coupon_design:
                coupon_design["imageUrl"] = None
        
        # Ensure imageUrl is set in coupon_design (even if None)
        if "imageUrl" not in coupon_design:
            coupon_design["imageUrl"] = image_url
        
        # Log final imageUrl status for debugging
        final_image_url = coupon_design.get("imageUrl")
        if final_image_url:
            print(f"[CAMPAIGN_ANALYZE] Final image URL: {final_image_url}")
        else:
            print(f"[CAMPAIGN_ANALYZE] ✗ No image URL available - imageUrl is None")
        
        final_count = len(matching_wallet_addresses)
        final_addresses = list(matching_wallet_addresses)
        
        print(f"[CAMPAIGN_ANALYZE] Final response:")
        print(f"  - Target Person Count: {final_count}")
        print(f"  - Target Wallet Addresses: {final_addresses[:5]}{'...' if len(final_addresses) > 5 else ''}")
        print(f"  - Coupon Design Image URL: {coupon_design.get('imageUrl', 'None')}")
        print(f"[CAMPAIGN_ANALYZE] Analysis complete successfully")
        
        return CampaignAnalyzeResponse(
            targetGroup=analysis_data.get("targetGroup", "Target Group"),
            userPortrait=analysis_data.get("userPortrait", {
                "demographics": "",
                "interests": [],
                "behavior": ""
            }),
            couponDesign=coupon_design,
            targetPersonCount=final_count,
            targetWalletAddresses=final_addresses
        )
    except OpenAIError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI request failed: {exc}",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse AI response: {exc}",
        ) from exc


class RegenerateImageRequest(BaseModel):
    imagePrompt: str


class RegenerateImageResponse(BaseModel):
    imageUrl: str


@app.post("/api/campaign/regenerate-image", response_model=RegenerateImageResponse)
async def regenerate_image(
    payload: RegenerateImageRequest,
) -> RegenerateImageResponse:
    """Regenerate a voucher image using DALL-E."""
    try:
        print(f"[REGENERATE_IMAGE] Regenerating image with prompt: {payload.imagePrompt[:100]}...")
        image_response = await openai_client.images.generate(
            model="dall-e-3",
            prompt=payload.imagePrompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        dall_e_url = image_response.data[0].url
        print(f"[REGENERATE_IMAGE] Generated new image from DALL-E: {dall_e_url}")
        
        return RegenerateImageResponse(imageUrl=dall_e_url)
    except Exception as img_error:
        import traceback
        print(f"[REGENERATE_IMAGE] ✗ Error generating image: {img_error}")
        print(f"[REGENERATE_IMAGE] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate image: {img_error}",
        )


@app.post("/api/campaign/create", response_model=CampaignCreateResponse)
async def create_campaign(
    payload: CampaignCreateRequest,
    session: SessionDep,
) -> CampaignCreateResponse:
    """Create a new campaign job."""
    normalized = _normalize_wallet_address(payload.wallet_address)
    
    # Normalize target wallet addresses
    target_addresses = [_normalize_wallet_address(addr) for addr in payload.targetWalletAddresses]
    
    print(f"[CAMPAIGN_CREATE] Creating campaign:")
    print(f"  - Creator wallet: {normalized}")
    print(f"  - Query: {payload.query}")
    print(f"  - Budget: {payload.budget}")
    print(f"  - Target Group: {payload.targetGroup}")
    print(f"  - User Portrait: {payload.userPortrait}")
    print(f"  - Coupon Design: {payload.couponDesign}")
    print(f"  - Target wallet addresses: {len(target_addresses)} addresses")
    if target_addresses:
        print(f"  - Target addresses (first 5): {target_addresses[:5]}{'...' if len(target_addresses) > 5 else ''}")
    
    campaign = Campaign(
        wallet_address=normalized,
        query=payload.query,
        budget=payload.budget,
        target_group=payload.targetGroup,
        user_portrait=payload.userPortrait,
        coupon_design=payload.couponDesign,
        target_wallet_addresses=target_addresses,
        status="pending",
        user_count=len(target_addresses),  # Set initial user count
    )
    
    session.add(campaign)
    await session.commit()
    await session.refresh(campaign)
    
    print(f"[CAMPAIGN_CREATE] Campaign created successfully:")
    print(f"  - Campaign ID: {campaign.id}")
    print(f"  - Status: {campaign.status}")
    print(f"  - Target users: {campaign.user_count}")
    print(f"  - Saved wallet addresses: {len(campaign.target_wallet_addresses)}")
    print(f"  - User Portrait saved: {campaign.user_portrait}")
    print(f"  - Coupon Design saved: {campaign.coupon_design}")
    print(f"  - Coupon Image URL: {campaign.coupon_design.get('imageUrl', 'None') if campaign.coupon_design else 'None'}")
    
    return CampaignCreateResponse(
        jobId=str(campaign.id),
        status=campaign.status
    )


@app.get("/api/campaigns/detail/{job_id}", response_model=CampaignResource)
async def get_campaign_detail(
    job_id: str,
    session: SessionDep,
) -> CampaignResource:
    """Get specific campaign details by ID."""
    try:
        campaign_uuid = UUID(job_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid campaign ID format",
        )
    
    stmt = select(Campaign).where(Campaign.id == campaign_uuid)
    result = await session.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
        
    return CampaignResource(
        id=str(campaign.id),
        query=campaign.query,
        targetGroup=campaign.target_group,
        budget=campaign.budget,
        status=campaign.status,
        userCount=campaign.user_count,
        couponSent=campaign.coupon_sent,
        couponUsed=campaign.coupon_used,
        targetWalletAddresses=campaign.target_wallet_addresses or [],
        userPortrait=campaign.user_portrait or {},
        couponDesign=campaign.coupon_design or {},
        createdAt=campaign.created_at,
        startedAt=campaign.started_at,
        completedAt=campaign.completed_at,
        stoppedAt=campaign.stopped_at,
    )


@app.get("/api/campaigns/{wallet_address}", response_model=CampaignsResponse)
async def get_campaigns(
    wallet_address: str,
    session: SessionDep,
) -> CampaignsResponse:
    """Get all campaigns for a wallet address."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = (
        select(Campaign)
        .where(Campaign.wallet_address == normalized)
        .order_by(Campaign.created_at.desc())
    )
    result = await session.execute(stmt)
    campaigns = result.scalars().all()
    
    return CampaignsResponse(
        campaigns=[
            CampaignResource(
                id=str(campaign.id),
                query=campaign.query,
                targetGroup=campaign.target_group,
                budget=campaign.budget,
                status=campaign.status,
                userCount=campaign.user_count,
                couponSent=campaign.coupon_sent,
                couponUsed=campaign.coupon_used,
                targetWalletAddresses=campaign.target_wallet_addresses or [],
                userPortrait=campaign.user_portrait or {},
                couponDesign=campaign.coupon_design or {},
                createdAt=campaign.created_at,
                startedAt=campaign.started_at,
                completedAt=campaign.completed_at,
                stoppedAt=campaign.stopped_at,
            )
            for campaign in campaigns
        ]
    )


@app.post("/api/campaigns/{campaign_id}/action", response_model=CampaignCreateResponse)
async def campaign_action(
    campaign_id: str,
    payload: CampaignActionRequest,
    session: SessionDep,
) -> CampaignCreateResponse:
    """Start or stop a campaign."""
    try:
        campaign_uuid = UUID(campaign_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid campaign ID format",
        )
    
    stmt = select(Campaign).where(Campaign.id == campaign_uuid)
    result = await session.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    
    action = payload.action.lower()
    
    if action == "start":
        # Check if campaign can be started
        if campaign.status == "stopped":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start a stopped campaign",
            )
        
        if campaign.status == "running":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign is already running",
            )
        
        # Start the campaign
        campaign.status = "running"
        if not campaign.started_at:
            campaign.started_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        
        # Create notifications for all target users
        target_count = len(campaign.target_wallet_addresses) if campaign.target_wallet_addresses else 0
        campaign.coupon_sent = target_count
        
        print(f"[CAMPAIGN_ACTION] Starting campaign {campaign_id}")
        print(f"  - Target users: {target_count}")
        print(f"  - Budget: ${campaign.budget}")
        print(f"  - Coupons sent: {campaign.coupon_sent}")
        
        # Create notifications for each target user
        if campaign.target_wallet_addresses:
            notifications = []
            # Calculate amount per user (45% of budget)
            budget_for_user_rate = 0.45
            amount_per_user = 0
            if len(campaign.target_wallet_addresses) > 0:
                amount_per_user = (campaign.budget * budget_for_user_rate) / len(campaign.target_wallet_addresses)

            for target_address in campaign.target_wallet_addresses:
                normalized_target = _normalize_wallet_address(target_address)
                # Generate notification title and content based on campaign
                notification_title = f"Special Offer: {campaign.target_group}"
                notification_content = f"You've received a special coupon! {campaign.coupon_design.get('description', 'Check out this exclusive offer.')}"
                
                # Add amount to voucher detail
                voucher_detail = campaign.coupon_design.copy()
                voucher_detail['tokenAmount'] = amount_per_user

                notification = Notification(
                    campaign_id=campaign.id,
                    target_user_address=normalized_target,
                    title=notification_title,
                    content=notification_content,
                    voucher_detail=voucher_detail,
                    delivered=False,
                    user_accepted=False,
                )
                notifications.append(notification)
            
            session.add_all(notifications)
            print(f"[CAMPAIGN_ACTION] Created {len(notifications)} notifications for target users")
        
        await session.commit()
        await session.refresh(campaign)
        
        print(f"[CAMPAIGN_ACTION] Campaign {campaign_id} started successfully")
        
    elif action == "stop":
        # Check if campaign can be stopped
        if campaign.status == "stopped":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign is already stopped",
            )
        
        if campaign.status not in ("running", "pending"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot stop a campaign with status: {campaign.status}",
            )
        
        # Stop the campaign
        campaign.status = "stopped"
        campaign.stopped_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        
        print(f"[CAMPAIGN_ACTION] Stopping campaign {campaign_id}")
        print(f"  - Coupons sent: {campaign.coupon_sent}")
        print(f"  - Coupons used: {campaign.coupon_used}")
        
        await session.commit()
        await session.refresh(campaign)
        
        print(f"[CAMPAIGN_ACTION] Campaign {campaign_id} stopped successfully")
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {action}. Must be 'start' or 'stop'",
        )
    
    return CampaignCreateResponse(
        jobId=str(campaign.id),
        status=campaign.status
    )


@app.get("/api/notifications/{wallet_address}", response_model=NotificationsResponse)
async def get_notifications(
    wallet_address: str,
    session: SessionDep,
) -> NotificationsResponse:
    """Get all notifications for a user."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = (
        select(Notification)
        .where(Notification.target_user_address == normalized)
        .order_by(Notification.created_at.desc())
    )
    result = await session.execute(stmt)
    notifications = result.scalars().all()
    
    return NotificationsResponse(
        notifications=[
            NotificationResource(
                id=str(notif.id),
                campaignId=str(notif.campaign_id),
                targetUserAddress=notif.target_user_address,
                title=notif.title,
                content=notif.content,
                voucherDetail=notif.voucher_detail,
                delivered=notif.delivered,
                read=notif.read,
                userAccepted=notif.user_accepted,
                createdAt=notif.created_at,
                deliveredAt=notif.delivered_at,
                readAt=notif.read_at,
                acceptedAt=notif.accepted_at,
            )
            for notif in notifications
        ]
    )


@app.put("/api/notifications/{notification_id}/deliver", response_model=NotificationResource)
async def mark_notification_delivered(
    notification_id: str,
    session: SessionDep,
) -> NotificationResource:
    """Mark a notification as delivered (user clicked/viewed)."""
    try:
        notif_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )
    
    stmt = select(Notification).where(Notification.id == notif_uuid)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    if not notification.delivered:
        notification.delivered = True
        notification.delivered_at = datetime.utcnow()
        await session.commit()
        await session.refresh(notification)
    
    return NotificationResource(
        id=str(notification.id),
        campaignId=str(notification.campaign_id),
        targetUserAddress=notification.target_user_address,
        title=notification.title,
        content=notification.content,
        voucherDetail=notification.voucher_detail,
        delivered=notification.delivered,
        read=notification.read,
        userAccepted=notification.user_accepted,
        createdAt=notification.created_at,
        deliveredAt=notification.delivered_at,
        readAt=notification.read_at,
        acceptedAt=notification.accepted_at,
    )


@app.put("/api/notifications/{notification_id}/accept", response_model=NotificationResource)
async def mark_notification_accepted(
    notification_id: str,
    session: SessionDep,
) -> NotificationResource:
    """Mark a notification as accepted (user accepted/claimed the coupon) and create voucher."""
    try:
        notif_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )
    
    stmt = select(Notification).where(Notification.id == notif_uuid)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    if not notification.user_accepted:
        notification.user_accepted = True
        notification.accepted_at = datetime.utcnow()
        
        # Fetch campaign to generate condition
        campaign_stmt = select(Campaign).where(Campaign.id == notification.campaign_id)
        campaign_result = await session.execute(campaign_stmt)
        campaign = campaign_result.scalar_one_or_none()
        
        # Generate AI-readable condition for receipt validation
        condition = None
        if campaign:
            target_group = campaign.target_group or "general purchases"
            description = notification.voucher_detail.get('description', '')
            condition = f"Valid for {target_group}. {description}".strip()
        
        # Create voucher in user_vouchers table
        voucher = UserVoucher(
            wallet_address=notification.target_user_address,
            notification_id=notification.id,
            campaign_id=notification.campaign_id,
            voucher_detail=notification.voucher_detail,
            condition=condition,
            status="wait_to_user",
            accepted_at=datetime.utcnow(),
        )
        session.add(voucher)
        
        # Update campaign coupon_used count
        campaign_stmt = select(Campaign).where(Campaign.id == notification.campaign_id)
        campaign_result = await session.execute(campaign_stmt)
        campaign = campaign_result.scalar_one_or_none()
        if campaign:
            campaign.coupon_used = (campaign.coupon_used or 0) + 1
            campaign.updated_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(notification)
    
    return NotificationResource(
        id=str(notification.id),
        campaignId=str(notification.campaign_id),
        targetUserAddress=notification.target_user_address,
        title=notification.title,
        content=notification.content,
        voucherDetail=notification.voucher_detail,
        delivered=notification.delivered,
        read=notification.read,
        userAccepted=notification.user_accepted,
        createdAt=notification.created_at,
        deliveredAt=notification.delivered_at,
        readAt=notification.read_at,
        acceptedAt=notification.accepted_at,
    )


@app.put("/api/notifications/{notification_id}/decline", response_model=NotificationResource)
async def mark_notification_declined(
    notification_id: str,
    session: SessionDep,
) -> NotificationResource:
    """Mark a notification as declined (user declined the coupon)."""
    try:
        notif_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )
    
    stmt = select(Notification).where(Notification.id == notif_uuid)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    # Mark as delivered if not already
    if not notification.delivered:
        notification.delivered = True
        notification.delivered_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(notification)
    
    return NotificationResource(
        id=str(notification.id),
        campaignId=str(notification.campaign_id),
        targetUserAddress=notification.target_user_address,
        title=notification.title,
        content=notification.content,
        voucherDetail=notification.voucher_detail,
        delivered=notification.delivered,
        read=notification.read,
        userAccepted=notification.user_accepted,
        createdAt=notification.created_at,
        deliveredAt=notification.delivered_at,
        readAt=notification.read_at,
        acceptedAt=notification.accepted_at,
    )


@app.put("/api/notifications/{notification_id}/read", response_model=NotificationResource)
async def mark_notification_read(
    notification_id: str,
    session: SessionDep,
    read: bool = Query(default=True),
) -> NotificationResource:
    """Mark a notification as read or unread."""
    try:
        notif_uuid = UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID format",
        )
    
    stmt = select(Notification).where(Notification.id == notif_uuid)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    notification.read = read
    if read and not notification.read_at:
        notification.read_at = datetime.utcnow()
    elif not read:
        notification.read_at = None
    
    await session.commit()
    await session.refresh(notification)
    
    return NotificationResource(
        id=str(notification.id),
        campaignId=str(notification.campaign_id),
        targetUserAddress=notification.target_user_address,
        title=notification.title,
        content=notification.content,
        voucherDetail=notification.voucher_detail,
        delivered=notification.delivered,
        read=notification.read,
        userAccepted=notification.user_accepted,
        createdAt=notification.created_at,
        deliveredAt=notification.delivered_at,
        readAt=notification.read_at,
        acceptedAt=notification.accepted_at,
    )


class UserVoucherResource(BaseModel):
    id: str
    wallet_address: str
    notification_id: str
    campaign_id: str
    voucher_detail: dict
    condition: str | None = None
    status: str
    created_at: datetime
    accepted_at: datetime | None = None
    declined_at: datetime | None = None
    used_at: datetime | None = None
    expired_at: datetime | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class UserVouchersResponse(BaseModel):
    vouchers: List[UserVoucherResource]


@app.get("/api/user-vouchers/{wallet_address}", response_model=UserVouchersResponse)
async def get_user_vouchers(
    wallet_address: str,
    session: SessionDep,
) -> UserVouchersResponse:
    """Get all vouchers for a user."""
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = (
        select(UserVoucher)
        .where(UserVoucher.wallet_address == normalized)
        .order_by(UserVoucher.created_at.desc())
    )
    result = await session.execute(stmt)
    vouchers = result.scalars().all()
    
    return UserVouchersResponse(
        vouchers=[
            UserVoucherResource(
                id=str(voucher.id),
                wallet_address=voucher.wallet_address,
                notification_id=str(voucher.notification_id),
                campaign_id=str(voucher.campaign_id),
                voucher_detail=voucher.voucher_detail,
                status=voucher.status,
                created_at=voucher.created_at,
                accepted_at=voucher.accepted_at,
                declined_at=voucher.declined_at,
                used_at=voucher.used_at,
                expired_at=voucher.expired_at,
            )
            for voucher in vouchers
        ]
    )


@app.put("/api/campaigns/{campaign_id}/coupon-used", response_model=CampaignCreateResponse)
async def update_coupon_used(
    campaign_id: str,
    payload: dict,
    session: SessionDep,
) -> CampaignCreateResponse:
    """Update the number of coupons used for a campaign."""
    try:
        campaign_uuid = UUID(campaign_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid campaign ID format",
        )
    
    stmt = select(Campaign).where(Campaign.id == campaign_uuid)
    result = await session.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    
    coupon_used = payload.get("couponUsed", 0)
    if not isinstance(coupon_used, int) or coupon_used < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="couponUsed must be a non-negative integer",
        )
    
    campaign.coupon_used = coupon_used
    campaign.updated_at = datetime.utcnow()
    
    await session.commit()
    await session.refresh(campaign)
    
    print(f"[CAMPAIGN_UPDATE] Updated coupon_used for campaign {campaign_id}: {coupon_used}")
    
    return CampaignCreateResponse(
        jobId=str(campaign.id),
        status=campaign.status
    )


@app.delete("/api/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    session: SessionDep,
) -> dict:
    """Delete a campaign that hasn't delivered any coupons."""
    try:
        campaign_uuid = UUID(campaign_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid campaign ID format",
        )
    
    stmt = select(Campaign).where(Campaign.id == campaign_uuid)
    result = await session.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    
    # Only allow deletion if no coupons have been sent
    if campaign.coupon_sent > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete campaign: {campaign.coupon_sent} coupon(s) have already been sent. Only campaigns with no delivered coupons can be deleted.",
        )
    
    print(f"[CAMPAIGN_DELETE] Deleting campaign {campaign_id}")
    print(f"  - Campaign query: {campaign.query[:50]}...")
    print(f"  - Status: {campaign.status}")
    print(f"  - Coupons sent: {campaign.coupon_sent}")
    
    await session.delete(campaign)
    await session.commit()
    
    print(f"[CAMPAIGN_DELETE] Campaign {campaign_id} deleted successfully")
    
    return {
        "success": True,
        "message": "Campaign deleted successfully"
    }


@app.get("/api/models", response_model=ModelsResponse)
async def get_models(
    session: SessionDep,
    wallet_address: str | None = Query(None),
    category: str | None = Query(None),
) -> ModelsResponse:
    """Get all models, optionally filtered by wallet_address or category."""
    stmt = select(Model)
    
    if wallet_address:
        normalized = _normalize_wallet_address(wallet_address)
        stmt = stmt.where(Model.wallet_address == normalized)
    
    if category:
        stmt = stmt.where(Model.category == category)
    
    # Order by rank (descending), then by used_times (descending)
    stmt = stmt.order_by(Model.rank.desc(), Model.used_times.desc())
    
    result = await session.execute(stmt)
    models = result.scalars().all()
    
    return ModelsResponse(
        models=[
            ModelResource(
                id=str(model.id),
                name=model.name,
                abbreviation=model.abbreviation,
                description=model.description,
                category=model.category,
                rank=model.rank,
                usedTimes=model.used_times,
                rewardTokens=model.reward_tokens,
                version=model.version,
                accuracy=model.accuracy,
                parameters=model.parameters,
                createdAt=model.created_at,
                updatedAt=model.updated_at,
            )
            for model in models
        ]
    )


@app.get("/api/models/{model_id}", response_model=ModelResource)
async def get_model(
    model_id: str,
    session: SessionDep,
) -> ModelResource:
    """Get a specific model by ID."""
    try:
        model_uuid = UUID(model_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid model ID format",
        )
    
    stmt = select(Model).where(Model.id == model_uuid)
    result = await session.execute(stmt)
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )
    
    return ModelResource(
        id=str(model.id),
        name=model.name,
        abbreviation=model.abbreviation,
        description=model.description,
        category=model.category,
        rank=model.rank,
        usedTimes=model.used_times,
        rewardTokens=model.reward_tokens,
        version=model.version,
        accuracy=model.accuracy,
        parameters=model.parameters,
        createdAt=model.created_at,
        updatedAt=model.updated_at,
    )


@app.post("/api/models", response_model=ModelCreateResponse)
async def create_model(
    wallet_address: str,
    payload: ModelCreateRequest,
    session: SessionDep,
) -> ModelCreateResponse:
    """Create a new model."""
    normalized = _normalize_wallet_address(wallet_address)
    
    print(f"[MODEL_CREATE] Creating model:")
    print(f"  - Supplier wallet: {normalized}")
    print(f"  - Name: {payload.name}")
    print(f"  - Category: {payload.category}")
    print(f"  - Version: {payload.version}")
    
    # Calculate initial rank (will be updated based on usage)
    # For now, set to 0, will be calculated based on used_times later
    model = Model(
        wallet_address=normalized,
        name=payload.name,
        abbreviation=payload.abbreviation,
        description=payload.description,
        category=payload.category,
        version=payload.version,
        accuracy=payload.accuracy,
        parameters=payload.parameters,
        rank=0,  # Initial rank
        used_times=0,
        reward_tokens=0.0,
    )
    
    session.add(model)
    await session.commit()
    await session.refresh(model)
    
    print(f"[MODEL_CREATE] Model created successfully:")
    print(f"  - Model ID: {model.id}")
    
    return ModelCreateResponse(
        modelId=str(model.id),
        status="created"
    )


@app.delete("/api/models/{model_id}")
async def delete_model(
    model_id: str,
    session: SessionDep,
) -> dict:
    """Delete a model."""
    try:
        model_uuid = UUID(model_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid model ID format",
        )
    
    stmt = select(Model).where(Model.id == model_uuid)
    result = await session.execute(stmt)
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )
    
    print(f"[MODEL_DELETE] Deleting model {model_id}")
    print(f"  - Model name: {model.name}")
    print(f"  - Used times: {model.used_times}")
    print(f"  - Reward tokens: {model.reward_tokens}")
    
    await session.delete(model)
    await session.commit()
    
    print(f"[MODEL_DELETE] Model {model_id} deleted successfully")
    
    return {
        "success": True,
        "message": "Model deleted successfully"
    }


def main() -> None:
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
