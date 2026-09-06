export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
export const REQUIRE_EVIDENCE_LINKING = process.env.EXPO_PUBLIC_REQUIRE_EVIDENCE_LINKING === 'true';
export const REVISION_LEVELS = String(process.env.EXPO_PUBLIC_REVISION_LEVELS || 'P4,P5,P6')
	.split(',')
	.map(level => level.trim().toUpperCase())
	.filter(level => ['P4', 'P5', 'P6'].includes(level));
export const CONFIDENCE_LEVELS = String(process.env.EXPO_PUBLIC_CONFIDENCE_LEVELS || 'Low,Medium,Good,Very Good,High')
	.split(',')
	.map(level => level.trim())
	.filter(level => ['Low', 'Medium', 'Good', 'Very Good', 'High'].includes(level));
export const KEYWORD_TAG_LIMIT = Number(process.env.EXPO_PUBLIC_KEYWORD_TAG_LIMIT || 3) || 3;
export const APP_REFRESH_INTERVAL_MS = Number(process.env.EXPO_PUBLIC_APP_REFRESH_INTERVAL_MS || 3600000) || 3600000;
export const LINKED_CHILDREN_REFRESH_INTERVAL_MS = Number(process.env.EXPO_PUBLIC_LINKED_CHILDREN_REFRESH_INTERVAL_MS || 60000) || 60000;
export const SESSION_HEARTBEAT_INTERVAL_MS = Number(process.env.EXPO_PUBLIC_SESSION_HEARTBEAT_INTERVAL_MS || 300000) || 300000;
export const MANUAL_REFRESH_COOLDOWN_MS = Number(process.env.EXPO_PUBLIC_MANUAL_REFRESH_COOLDOWN_MS || 600000) || 600000;
