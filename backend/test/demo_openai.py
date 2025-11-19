from openai import OpenAI
from datetime import datetime
client = OpenAI(
    api_key="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",
)

#print(ocr_prompt)
inputs=[
      {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": "Read all text on the receipt including Chinese\nExtract the receipt into JSON \n, Return only the final JSON"
            },
            {
                "type": "input_image",
                "image_url": "https://tan-necessary-stingray-268.mypinata.cloud/ipfs/bafkreig4k5twj5724ehghncjpelja6gafmkpt5gzsimcwqsaihe2jqscri"
            },
        ]
    }
]


#print(inputs)

print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

response = client.responses.create(
    model="gpt-4o",
    input=inputs
)
print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print(response.output_text)

inputJson = response.output_text

with open("./test/ocr_prompt.md", "r") as file:
    ocr_prompt = file.read()
    ocr_prompt = ocr_prompt.replace("{{inputJson}}", inputJson)

#print(ocr_prompt)

inputs = [
    {
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": ocr_prompt
            },
        ]
    }
]

print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

response = client.responses.create(
    model="gpt-4.1",
    input=inputs,
)
print(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print(response.output_text)


