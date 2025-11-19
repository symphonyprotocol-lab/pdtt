from __future__ import annotations
from datetime import datetime
from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel, Field, ConfigDict
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import ForeignKey, String, Text, JSON, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
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

    model_config = SettingsConfigDict(env_file=".env.local", env_file_encoding="utf-8")


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
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


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


def _load_ocr_prompt() -> str:
    """Load the OCR prompt template from file."""
    prompt_path = os.path.join(os.path.dirname(__file__), "test", "ocr_prompt.md")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        # Fallback prompt if file doesn't exist
        return """Extract receipt information into JSON format following this schema:
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
    "items": [],
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
Return only the final JSON."""


async def _process_receipt_ocr(image_url: str) -> dict:
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
        ocr_template = _load_ocr_prompt()
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
            receipt_data = await _process_receipt_ocr(payload.attachment_url)
            print(receipt_data)
            # Save receipt to database
            receipt = Receipt(
                wallet_address=wallet_address,
                source_image_url=payload.attachment_url,
                receipt_data=receipt_data,
            )
            session.add(receipt)
            await session.flush()
            print("Receipt saved to database")
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


@app.get("/api/spending/{wallet_address}", response_model=MonthlySpendingResponse)
async def get_monthly_spending(wallet_address: str, session: SessionDep) -> MonthlySpendingResponse:
    normalized = _normalize_wallet_address(wallet_address)
    
    stmt = select(Receipt).where(Receipt.wallet_address == normalized).order_by(Receipt.created_at.desc())
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
        
        # Categorize
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


def main() -> None:
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
