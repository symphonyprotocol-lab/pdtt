Input Json is:

=== Input JSON DATA ===

{{inputJson}}

=== Target JSON Schema ===

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
        "currency": "MYR"
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
    "socials": {
      "facebook": "",
      "instagram": "",
      "wechat": "",
      "tiktok": "",
      "web": "",
    },
    "contact": {
      "phone": "",
      "email": "",
    }
  }
}

=== Additional Rules ===
- Normalize all numbers (e.g. 61.85, not "RM61.85" OR "$61.85").
- Include tax, rounding, or discount lines under `summary`.
- Extract all visible line items under `items`.
- Preserve multilingual text (Chinese, Malay, English) exactly as shown.
- Do not guess missing data.
- Always include `currency` as "$" unless clearly another.

Return only the final JSON.