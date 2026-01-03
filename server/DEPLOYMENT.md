# Deploying to Render

## Commands

| Setting | Value |
| :--- | :--- |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

## Environment Variables

Go to the **Environment** tab in your Render service dashboard and add these:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Optimizes Node.js for production. |
| `CORS_ORIGIN` | `https://your-screen-app-url.com` | The URL of your Screen App (or `*` to allow all). |

> [!NOTE]
> You do **not** need to set `PORT`. Render sets it automatically (usually 10000), and your code `process.env.PORT` handles it.
