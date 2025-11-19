from openai import OpenAI

NOVITA_KEY= "sk_jaiFVTSdlL0oV8tadS1F3o8-YUpqlR_ySNteRDIwROY"
NOVITA_API_URL = "https://api.novita.ai/openai"
NOVITA_DEEPSEEK_OCR_MODEL = "deepseek/deepseek-ocr"

RECEIPT_IMAGE_URL = "https://tan-necessary-stingray-268.mypinata.cloud/ipfs/bafkreigexhlockywqo3jsvbxy7ftun2y2auvciph6zlr5vcp3kawlw5fwe"

client_ocr = OpenAI(
    api_key=NOVITA_KEY,
    base_url=NOVITA_API_URL,
)

messages=[
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "<|grounding|>OCR this image."
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": RECEIPT_IMAGE_URL
                }
            },
        ]
    }
]

#response = client_ocr.chat.completions.create(
#    model=NOVITA_DEEPSEEK_OCR_MODEL,
#    messages=messages,
#)

#print(response.choices[0].message.content)

#ocr_text = response.choices[0].message.content


client_openai = OpenAI(
    api_key="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",
)

ocr_prompt_text = """
Tasks:
1. Read all text on the receipt image including English and Chinese.

3. Extract the receipt into JSON based on the ocr result, do not use any other information.
4. compare the ocr result with the receipt image, and correct the image result according to the ocr result if needed.
4. Return only the final JSON.

"""


inputs = [
    {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": ocr_prompt_text
            },
            {
                "type": "input_image",
                "image_url": RECEIPT_IMAGE_URL
            }
        ]
    }
]

response = client_openai.responses.create(
    model="gpt-4o",
    input=inputs,
)

print(response.output_text)