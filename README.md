# 🏏 CricAuction — Real-Time Collegiate Cricket Player Auction Platform

[![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20Socket.io-blue.svg)](https://github.com/omsrajput977/Cricket-Player-Auction-Platform)
[![Node](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%206-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

An enterprise-grade, high-concurrency real-time cricket player bidding platform engineered specifically for inter-college leagues, collegiate sports festivals, and university premier leagues. 

CricAuction replaces chaotic paper-based auctions and spreadsheet bidding with a sub-millisecond synchronized live bidding arena, complete with automated budget enforcement, anti-sniping protection, anti-fraud student identity verification, and multi-user concurrency control.

---

## 🔗 Project Links & Demos

| Resource | Link |
| :--- | :--- |
| 🌐 **Live Deployed Application** | [👉 Launch Live CricAuction Application](https://your-deployed-link-here.com) *(Replace with your live deployment URL)* |
| 🎥 **Project Explanation & Walkthrough Video** | [👉 Watch Comprehensive Video Demonstration](https://your-video-link-here.com) *(Replace with your video explanation URL)* |

---

## 📌 Table of Contents
1. [The Real-World College Problem](#-the-real-world-college-problem)
2. [Key Innovations & Features](#-key-innovations--features)
3. [System Architecture](#-system-architecture)
4. [Roles & Permissions (RBAC)](#-roles--permissions-rbac)
5. [Anti-Spam & Student Verification Pipeline](#-anti-spam--student-verification-pipeline)
6. [Tech Stack](#-tech-stack)
7. [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
8. [Configuration & Environment Variables](#-configuration--environment-variables)
9. [Step-by-Step Platform Walkthrough](#-step-by-step-platform-walkthrough)
10. [REST API Documentation](#-rest-api-documentation)
11. [WebSocket Events Specification](#-websocket-events-specification)
12. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🎯 The Real-World College Problem

Inter-college cricket auctions (e.g., Annual Sports Fests, Premier Leagues) traditionally struggle with serious operational pain points:
- **Bidding Collisions & Human Errors:** Auctioneers manually track rising bids on whiteboards, leading to disputes, incorrect amounts, or skipped increments.
- **Purse Breaches & Squad Deficits:** Franchises frequently overspend, exhausting their funds before fulfilling the mandatory minimum squad roster (e.g., spending 90% of their purse on 3 players and being unable to afford 11 players at base price).
- **Rogue / Spam Player Registrations:** Public registration forms are bombarded with duplicate entries, troll names, or fake submissions without verifiable student credentials.
- **Campus Network Instability:** Hostels and campus Wi-Fi networks share a single NAT IP, causing aggressive rate-limiters to lock out genuine students, or causing momentary disconnects during high-stakes bidding.

**CricAuction solves all of these problems natively through software.**

---

## ✨ Key Innovations & Features

### ⚡ 1. High-Precision Real-Time Bidding Engine
- **Mutex-Locked Concurrency (`async-mutex`):** Eliminates race conditions and phantom bids when multiple team owners hammer the bid button simultaneously.
- **Sub-Millisecond In-Memory Team Cache:** High-speed RAM validation checks remaining purse and minimum squad reserve rules instantly before accepting bids.
- **Dynamic Anti-Sniping Protection:** If a bid is submitted in the closing seconds (default: 15s), the timer automatically extends, preventing unfair last-millisecond bid sniping.
- **Clock-Skew Compensation:** The client calculates and compensates for network latency and device clock drift against server epoch time.

### 🛡️ 2. Automated Financial & Squad Constraint Enforcement
- **Minimum Reserve Formula:** Automatically enforces that a team cannot bid if:
  $$\text{Remaining Purse} - \text{Bid Amount} < (\text{Min Squad Size} - \text{Current Squad} - 1) \times \text{Min Base Price}$$
- Prevents franchises from becoming mathematically incapable of fielding a full playing 11.
- Maximum squad capacity enforcement (prevents teams from stockpiling players beyond tournament limit).

### 🪪 3. Anti-Spam Student Verification & Moderation
- **Compulsory Student ID Card Proof:** Students must upload a physical College ID Card photo or institutional admission slip.
- **Campus Wi-Fi Friendly:** No IP-based lockouts; multiple students on the same campus or hostel Wi-Fi can nominate simultaneously.
- **Strict Identity Uniqueness:** Uniqueness indexes enforced on `{ tournamentId, rollNumber }` and `{ tournamentId, contactNumber }`.
- **Organizer Verification Queue:** Review pending nominations with a full-screen image lightbox, approve to the live stage, or reject with a documented committee reason.
- **Self-Service Status Lookup:** Students can enter their Roll Number on the public lookup page to see whether their application is `PENDING_APPROVAL`, `APPROVED`, or `REJECTED` (with feedback).

### 🔨 4. Tournament Adjudicator Console
- **Single-Podium Integrity:** Only one player can be on the podium at any given time. Selecting a new player automatically reverts any previous unbid player back to the available selection queue.
- **Unload to Queue:** Admins can return a introduced player back to the selection queue with a single click without having to mark them unsold.
- **Admin Wi-Fi Fallback Bidding:** If a team's hostel connection stutters during a live bidding war, the organizer can execute a verified incremental bid on their behalf.
- **One-Click Sold Adjudication:** Executes a MongoDB ACID transaction that debits team purse, adds player to squad, marks player `SOLD`, and triggers room-wide confetti celebration.
- **Round 2 Accelerated Auction:** Allows organizers to recall all `UNSOLD` players with an optional percentage discount (e.g., 20% discount) into a fast-track second auction round.

---

## 🏗️ System Architecture

```
                   ┌──────────────────────────────────────────────┐
                   │               Client Browsers                │
                   │   Admin Console | Team Owner | Public Lookup │
                   └──────────────────────┬───────────────────────┘
                                          │
                      HTTP REST API       │   WebSocket (Socket.io)
                      (JSON / Multer)     │   (Sub-millisecond events)
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │             Express.js Server                │
                   │  - JWT & Passcode Authentication Middleware  │
                   │  - Public Player Registration & ID Upload    │
                   │  - Self-Healing Podium Normalizer            │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
                   ┌──────────────────────────────────────────────┐
                   │         TournamentEngine (In-Memory)         │
                   │  - async-mutex (Atomic Bid Execution)        │
                   │  - Teams Purse & Squad RAM Cache             │
                   │  - Dynamic Anti-Sniping Timer Loop           │
                   └──────────────┬───────────────┬───────────────┘
                                  │               │
            Atomic Updates / ACID │               │ Asset Stream
                                  ▼               ▼
                   ┌──────────────────────┐┌──────────────────────┐
                   │    MongoDB Atlas     ││ Cloudinary / DataURI │
                   │  - Replica Set ACID  ││ - Profile Headshots  │
                   │  - Unified Snapshots ││ - College ID Proofs  │
                   └──────────────────────┘└──────────────────────┘
```

---

## 👥 Roles & Permissions (RBAC)

| Role | Key Permissions | Protection Mechanism |
| :--- | :--- | :--- |
| **Tournament Admin** | Create tournaments, seed players, approve/reject nominations, push players to podium, pause/resume timer, fallback bids, adjudicate sales, recall unsold players. | Secured with `ADMIN_REGISTRATION_KEY` on signup to prevent public account hijacking. |
| **Team Owner** | View live stadium, monitor franchise purse, place incremental bids in real-time, view acquired squad roster. | Assigned strictly to 1 team per tournament by the organizer. |
| **Student Nominee** | Submit public nomination form with ID card proof, check nomination approval status via Roll Number. | Public access, secured with roll number and mobile number uniqueness constraints. |
| **Audience / Spectator** | Watch the live stage, view real-time bidding updates, listen to gavel sounds and watch confetti celebrations. | Open live broadcast mode. |

---

## 📁 Tech Stack

### Frontend
- **Framework:** React 18 (SPA)
- **Tooling:** Vite 6
- **Styling:** Tailwind CSS (Dark stadium glassmorphism design system)
- **Icons:** Lucide React
- **Animations & Effects:** Canvas Confetti, CSS keyframe pulses
- **Real-Time Client:** Socket.io-client v4.8

### Backend
- **Runtime:** Node.js (ES Modules)
- **Web Framework:** Express.js v4.21
- **Real-Time Engine:** Socket.io v4.8
- **Concurrency Control:** `async-mutex`
- **Database & ODM:** MongoDB Atlas + Mongoose v8
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- **File Handling:** `multer` (in-memory buffer storage)
- **Cloud Storage:** Cloudinary SDK with automatic fallback to base64 Data URIs

---

## 🚀 Step-by-Step Installation & Setup

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas connection URI (Replica Set required for ACID transactions)
- **Cloudinary Account (Optional):** Free tier account for cloud media storage (the app includes an automatic local DataURI fallback if omitted).

---

### 2. Clone the Repository
```bash
git clone https://github.com/omsrajput977/Cricket-Player-Auction-Platform.git
cd Cricket-Player-Auction-Platform
```

---

### 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your environment configuration file:
   ```bash
   cp .env.example .env
   # or create .env directly
   ```
4. Configure your `.env` variables (see [Environment Variables](#-configuration--environment-variables)).
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:5010`.*

---

### 4. Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`.*

---

## ⚙️ Configuration & Environment Variables

### Backend (`backend/.env`)

```env
# Server Port & Mode
PORT=5010
NODE_ENV=development

# Allowed Client Origin (for CORS and Socket.io)
CLIENT_URL=http://localhost:5173

# MongoDB Atlas Replica Set Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cricauction?retryWrites=true&w=majority

# JWT Authentication Config
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Organizer Security Passcode (Required to register as ADMIN)
ADMIN_REGISTRATION_KEY=CRIC_ADMIN_2026

# Cloudinary Storage (Optional - Falls back to DataURI if missing)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🎮 Step-by-Step Platform Walkthrough

### Step 1: Admin Account Creation
1. Open `http://localhost:5173` in your browser and click **Sign In** in the navigation bar.
2. Select **Register New Account**.
3. Choose the **Tournament Organizer (Admin)** role.
4. Enter the **Organizer Security Key** configured in your `.env` (default: `CRIC_ADMIN_2026`).
5. Complete registration. You are now logged in as the Tournament Organizer.

### Step 2: Tournament Setup & Rapid Seeding
1. Navigate to **Admin Console**.
2. Select an active tournament or click **Create New Tournament** (set starting purse, min squad size, timer duration, etc.).
3. Click the purple button: **`⚡ Seed 10 College Cricket Stars`**.
   *This automatically seeds marquee college players across Batting, Bowling, and All-Rounder roles.*
4. Under **Manage Franchise Teams**, review or add teams (e.g., *Mumbai Titans*, *Chennai Kings*, *Delhi Dominators*).

### Step 3: Public Student Player Nomination
1. In another browser tab (or incognito mode), visit `http://localhost:5173` and click **Nominate**.
2. Fill out student credentials: Name, Roll Number (e.g., `CS23-101`), Department, Year, and Phone.
3. Select Cricket Playing Profile and match statistics.
4. Upload:
   - Profile picture (display on the live auction screen).
   - **Student College ID Card Photo (Compulsory)**.
5. Click **Submit Player Registration**.
6. The application is submitted and marked `PENDING_APPROVAL`.

### Step 4: Organizer Verification Queue
1. In the Admin tab, navigate to the **Student Nominations Verification Queue**.
2. Click **View ID Proof** to open the full-screen photo lightbox and verify the institutional ID.
3. Click **Approve to Live Stage** (the player enters the auction queue) or **Reject** with a reason.
4. The student can check their roll number under **Roll Lookup** to view their real-time verification status.

### Step 5: Conducting the Live Auction
1. Team owners sign in using their credentials and navigate to the **Live Stage**.
2. In the Admin Console on the Live Stage:
   - Choose a player from the queue and click **Push**.
   - The player instantly appears on every connected screen with their photo, role, and base price.
   - Click **Start Timer (20s)**.
3. Connected Team Owners click **Place Bid**.
   - Bids increment according to collegiate pricing rules.
   - If a bid is submitted with less than 15s remaining, the anti-sniping protection automatically resets the countdown.
4. When bidding concludes:
   - Click **Confirm SOLD** to execute the ACID transaction, update franchise purse/squad, and trigger confetti celebrations.
   - Or click **Mark UNSOLD** if no bids were received.
5. If an admin pushes a player by mistake, clicking **Unload** cleanly returns the player back to the available queue.

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`ADMIN` requires `adminSecretKey`) | Public |
| `POST` | `/api/auth/login` | Login with email and password | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user session | Authenticated |

### Public Student Nominations (`/api/public`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/public/players/register` | Submit player nomination with compulsory ID card proof | Public |
| `GET` | `/api/public/players/lookup` | Query nomination status by `{ tournamentId, rollNumber }` | Public |

### Tournaments & Moderation (`/api/tournaments`, `/api/players`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tournaments` | List all tournaments | Public |
| `POST` | `/api/tournaments` | Create tournament with custom rules | Admin |
| `GET` | `/api/players/tournament/:id` | Get tournament players (includes auto-heal normalizer) | Public |
| `PATCH` | `/api/players/:id/approve` | Approve student nomination to the live auction | Admin |
| `PATCH` | `/api/players/:id/reject` | Reject nomination with documented feedback reason | Admin |
| `DELETE` | `/api/players/:id` | Purge player record | Admin |
| `POST` | `/api/players/recall-unsold` | Recall unsold players for Round 2 with discount | Admin |

---

## ⚡ WebSocket Events Specification

### Client to Server
- `JOIN_TOURNAMENT` `{ tournamentId }`: Subscribes socket to tournament channel.
- `ADMIN_LOAD_PLAYER` `{ tournamentId, playerId }`: Places player on podium and reverts previous player to queue.
- `ADMIN_UNLOAD_PODIUM` `{ tournamentId }`: Unseats active player back to queue without marking unsold.
- `ADMIN_START_BIDDING` `{ tournamentId }`: Initiates bidding timer.
- `ADMIN_PAUSE_TIMER` / `ADMIN_RESUME_TIMER`: Pauses or resumes auction clock.
- `PLACE_BID` `{ tournamentId, expectedAmount }`: Submits an incremental bid for authenticated franchise.
- `ADMIN_FALLBACK_BID` `{ tournamentId, targetTeamId }`: Places bid on behalf of a disconnected team.
- `ADMIN_CONFIRM_SOLD` `{ tournamentId }`: Executes sale transaction.
- `ADMIN_MARK_UNSOLD` `{ tournamentId }`: Marks player unsold and resets podium.

### Server to Client Broadcasts
- `ROOM_STATE_SYNC`: Synchronizes room upon connection.
- `PLAYER_ON_PODIUM`: Informs all clients of the newly introduced player.
- `PLAYER_RETURNED_TO_QUEUE`: Notifies clients that the player returned to queue.
- `BIDDING_STARTED`: Notifies clients that the timer is running.
- `BID_ACCEPTED`: Broadcasts leading bid, bidder franchise, and reset timer.
- `PLAYER_SOLD`: Triggers sold celebration banner and leaderboard update.
- `PLAYER_UNSOLD`: Broadcasts unsold outcome and clears podium.
- `TEAMS_UPDATED`: Real-time purse and squad count synchronization.

---

## ❓ Troubleshooting & FAQs

#### 1. Why do multiple students on college Wi-Fi get blocked?
They don't! The previous IP rate limiter (`5 requests / 15 mins per IP`) was completely removed. Anti-spam is now enforced through **compulsory student ID card photo uploads**, **unique roll number validation**, and **unique mobile number validation**, allowing thousands of students on the same campus Wi-Fi network to submit without issues.

#### 2. What happens if the server restarts during an active auction?
`TournamentEngine` includes a built-in state resurrection mechanism (`hydrateFromDb`). When the server boots up, it reads `activeAuctionSession` from MongoDB and resumes any running timer with the exact remaining seconds.

#### 3. Do I need a paid Cloudinary account?
No. If Cloudinary credentials are omitted or exceed free quotas, the server automatically falls back to in-memory Base64 Data URIs, allowing local development and demonstrations to function seamlessly without external storage dependencies.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
