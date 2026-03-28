# EL Science - Elementary School Science Tutor

An AI-powered interactive science tutoring platform for grades 1-5, combining conversational tutoring with 40+ PhET simulations.

## Features

- **AI Conversational Tutor** - Multi-turn dialog with instant feedback and adaptive scaffolding
- **Three Tutor Personalities**
  - Dr. Owl (patient, methodical guide)
  - Rocket Lion (competitive, challenge-based)
  - Dr. Fox (story-driven exploration)
- **Five Science Modules** - Life Science, Physical Science, Earth & Space, Matter & Chemistry, Scientific Inquiry
- **40+ PhET Interactive Simulations** - Hands-on labs covering forces, energy, light, circuits, chemistry, and more
- **Adaptive Learning** - Study planner, mastery tracking, spaced repetition, and frustration detection
- **Student Accounts** - Registration, login, grade selection, and progress dashboards
- **Payment Integration** - Leshua payment gateway with QR code and barcode support

## Prerequisites

- Node.js 14+

## Installation

```bash
npm install
cd tutor && npm install
```

## Configuration

Create a `.env` file in the project root:

```env
PORT=3920                           # Server port (default: 3920)

# Local LLM (optional, takes priority)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=qwen2.5:7b
LOCAL_LLM_TIMEOUT=15000

# Cloud LLM (optional fallback)
ECLAW_API_URL=https://router.eclaw.ai
ECLAW_API_KEY=sk-eclaw-...
ECLAW_OEM_KEY=eclaw_...
LLM_MODEL=claude-haiku-4-5-20251001

# Payment (optional)
LESHUA_MERCHANT_ID=...
LESHUA_TRADE_KEY=...
LESHUA_NOTIFY_KEY=...
LESHUA_NOTIFY_BASE_URL=https://your-domain.com
LESHUA_GATEWAY_URL=https://paygate.leshuazf.com/...
```

Without an LLM configured, the tutor falls back to rule-based responses. Payment configuration is optional.

## Usage

```bash
# Start the tutor server
npm start

# Or use the startup script (starts server and opens browser)
./startup.sh
```

The app runs at `http://localhost:3920`.

## API Endpoints

### Tutoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/start` | Start or resume a tutoring session |
| POST | `/api/turn` | Process student input |
| GET | `/api/progress/:studentId` | Get mastery data |
| GET | `/api/session/:studentId` | Get session state |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/account/register` | Register with phone number |
| POST | `/api/account/login` | Login |
| GET | `/api/account/profile` | Get user profile |
| PUT | `/api/account/profile` | Update profile |
| GET | `/api/account/plans` | Get subscription plans |
| POST | `/api/account/subscribe` | Create subscription order |
| GET | `/api/account/subscription` | Check subscription status |
| POST | `/api/account/progress` | Save learning progress |

### Simulations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulations` | Get PhET simulation catalog |
| GET | `/sim/:slug/*` | Serve simulation files |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/create` | Create QR payment |
| POST | `/api/payment/barcode` | Barcode payment |
| GET | `/api/payment/query/:orderId` | Query order status |
| POST | `/api/payment/refund` | Request refund |

## Data Storage

User data is stored as JSON files:

- `~/data/el-science-accounts/` - User profiles and credentials
- `~/data/el-science-orders/` - Payment orders
- `~/data/sessions/` - Student session state

## License

All rights reserved.
