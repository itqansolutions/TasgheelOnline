# Tashgheel Online POS

A full-stack Point of Sale (POS) system built with Node.js, Express, MongoDB, and Vanilla JavaScript.

## Features
- **POS Interface**: Fast and efficient checkout with barcode scanner support.
- **Sales Management**: Track sales, print receipts, and manage returns.
- **Inventory Management**: Manage products, stock levels, and categories.
- **User Management**: Admin and Cashier roles.
- **Reporting**: Detailed sales, profit, and stock reports.
- **Expenses**: Track shop expenses.

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB

## Setup
1. Install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Create a `.env` file in the `server` directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:5000` in your browser.

## Deployment
This project is ready for deployment on Render.
1. Connect your GitHub repo to Render.
2. Set Root Directory to `.`.
3. Build Command: `npm install --prefix server`
4. Start Command: `node server/index.js`
