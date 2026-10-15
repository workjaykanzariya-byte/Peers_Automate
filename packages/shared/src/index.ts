// DOOT — Shared Domain Models & Contracts

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
  ANALYST = 'ANALYST',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  WON = 'WON',
  LOST = 'LOST',
}

export enum MetaIntegrationStatus {
  CONNECTED = 'CONNECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

export enum QualityRating {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
  UNKNOWN = 'UNKNOWN',
}

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum TemplateStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED',
  DISABLED = 'DISABLED',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  TEMPLATE = 'TEMPLATE',
  INTERACTIVE = 'INTERACTIVE',
  LOCATION = 'LOCATION',
}

export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// User context attached after JWT authentication & organization validation
export interface IAuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isPlatformAdmin: boolean;
}

export interface ITenantContext {
  organizationId: string;
  organizationName: string;
  role: UserRole;
  user: IAuthUser;
}

// Granular Permissions
export enum PermissionResource {
  ORGANIZATION = 'organization',
  MEMBERSHIP = 'membership',
  CREDENTIALS = 'credentials',
  CONTACTS = 'contacts',
  CAMPAIGNS = 'campaigns',
  TEMPLATES = 'templates',
  INBOX = 'inbox',
  WEBHOOKS = 'webhooks',
  AUTOMATIONS = 'automations',
  BILLING = 'billing',
  AUDIT_LOGS = 'audit_logs',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
}

// Role-to-Permissions Mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ['*'], // Full tenant administrative privileges
  [UserRole.ADMIN]: [
    'organization:read',
    'organization:update',
    'membership:*',
    'credentials:*',
    'contacts:*',
    'campaigns:*',
    'templates:*',
    'inbox:*',
    'webhooks:*',
    'automations:*',
    'audit_logs:read',
  ],
  [UserRole.MANAGER]: [
    'organization:read',
    'membership:read',
    'contacts:*',
    'campaigns:*',
    'templates:read',
    'templates:create',
    'inbox:*',
    'automations:*',
    'audit_logs:read',
  ],
  [UserRole.AGENT]: [
    'organization:read',
    'contacts:read',
    'contacts:create',
    'contacts:update',
    'templates:read',
    'inbox:*',
  ],
  [UserRole.ANALYST]: [
    'organization:read',
    'contacts:read',
    'campaigns:read',
    'templates:read',
    'inbox:read',
    'audit_logs:read',
  ],
};

export function hasPermission(role: UserRole, resource: PermissionResource, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes('*')) return true;
  if (permissions.includes(`${resource}:*`)) return true;
  return permissions.includes(`${resource}:${action}`);
}
