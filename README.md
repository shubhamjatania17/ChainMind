# ChainMind 📦

(version: v1.1.2)

**An AI-Powered Supply Chain Digital Twin**  

## Overview

ChainMind is a dynamic, real-time digital twin application designed to visualize, simulate, and optimize supply chain networks. By mapping physical warehouse nodes to a digital interface, users can inject localized demand surges and instantly receive actionable, context-aware intelligence powered by Google Gemini AI. The application ensures seamless data synchronization across the entire network, providing supply chain managers with a living snapshot of their operations to prevent shortages and optimize logistics.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4, React Router, Lucide React (Icons), Leaflet.js
- **Backend**: Node.js, Express.js
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth (Email/Password & Google Sign-In)
- **AI Integration**: Gemini API
- **PDF Generation**: Doppio (doppio.sh)

## Features

- **Interactive Geospatial Digital Twin**: Map supply chain facilities onto an interactive Leaflet.js map with dark matter tiles, live routing corridors, transit distance (km), and estimated road transit times.
- **In-Config Map Pinning & Address Search**: Integrated Leaflet map picker within the location wizard with free OpenStreetMap Nominatim geocoding search and draggable coordinate pins.
- **Dynamic Multi-Tier Network Mapping**: Configure multi-tier networks (Factories → Regional Hubs → Local DCs) with custom capacities and parent-supplier dependency chains.
- **Demand Surge Simulation**: Stress-test your network by targeting specific nodes with variable demand spikes.
- **Real-Time Synchronization**: Live updates across all clients using Firebase Realtime Database.
- **Gemini AI Intelligence**: Context-aware AI analysis that detects critical inventory levels (<80 units) and automatically recommends precise restocking or rerouting strategies.
- **AI Generated Mitigation Report**: Generates a detailed PDF report on the mitigation strategies recommended by the AI via Doppio.
- **Fail-Safe Mock Intelligence**: Built-in exponential backoff and dynamic local mock generation ensures the dashboard continues providing actionable insights even during live API outages or high-demand throttling.
- **Premium UI/UX**: A highly polished, modern interface featuring glassmorphism, responsive animations, and a sleek dark mode aesthetic.

## Deployed MVP Link

<https://chainmind-fpb5.onrender.com>

## Future Scope

- **Predictive Analytics**: Implementing historical data tracking to forecast seasonal demand surges before they happen.
- **Automated Restocking**: Integration with third-party logistics (3PL) APIs to automatically generate purchase orders when nodes hit critical thresholds.
