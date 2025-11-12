from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
from PIL import Image
import tempfile
import os
import json
import subprocess

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])

@app.route('/')
def home():
    return "Smart OCR + LLaMA Extraction API is running 🚀"

@app.route('/analyze', methods=['POST'])
def analyze_document():
    if 'document' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['document']
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    # Step 1️⃣: Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
        file.save(temp_file.name)
        temp_path = temp_file.name

    try:
        # Step 2️⃣: Extract raw text using Tesseract OCR
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        text = pytesseract.image_to_string(Image.open(temp_path))
        print("OCR Extracted Text:")
        print(text)

        # Step 3️⃣: Create LLaMA prompt
        prompt = f"""
        You are an intelligent document parser.
        Below is the OCR-extracted text from a document.
        Your task:
        1. Identify what kind of document it is (e.g., Passport, PAN Card, Aadhar, Driving License, etc.)
        2. Extract the key form fields that are written in english language and their values.
        3. Respond in JSON ONLY with this format:
        {{
            "docType": "<DocumentType>",
            "fields": {{
                "<FieldName>": "<Value>",
                ...
            }}
        }}

        OCR TEXT:
        {text}
        """

        # Step 4️⃣: Query local Ollama LLaMA 3.1 model
        result = subprocess.run(
            ["ollama", "run", "llama3.1"],
            input=prompt,
            capture_output=True,
            text=True
        )

        model_output = result.stdout.strip()
        print("Model Raw Output:")
        print(model_output)

        # Step 5️⃣: Parse response as JSON (fallback-safe)
        try:
            data = json.loads(model_output)
        except json.JSONDecodeError:
            # If model includes extra text, extract JSON substring
            json_str = model_output[model_output.find("{"):model_output.rfind("}") + 1]
            data = json.loads(json_str)
        print("data", data)
        return jsonify(data)

    except Exception as e:
        print("🔥 Error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        # Cleanup temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(port=8000, debug=True)
