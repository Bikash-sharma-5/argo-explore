# 🌊 AI-Powered ARGO Data Explorer (MERN + Python)

An **AI-driven system** to query, explore, and visualize **ARGO float oceanographic data** using **natural language**.  
Built with the **MERN stack** for the web platform and **Python scripts** for NetCDF (`.nc`) data preprocessing.

---

## 📖 Background  

The **ARGO program** deploys thousands of profiling floats that collect **temperature, salinity, and BGC data** in **NetCDF format**.  
These datasets are powerful but complex, requiring domain expertise and specialized tools.  

This project bridges that gap by:  
- Preprocessing `.nc` files with Python 🐍  
- Serving structured data through a **MERN backend** 🌐  
- Providing an **AI-powered conversational interface** 🤖  
- Visualizing profiles and trajectories with **interactive dashboards** 📊  

---

## 🚀 Features  

- 📂 **NetCDF to Structured Data**  
  - Python script converts `.nc` ➝ JSON/CSV/Parquet  
  - Ingested into **MongoDB** for queries  

- ⚡ **MERN Stack Backend**  
  - REST APIs built with **Express + Node.js**  
  - Stores preprocessed oceanographic data in **MongoDB**  

- 🤖 **AI Querying**  
  - Natural language ➝ Database query  
  - Retrieval-Augmented Generation (RAG) with LLMs  

- 🌍 **Interactive Dashboard (React)**  
  - View float trajectories on maps  
  - Plot salinity, temperature, BGC profiles  
  - Compare datasets over regions & time  

---

## 📂 Project Structure  
ARGO-EXPLORER/
│── argo_data/ # Raw ARGO NetCDF files
│── backend/ # Node.js + Express backend
│ ├── src/
│ │ ├── config/ # DB configs
│ │ ├── controllers/ # Request handlers
│ │ ├── middlewares/ # Express middlewares
│ │ ├── models/ # MongoDB schemas
│ │ ├── routes/ # API routes
│ │ └── index.js # Backend entrypoint
│ ├── .env # Environment variables
│ ├── package.json
│ └── vercel.json # Deployment config
│
│── frontend/ # React (Vite) dashboard
│ ├── public/
│ ├── src/ # Components & pages
│ ├── package.json
│ └── vite.config.js
│
│── infra/ # Infrastructure & deployment configs
│── microservice/ # Python-based microservices (e.g., RAG, data APIs)
│── vector-db/ # Vector database (FAISS/Chroma)
│── docs/ # Documentation
│── download_argo.py # Script to download ARGO data
│── README.md # Project documentation (this file)

## 🚀 Features  

- 📂 **NetCDF Processing**  
  - Python scripts (`download_argo.py`, microservices) fetch and preprocess `.nc` files  
  - Convert to **structured formats** (JSON, CSV, Parquet)  

- ⚡ **MERN Backend**  
  - Express REST API  
  - MongoDB storage for structured ARGO data  
  - Modular controllers, routes, and models  

- 🌍 **Frontend Dashboard (React + Vite)**  
  - Interactive maps (Leaflet/Mapbox)  
  - Profile plots (Plotly)  
  - Time-series and comparison tools  

- 🧠 **AI Querying (Vector DB + LLM)**  
  - RAG pipeline using FAISS/Chroma  
  - Natural language → database query → visualization  

---

## 🛠️ Installation  

### 1️⃣ Clone the Repo  
```bash
git clone https://github.com/Bikash-sharma-5/argo-explore.git
cd ARGO-EXPLORER
🤝 Contributing

We welcome contributions! See CONTRIBUTING.md
.
