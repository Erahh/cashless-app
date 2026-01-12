# Expo Tunnel Mode Guide

## Quick Start

### For Testing on Different WiFi Networks

Use tunnel mode to create a public URL that works from anywhere:

```bash
npm run start:tunnel
```

This will:
- Create a public URL (e.g., `exp://u.expo.dev/...`)
- Work on any WiFi network or cellular data
- Allow testing between devices on different networks

### Available Commands

- `npm start` - Standard mode (same WiFi network only)
- `npm run start:tunnel` - Tunnel mode (works from anywhere) ⭐ **Use this for different WiFi networks**
- `npm run start:lan` - LAN mode (same network, faster)

## How It Works

1. **Same WiFi Network**: Use `npm start` (faster, local connection)
2. **Different WiFi Networks**: Use `npm run start:tunnel` (public URL, works anywhere)

## Requirements

- Free Expo account (sign up at https://expo.dev)
- Internet connection on both devices

## Troubleshooting

If tunnel mode doesn't work:
1. Make sure you're logged in: `npx expo login`
2. Check your internet connection
3. Try restarting: `npm run start:tunnel`
