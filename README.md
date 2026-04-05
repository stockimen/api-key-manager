# API Key Manager

A secure and efficient API key management system that helps developers and teams easily manage API keys for various AI models.

## Features

- **API Key Management**: Securely store and manage API keys from multiple AI service providers
- **Security Encryption**: Protect your API keys with advanced encryption technology
- **Status Monitoring**: Monitor API key connection status in real time
- **Multi-language Support**: Switch between Chinese and English interfaces
- **Custom Settings**: Customize system settings and preferences
- **Connection Testing**: Test API connections directly from the dashboard

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` file:

```plaintext
ENCRYPTION_KEY=your-secure-random-string
```

3. Run development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Cloudflare Pages Deployment

1. Fork this repository
2. Create a Cloudflare Pages project and link to your repository
3. Create a KV namespace: `npx wrangler kv:namespace create "KV"`
4. Set environment variables in Cloudflare Pages settings:
   - `ENCRYPTION_KEY`: A secure random string for encrypting API keys
5. Deploy

Default login credentials:
- Username: `admin`
- Password: `password`

> Change the default password after first login.

### Docker Deployment

```bash
docker build -t api-key-manager .
docker run -p 3000:3000 -e ENCRYPTION_KEY=your-secure-key api-key-manager
```

## Usage

1. Login with default credentials
2. Navigate to "API Keys" to add/manage keys
3. Use "Test" button on dashboard to test connections
4. Configure settings in the Settings page

## Security Recommendations

1. Change the default admin password immediately after first login
2. Use a strong, unique `ENCRYPTION_KEY` for production
3. Enable HTTPS for production deployments
4. Regularly backup your data
5. Rotate API keys periodically

## Configuration

| Variable         | Description                      | Default  |
| ---------------- | -------------------------------- | -------- |
| `ENCRYPTION_KEY` | Key used for encrypting API keys | Required |

## License

MIT License
