# API Key Manager

[中文文档](README_CN.md)

> Migrated from Vercel to Cloudflare Pages with KV storage. This project has been adapted to run on Cloudflare's Edge Runtime with persistent KV storage replacing the original Vercel storage solution.

## Migration Notes

**Storage Architecture Change**:
- Migrated from Vercel deployment → Cloudflare Pages + KV storage
- All data (API keys, users, sessions, settings) stored in Cloudflare KV
- Browser localStorage used only for language preference

**Fixed Issues**:
- ✅ Authentication flow on Cloudflare Pages (commit `9822680`)
- ✅ Connection testing compatibility with Edge Runtime (commits `9822680`, `3f0fc15`)
- ✅ Dashboard cache loading and provider filtering optimization (commit `e910030`)
- ✅ Added KV runtime exports for Cloudflare Pages compatibility (commit `bbb6b0c`)

**New Features**:
- ✅ Dashboard Monitoring Toggle — Independent control over which keys appear in dashboard monitoring

---

A secure and efficient API key management system that helps developers and teams easily manage API keys for various AI models. Built with Next.js and deployable on Cloudflare Pages with KV storage.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Cloudflare Pages Deployment](#cloudflare-pages-deployment)
  - [Docker Deployment](#docker-deployment)
- [Key Features](#key-features)
  - [API Key Management](#api-key-management)
  - [Dashboard Monitoring Toggle](#dashboard-monitoring-toggle)
  - [Connection Testing](#connection-testing)
  - [Secure Encryption](#secure-encryption)
  - [Multi-user Support](#multi-user-support)
  - [Multi-language Support](#multi-language-support)
  - [Complex Key Types](#complex-key-types)
  - [Recharge Links](#recharge-links)
- [Configuration](#configuration)
- [Security Recommendations](#security-recommendations)
- [Usage](#usage)
- [License](#license)

## Features

- **Multi-Provider Support** — Manage API keys from OpenAI, Anthropic, Baidu, Google, Meta, Mistral, Cohere, and custom providers
- **Dashboard Monitoring Toggle** — Independent control over which keys appear in dashboard monitoring
- **Connection Testing** — Test API URL reachability and model list retrieval
- **Secure Encryption** — AES-256 encryption for all stored keys
- **Multi-user Support** — Admin and regular user roles
- **Multi-language Interface** — Switch between Chinese and English
- **Complex Key Support** — Handle both simple API keys and Key+AppID+SecretKey combinations
- **Recharge Links** — Configure recharge URLs for quick access from the dashboard

## Tech Stack

- **Framework**: Next.js 14
- **Deployment**: Cloudflare Workers/Pages
- **Storage**: Cloudflare KV
- **UI Components**: Radix UI + Tailwind CSS
- **Language**: TypeScript
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Local Development

1. **Install dependencies:**

```bash
npm install
```

2. **Create `.env.local` file:**

```plaintext
ENCRYPTION_KEY=your-secure-random-string-here
```

> ⚠️ **Important**: Use a strong, unique random string for `ENCRYPTION_KEY` in production.

3. **Run the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Cloudflare Pages Deployment

1. **Fork this repository**

2. **Create a Cloudflare Pages project** and link it to your forked repository

3. **Create a KV namespace:**

```bash
npx wrangler kv:namespace create "KV"
```

4. **Bind the KV namespace** to your Pages project:
   - Go to your Pages project settings
   - Add a KV namespace binding named `KV`

5. **Set environment variables** in Cloudflare Pages settings:
   - `ENCRYPTION_KEY`: A secure random string for encrypting API keys (required)
   - `SETUP_TOKEN`: Optional token for initial setup (recommended for first-time deployment)

6. **Deploy** your application

**Default login credentials:**
- Username: `admin`
- Password: `password`

> 🔒 **Security**: Change the default password immediately after first login.

### Docker Deployment

```bash
# Build the Docker image
docker build -t api-key-manager .

# Run the container
docker run -p 3000:3000 -e ENCRYPTION_KEY=your-secure-key api-key-manager
```

## Key Features

### API Key Management

Securely store and organize API keys from multiple AI service providers in one centralized location. Each key can be labeled with a custom name for easy identification.

**Supported Providers:**
- OpenAI
- Anthropic
- Baidu (ERNIE Bot)
- Google (Gemini)
- Meta (Llama)
- Mistral
- Cohere
- Custom providers (via self-configured base URL)

### Dashboard Monitoring Toggle

Each API key has an independent **`monitorOnDashboard`** switch that controls whether it appears in the dashboard connection status monitoring. This replaces the previous limitation of only showing the first 10 keys.

**Benefits:**
- Reduce dashboard clutter by hiding infrequently used keys
- Focus monitoring on critical keys
- Better performance with fewer concurrent checks

**Backward Compatibility:** Existing keys without this setting default to `enabled` to maintain existing behavior.

### Connection Testing

Test your API connections directly from the dashboard with two modes:

1. **Single Key Testing** — Click the "Test" button on any key card to:
   - Verify API URL reachability
   - Retrieve and display the available model list
   - Check connection status and latency

2. **Batch Refresh** — Use the "Refresh All" button to test all monitored keys simultaneously

**What Gets Tested:**
- Network connectivity to the API endpoint
- Authentication validity
- Model list retrieval (where supported by provider)

### Secure Encryption

All API keys are encrypted using **AES-256 encryption** before storage:

- Keys are encrypted on the client side before sending to the server
- The `ENCRYPTION_KEY` environment variable controls the encryption key
- Encrypted keys are stored in Cloudflare KV
- Decryption only happens in-memory when needed for API calls

> 🔐 **Never share your `ENCRYPTION_KEY` or commit it to version control.**

### Multi-user Support

Two user roles with different permission levels:

- **Admin** — Full access to all features including:
  - API key management
  - User management
  - System settings
  - Password change for any user

- **Regular User** — Limited access:
  - View and test API keys
  - Change own password
  - No management privileges

### Multi-language Support

Switch between Chinese and English interfaces seamlessly:

- Language selector in the settings page
- All UI text and labels translated
- Persistent language preference per user

### Complex Key Types

Support for different API key authentication methods:

1. **Simple API Key** — Single key string (e.g., OpenAI API key)

2. **Complex Keys** — Multiple authentication components:
   - API Key
   - App ID (application identifier)
   - Secret Key (for signing requests)
   - Custom Base URL (for self-hosted or proxy endpoints)

This flexibility allows integration with providers that require more sophisticated authentication.

### Recharge Links

Configure a **recharge URL** for each API key to provide quick access to the provider's recharge or management page.

**How it works:**
1. Add a recharge URL when creating or editing a key
2. A "Recharge/Manage" button appears on the key card in the dashboard
3. Click the button to open the provider's recharge page in a new tab

**Benefits:**
- Quick access to top up balances without leaving the dashboard
- Maintain links to provider management consoles
- Customizable per key for different providers

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENCRYPTION_KEY` | AES-256 encryption key for securing API keys | Yes | None |
| `SETUP_TOKEN` | Optional token for initial setup to prevent unauthorized access | No | None |

### Initial Setup with SETUP_TOKEN

For enhanced security during first deployment, use `SETUP_TOKEN`:

1. Set `SETUP_TOKEN=your-random-token` in environment variables
2. Access `/setup?token=your-random-token` to create the initial admin account
3. After setup, you can remove the `SETUP_TOKEN` from environment variables

This prevents anyone from creating the first admin account without the token.

## Security Recommendations

1. **Change Default Password** — Change the default admin password immediately after first login
2. **Use Strong ENCRYPTION_KEY** — Generate a cryptographically secure random string (32+ characters)
3. **Enable HTTPS** — Always use HTTPS in production deployments
4. **Protect ENCRYPTION_KEY** — Never commit it to version control or share it
5. **Regular Backups** — Export your keys periodically as a backup
6. **Rotate API Keys** — Change API keys periodically according to provider best practices
7. **Limit Access** — Use Cloudflare Access or similar for additional authentication on your deployment
8. **Monitor Logs** — Regularly check Cloudflare Logs for suspicious activity

## Usage

### First Time Setup

1. **Login** with default credentials (`admin` / `password`)
2. **Change password** immediately via the Settings page
3. **Add API keys** via the API Keys page:
   - Click "Add New Key"
   - Fill in the key name and actual API key
   - Select the provider
   - Optionally configure:
     - App ID and Secret Key (for complex authentication)
     - Custom base URL (for custom providers)
     - Recharge URL (for quick access)
     - Dashboard monitoring toggle
4. **Test connections** from the Dashboard to verify configuration

### Daily Operations

- **Dashboard** — Monitor connection status of all keys with monitoring enabled
- **API Keys** — Add, edit, delete, or test individual keys
- **Settings** — Change language, password, and system preferences
- **Users** — (Admin only) Manage user accounts and permissions

### Testing Connections

From the Dashboard:
- Click the **"Test"** button on any key card to test that specific key
- Click **"Refresh All"** to test all monitored keys in batch
- View connection status, latency, and available models

## License

MIT License — see LICENSE file for details.
