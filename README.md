# ⚡ ARCUS

> **Cloud deployment, simplified.** Deploy frontend applications to the cloud directly from GitHub with automated builds, isolated environments, and dynamic reverse-proxy routing.

---

## 📌 Architecture Overview

ARCUS is an open-source, event-driven cloud deployment platform inspired by Vercel. It automates the lifecycle of cloning repositories, managing build queues, compiling assets, and dynamically serving static sites via custom subdomains/domains.

## 🚀 Key Features

* **Automated Git Ingestion:** Clones public/private repositories on demand and syncs source files to AWS S3.
* **Distributed Queue Architecture:** Utilizes Redis pub/sub and queue mechanisms to decouple build jobs from API traffic.
* **Isolated Build Engine:** Downloads source repositories dynamically, handles flat or nested project directories, resolves dependencies, and executes isolated builds.
* **Dynamic Reverse Proxy:** Intercepts subdomains and custom domains via Express to serve static assets directly from AWS S3 storage.
* **Modern Developer UI:** React dashboard styled with Tailwind CSS, custom dark-mode cards, WebGL animated backgrounds, and Firebase authentication.
* **Automated CI/CD:** Continuous integration and deployment pipeline configured with GitHub Actions and Firebase Hosting.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Three.js / Postprocessing, Lucide Icons |
| **Backend Services** | Node.js, TypeScript, Express.js |
| **Cloud & Storage** | AWS S3, Firebase (Auth & Hosting) |
| **Message Broker** | Redis |
| **DevOps / CI/CD** | GitHub Actions |

---
⚙️ Getting Started
Prerequisites
Ensure you have the following installed locally:

Node.js (v18+ recommended)

npm or yarn

Redis (Local instance or Upstash/Cloud Redis)

AWS Account with S3 Bucket permissions

1. Clone the Repository
Bash
git clone [https://github.com/](https://github.com/)<your-username>/ARCUS.git
cd ARCUS
2. Environment Setup
Create .env files in upload-service, deploy-service, and request-handler:

Code snippet
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_bucket_name

# Redis
REDIS_URL=redis://localhost:6379
Configure frontend variables in frontend/.env:

Code snippet
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
3. Running Services Locally
Start Redis
Bash
redis-server
Run Backend Services (in separate terminal tabs)
Bash
# 1. Start Upload Service
cd upload-service
npm install
npm run dev

# 2. Start Deploy Service Worker
cd deploy-service
npm install
npm run dev

# 3. Start Request Handler Proxy
cd request-handler
npm install
npm run dev
Run Frontend Application
Bash
cd frontend
npm install
npm run dev
🌐 Local Domain Mapping
To test custom subdomains and domains locally:

Open your hosts file:

Windows: C:\Windows\System32\drivers\etc\hosts

Linux/macOS: /etc/hosts

Add a mapping pointing to your local proxy:

Plaintext
127.0.0.1  mytestapp.local
Access your deployment via http://mytestapp.local:3001

