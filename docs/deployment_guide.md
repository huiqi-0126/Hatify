# Baota (宝塔) Node.js Deployment Guide

To ensure that SEO meta tag injection works correctly on your live server, you must host the project as a **Node.js Application** rather than a "Static Website".

## 1. Prerequisites
- Ensure `npm run build` has been executed locally or on the server.
- The `dist/` folder and `src/data/blog.json` must be present on the server.

## 2. In Baota Panel
1. **Open Node.js Project Manager**:
   - Go to "Website" -> "Node.js Project".
   - Click "Add Node.js Project".

2. **Project Configuration**:
   - **Project Directory**: Select your root directory `/www/wwwroot/customhat.top`.
   - **Project Path**: `/www/wwwroot/customhat.top/server.ts`.
   - **Project Name**: `hatify-backend`.
   - **Node.js Version**: 18 or higher.
   - **Project Port**: `3001` (Make sure this matches your `server.ts` or `.env`).
   - **Start Command**: `npx tsx server.ts`.

3. **Enable Web Mapping**:
   - In the project list, click "Web Mapping" (映射).
   - Enter your domain `customhat.top`.
   - This automatically creates an Nginx reverse proxy that forwards traffic from port 80/443 to your Node.js app on port 3001.

4. **Environment Variables**:
   - Click "Settings" for the project.
   - Add/Ensure `NODE_ENV=production`.

## 3. Why this is necessary?
Your site uses **Dynamic Meta Injection**. 
- **Static Hosting**: Nginx directly serves `dist/index.html`. It doesn't know about our JavaScript logic in `server.ts`.
- **Node Hosting**: All requests go to `server.ts`. If it's a blog page, our code modifies the HTML on the fly before sending it to the user/Google.

## 4. Troubleshooting
- If the page shows "502 Bad Gateway", the Node.js service is not running. Check the "Log" in Node.js Project Manager.
- If the page shows the old title, Nginx is still serving the static directory directly. Delete the old "PHP/Static" website entry in Baota and use only the one created by "Web Mapping".
