from flask import Flask, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])
CORS(app, resources={r"/*": {"origins": "http://localhost:4200"}})

@app.route('/')
def home():
    return "Hello, Flask!"

@app.route('/analyze', methods=['POST'])
def analyze_document():
    print("here1")
    if 'document' not in request.files:
        print("No file found in request.files")
        print("request.files:", request.files)
        print("request.form:", request.form)
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files.get('document')
    print("here2")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    print("here")
    # Mock logic for now:
    possible_docs = ["Passport"]
    doc_type = random.choice(possible_docs)

    dummy_fields = {
        "Passport": {
            "Surname": "JERSEY",
            "GivenNames": "ANGELA ZOE",
            "Nationality": "BRITISH CITIZEN",
            "DateOfBirth": "01 JAN 1995",
            "Sex": "F",
            "PlaceOfBirth": "JERSEY",
            "DateOfIssue": "27 NOV 2019",
            "DateOfExpiry": "27 NOV 2029",
            "Authority": "JERSEY",
            "PassportNumber": "999228775"
        }
    }

    return jsonify({
        "docType": doc_type,
        "fields": dummy_fields[doc_type]
    })

if __name__ == '__main__':
    app.run(port=8000, debug=True)