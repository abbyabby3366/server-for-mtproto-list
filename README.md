# MTProto Proxy Pool Server

A simple Express server that serves a list of MTProto proxies for the TopPro iOS app.

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

The server will run on `http://localhost:3000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/proxies` | Get list of available MTProto proxies |
| `POST` | `/proxies` | Update proxy list (requires API_KEY) |
| `GET` | `/health` | Health check |
| `GET` | `/` | Service info |

## Proxy List Format

Edit `proxies.json` to configure your MTProto proxies:

```json
[
  {
    "host": "1.2.3.4",
    "port": 443,
    "secret": "ee0123456789abcdef0123456789abcdef"
  }
]
```

### Fields:
- **host**: IP address or hostname of the MTProto proxy
- **port**: Port number (typically 443)
- **secret**: Hex-encoded MTProto proxy secret (starts with `ee` for fake-TLS or `dd` for padded)

## Deploy to Render

1. Push this folder to a Git repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Point it to your repo, set the root directory to `proxy-server/`
4. Set environment variables:
   - `PORT` = auto-set by Render
   - `API_KEY` = your secret key (optional, for POST endpoint protection)
5. Deploy

You'll need to deploy this 3 times with different service names for the 3 pool domains:
- `mtproto-pool-one.io7.my` → Render service 1
- `mtproto-pool-two.io7.my` → Render service 2  
- `mtproto-pool-three.io7.my` → Render service 3

Each can serve the same or different proxy lists for redundancy.

## Security

Set `API_KEY` in `.env` to protect the POST endpoint:

```bash
API_KEY=your-secret-api-key-here
```

Clients must then send: `Authorization: Bearer your-secret-api-key-here`

The GET `/proxies` endpoint can also be protected by setting API_KEY (all endpoints will require auth).
