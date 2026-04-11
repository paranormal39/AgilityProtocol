/**
 * Agility NFC Module
 * 
 * NFC support for tap-to-verify and tap-to-pay flows.
 * Works alongside QR codes for dual-mode transport.
 * 
 * Platform Support:
 * - Web: Chrome on Android (Web NFC API)
 * - React Native: react-native-nfc-manager
 * - iOS: Core NFC (via React Native)
 * - Android: Android NFC API (via React Native)
 */

// Core types and utilities
export * from './core/index.js';

// Web adapter
export * from './web/index.js';

// Native adapters (React Native)
export * from './native/index.js';
