/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'superadmin' | 'admin' | 'user';
export type OrderStatus = 'pending' | 'processing' | 'in_progress' | 'completed' | 'partial' | 'canceled';
export type TicketStatus = 'open' | 'answered' | 'closed';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  currency?: string;
  status: 'active' | 'suspended';
  apiKey: string;
  createdAt: string;
  referredBy?: string;
  referralEarnings?: number;
  referralCount?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  rate: number; // Price per 1000 items
  min: number;
  max: number;
  description: string;
  active: boolean;
  refill?: boolean;
  cancel?: boolean;
  providerId?: string; // Linked provider node ID
  originalServiceId?: string; // Service ID in provider API
  providerPrice?: number;     // Original price from provider API
  customerPrice?: number;     // Marked-up price for customer (same as rate)
  profitAmount?: number;      // Calculated profit per 1000 items
}

export interface Order {
  id: string;
  userId: string;
  username?: string; // Hydrated
  serviceId: string;
  serviceName?: string; // Hydrated
  category?: string; // Hydrated
  link: string;
  quantity: number;
  charge: number;
  startCount: number;
  remains: number;
  status: OrderStatus;
  createdAt: string;
  providerPrice?: number;     // Provider rate per 1000 items at time of placement
  providerCost?: number;      // Wholesale cost for this specific order
  profit?: number;            // Computed net profit for this order
}

export interface TicketReply {
  id: string;
  userId: string;
  username: string;
  role: UserRole;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  username?: string; // Hydrated
  subject: string;
  message: string;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  username?: string; // Hydrated
  amount: number;
  method: string;
  status: TransactionStatus;
  createdAt: string;
  type?: 'deposit' | 'withdrawal'; // 'deposit' or 'withdrawal'
  senderDetails?: string; // Transaction hash, sending account, etc.
  adminNotes?: string; // Approval or rejection commentary
  screenshotUrl?: string; // SMM payment confirmation receipt upload
}

export interface DashboardStats {
  totalSpent: number;
  totalOrders: number;
  activeOrders: number;
  balance: number;
  ticketCount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalProfit: number;
  totalOrders: number;
  pendingOrders: number;
  openTickets: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  apiType: 'smm' | 'other';
  url: string;
  apiKey: string;
  balance: number;
  active: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface PanelSettings {
  panelName: string;
  currency: string;
  maintenanceMode: boolean;
  minDeposit: number;
  maxDeposit: number;
  autoSyncServices?: boolean;
  autoSyncIntervalHours?: number;
  lastSyncTime?: string;
  markupPercent?: number;     // Percentage markup (e.g., 30 for 30%)
  markupFixed?: number;       // Fixed dollar markup (e.g., 0.20)
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referredUsername: string;
  referredEmail: string;
  createdAt: string;
  commissionsEarned: number;
}

export interface Commission {
  id: string;
  referrerId: string;
  referredId: string;
  referredUsername: string;
  transactionId: string;
  transactionAmount: number;
  commissionAmount: number;
  createdAt: string;
  status?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

