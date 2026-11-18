/**
 * The migrations live in the shared domain package so the web app and the mobile app run the very
 * same schema. See packages/domain/src/schema.ts. They are append only, never edit a shipped one.
 */
export { MIGRATIONS } from '@selah/domain';
