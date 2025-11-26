# python OCR microservice
import sys, json
from pdf2image import convert_from_path
import pytesseract
from PIL import Image

input_path = sys.argv[1]

def pages_from_pdf(path):
    try:
        return convert_from_path(path, dpi=200)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

pages = []
if input_path.lower().endswith('.pdf'):
    pages = pages_from_pdf(input_path)
else:
    pages = [Image.open(input_path)]

all_text = []
for i, page in enumerate(pages):
    try:
        text = pytesseract.image_to_string(page, lang='eng')
    except Exception as e:
        text = ''
    all_text.append({'page': i+1, 'text': text})
print(json.dumps(all_text))
