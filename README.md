ExamAnalyzerAI - Full System (Generated)
=======================================
This package contains a more complete version of the ExamAnalyzerAI system:
- Frontend static site (upload + paste text + results)
- Backend Node.js service with OCR (Python microservice), OpenAI integration for embeddings/GPT summarization, clustering and study-plan generation.

Quick setup:
1) Backend
   - Ensure server has Python3, poppler-utils, Tesseract OCR for scanned images support.
   - cd backend
   - npm install
   - Set environment OPENAI_API_KEY (optional, improves quality)
   - node server.js

2) Frontend
   - Upload frontend files to Hostinger public_html
   - Edit frontend/config.js to point to backend URL

Deploy tips:
- For Render: push backend to GitHub, create Web Service, build: npm install, start: node server.js
- For OCR on Render you need a Docker image with Tesseract; otherwise run backend on a VPS that has Tesseract.

AdSense readiness:
- Add Privacy & Terms pages (included)
- Add some blog/content pages and contact info before applying
