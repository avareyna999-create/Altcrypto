# Altcryptotrade - Crypto Fixed-Time Trading Platform

## Overview
Altcryptotrade is a comprehensive full-stack crypto fixed-time trading platform. It enables users to register, engage in fixed-duration crypto pair trading, manage USDT deposits and withdrawals, and complete KYC verification. The platform also provides administrators with tools for user management, transaction review (deposits/withdrawals), and trade outcome control. The project aims to deliver a robust and scalable solution for crypto fixed-time trading, offering a secure and efficient environment for users and powerful management capabilities for administrators.

## User Preferences
I want to use iterative development. Ask before making major changes.

## System Architecture
The platform is built with a modern web stack:
- **Frontend**: React, Vite, TailwindCSS, shadcn/ui, wouter for routing.
- **Backend**: Express.js with PostgreSQL and Drizzle ORM.
- **Authentication**: JWT Bearer tokens for secure user sessions.
- **UI/UX**: Features a professional landing page, responsive design for mobile, a custom theme system with light/dark modes, and a restructured sidebar for intuitive navigation. Design elements include shadcn/ui components, custom icons, and consistent branding.
- **Trading Engine**: A server-side singleton processes fixed-time trades, integrating real-time market data for outcome determination. It supports configurable durations, minimum amounts, and profit percentages.
- **Market Data**: Utilizes CoinGecko and Binance APIs, proxied through the backend with caching to manage rate limits and provide real-time and historical candlestick data.
- **Admin Panel**: A dedicated interface for administrators to manage users, KYC verifications, deposits, withdrawals, and control trade outcomes with a two-tier role-based access system (SUPER_ADMIN and ADMIN).
- **Multi-Asset Wallet**: Supports multiple cryptocurrencies (USDT, USDC, BTC, ETH, BNB) with distinct deposit/withdrawal networks and precise balance management. Includes a portfolio valuation based on live market prices.
- **Web3 Authentication**: Integration with MetaMask for secure login using wallet signatures, facilitating user onboarding and authentication.
- **PWA & Desktop App**: Designed as a Progressive Web Application (PWA) with offline capabilities and installable desktop applications (Windows, Mac, Linux) via Electron.
- **Real-time Chat**: Implements Socket.io for a real-time customer support chat system between users and administrators, including typing indicators and status updates.
- **Security**: Features withdrawal PINs, email-based OTP for password/PIN resets, and secure handling of user data. Includes a security logging system (`security_logs` table) that captures IP address, geolocation (country, city, region, timezone, ISP via ipapi.co) on every registration and login, with suspicious activity detection when a user logs in from a different country than their last session. All logging is non-blocking and does not affect the login flow. Helper in `server/security.ts`.
- **Referral System**: An integrated referral program tracks user acquisitions, assigns users to admins, and provides performance metrics for administrators.
- **Asset Conversion**: Allows bidirectional conversion between USDT and other crypto assets at live market rates.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Drizzle ORM.
- **CoinGecko API**: Used for fetching general cryptocurrency market data.
- **Binance API**: Provides real-time and historical candlestick data for trading pairs.
- **Multer**: Handles file uploads for KYC documents and deposit proofs.
- **Socket.io**: Enables real-time, bidirectional communication for the support chat feature.
- **ethers.js**: Used for verifying MetaMask signatures on the backend.
- **qrserver.com API**: Generates QR codes for deposit wallet addresses.
- **ImageMagick**: Used for generating application icons for PWA and desktop apps.
- **Electron**: Framework for building cross-platform desktop applications.