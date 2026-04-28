# ChainMind 📦

(version: v1)

**An AI-Powered Supply Chain Digital Twin**  

## Overview

ChainMind is a dynamic, real-time digital twin application designed to visualize, simulate, and optimize supply chain networks. By mapping physical warehouse nodes to a digital interface, users can inject localized demand surges and instantly receive actionable, context-aware intelligence powered by Google Gemini AI. The application ensures seamless data synchronization across the entire network, providing supply chain managers with a living snapshot of their operations to prevent shortages and optimize logistics.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4, React Router, Lucide React (Icons)
- **Backend**: Node.js, Express.js
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth (Email/Password & Google Sign-In)
- **AI Integration**: Google Generative AI SDK (Gemini)
- **PDF Generation**: PDFMonkey

## Features

- **Dynamic Network Mapping**: Configure custom warehouse locations and initial stock capacities through a guided setup wizard.
- **Demand Surge Simulation**: Stress-test your network by targeting specific nodes with variable demand spikes.
- **Real-Time Synchronization**: Live updates across all clients using Firebase Realtime Database.
- **Gemini AI Intelligence**: Context-aware AI analysis that detects critical inventory levels (<80 units) and automatically recommends precise restocking or rerouting strategies.
- **AI Generated Mitigation Report**: Generates a detailed report on the mitigation strategies recommended by the AI.
- **Fail-Safe Mock Intelligence**: Built-in exponential backoff and dynamic local mock generation ensures the dashboard continues providing actionable insights even during live API outages or high-demand throttling.
- **Premium UI/UX**: A highly polished, modern interface featuring glassmorphism, responsive animations, and a sleek dark mode aesthetic.

## Deployed MVP Link

[https://chainmind-fpb5.onrender.com] (ChainMind | Supply Chain Digital Twin)

## Future Scope

- **Predictive Analytics**: Implementing historical data tracking to forecast seasonal demand surges before they happen.
- **Automated Restocking**: Integration with third-party logistics (3PL) APIs to automatically generate purchase orders when nodes hit critical thresholds.
- **Multi-Tier Networks**: Expanding the digital twin to map complex hierarchical networks (e.g., Factories → Regional Hubs → Local Distribution Centers).
- **Geospatial Visualization**: Upgrading the dashboard to map warehouses onto a live interactive map for true geographical routing and transit time optimization.
