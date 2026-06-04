/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  User, 
  Service, 
  Order, 
  Ticket, 
  Transaction, 
  TicketReply, 
  Category, 
  Provider, 
  AuditLog, 
  PanelSettings, 
  Referral, 
  Commission, 
  Announcement,
  Notification
} from '../src/types';

// Let's load the Firebase configuration from the applet specs
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('[Sync Database] Failed to parse firebase-applet-config.json:', err);
}

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const fdb = getFirestore(firebaseApp, firebaseConfig?.firestoreDatabaseId);
export const auth = getAuth(firebaseApp);

const DB_FILE = path.join(process.cwd(), 'database_store.json');

// Interface to represent our Multi-Currency Wallet system
export interface Wallet {
  id: string; // Same as userId
  userId: string;
  USD: number;
  PKR: number;
  EUR: number;
  GBP: number;
  updatedAt: string;
}

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // Maps userId to password
  services: Service[];
  categories: Category[];
  providers: Provider[];
  auditLogs: AuditLog[];
  settings: PanelSettings;
  orders: Order[];
  tickets: Ticket[];
  transactions: Transaction[];
  referrals: Referral[];
  commissions: Commission[];
  announcements: Announcement[];
  wallets: Wallet[];
}

// Exchange rates conversion utility
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  PKR: 278.50,
  EUR: 0.92,
  GBP: 0.79
};

export function convertCurrency(amount: number, from: string, to: string): number {
  const fromRate = EXCHANGE_RATES[from.toUpperCase()] || 1.0;
  const toRate = EXCHANGE_RATES[to.toUpperCase()] || 1.0;
  
  // Convert to USD base first, then convert from USD to target currency
  const amountInUSD = amount / fromRate;
  return parseFloat((amountInUSD * toRate).toFixed(4));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Sync Database System] Conforming Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      passwords: {},
      services: [],
      categories: [],
      providers: [],
      auditLogs: [],
      settings: {
        panelName: 'MK SMM Panel',
        currency: 'USD',
        maintenanceMode: false,
        minDeposit: 5,
        maxDeposit: 10000,
        autoSyncServices: false,
        autoSyncIntervalHours: 6
      },
      orders: [],
      tickets: [],
      transactions: [],
      referrals: [],
      commissions: [],
      announcements: [],
      wallets: []
    };
    this.loadCache();
    this.initializeServerSession().finally(() => {
      this.setupSync();
    });
  }

  // Authenticate backend server session with Firestore using dedicated server-admin role
  private async initializeServerSession() {
    const email = 'server-admin@mksmm.com';
    const password = 'SuperSecureSMMServerAdmin2026!';
    try {
      console.log(`[Sync Database Engine] Attempting to sign in as dedicated backend credential user: ${email}...`);
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`[Sync Database Engine] Successfully authenticated backend server session as ${email}`);
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential' || 
        err.message?.includes('user-not-found') || 
        err.message?.includes('INVALID_LOGIN_CREDENTIALS')
      ) {
        console.log(`[Sync Database Engine] Server credentials account ${email} not found. Creating it...`);
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          console.log(`[Sync Database Engine] Created dedicated server credentials account ${email}`);
          
          // Seed the new server account user profile as an admin in Firestore
          const id = userCred.user.uid;
          const newProfile = {
            id,
            username: 'server_admin',
            email,
            role: 'admin',
            balance: 1000000,
            status: 'active',
            apiKey: 'mk_api_server_live_' + Math.random().toString(36).substr(2, 14),
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(fdb, 'users', id), newProfile);
          console.log('[Sync Database Engine] Saved default user profile for server credentials account');
        } catch (createErr: any) {
          console.error('[Sync Database Engine] Failed to create dedicated server account:', createErr.message);
        }
      } else {
        console.error('[Sync Database Engine] Unexpected authentication error during server boot:', err.message);
      }
    }
  }

  // Load local memory cache instantly to avoid blanks
  private loadCache() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);

        this.data = {
          users: parsed.users || [],
          passwords: parsed.passwords || {},
          services: parsed.services || [],
          categories: parsed.categories || [],
          providers: parsed.providers || [],
          auditLogs: parsed.auditLogs || [],
          settings: parsed.settings || {
            panelName: 'MK SMM Panel',
            currency: 'USD',
            maintenanceMode: false,
            minDeposit: 5,
            maxDeposit: 10000,
            autoSyncServices: false,
            autoSyncIntervalHours: 6
          },
          orders: parsed.orders || [],
          tickets: parsed.tickets || [],
          transactions: parsed.transactions || [],
          referrals: parsed.referrals || [],
          commissions: parsed.commissions || [],
          announcements: parsed.announcements || [],
          wallets: parsed.wallets || []
        };

        // Bootstrap SMMCTRL if not present in the loaded dataset
        const hasSmmctrl = this.data.providers.some(p => p.url && p.url.includes('smmctrl.com'));
        if (!hasSmmctrl) {
          const defaultProvider: Provider = {
            id: 'prov_smmctrl',
            name: 'SMMCTRL',
            apiType: 'smm',
            url: 'https://smmctrl.com/api/v2',
            apiKey: '',
            balance: 0,
            active: true,
            createdAt: new Date().toISOString()
          };
          this.data.providers.push(defaultProvider);
          this.persistDoc('providers', defaultProvider.id, defaultProvider);
          this.saveCache();
        }
      } else {
        // Seeding only raw default SMMCTRL provider setting (zero mock lists!)
        const defaultProvider: Provider = {
          id: 'prov_smmctrl',
          name: 'SMMCTRL',
          apiType: 'smm',
          url: 'https://smmctrl.com/api/v2',
          apiKey: '',
          balance: 0,
          active: true,
          createdAt: new Date().toISOString()
        };
        this.data.providers = [defaultProvider];
        this.persistDoc('providers', defaultProvider.id, defaultProvider);
        this.saveCache();
      }
    } catch (error) {
      console.error('[Sync Database] Failed to load database file cache:', error);
    }
  }

  private saveCache() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('[Sync Database] Failed to write database file cache:', error);
    }
  }

  // Real-time Cloud firestore bi-directional synchronization listeners
  private setupSync() {
    console.log('[Sync System] Starting real-time Firestore listeners on production tables...');

    // Helper to setup collection onSnapshot listener
    const syncCollection = (colName: string, mapFn: (doc: any) => any, setMemoryFn: (list: any[]) => void) => {
      try {
        onSnapshot(collection(fdb, colName), (snap) => {
          const list: any[] = [];
          snap.forEach((d) => {
            list.push(mapFn({ id: d.id, ...d.data() }));
          });
          setMemoryFn(list);
          this.saveCache();
        }, (err) => {
          console.error(`[Sync System] onSnapshot failed for ${colName}:`, err.message);
          handleFirestoreError(err, OperationType.GET, colName);
        });
      } catch (err: any) {
        console.error(`[Sync System] Failed to register onSnapshot for ${colName}:`, err.message);
        handleFirestoreError(err, OperationType.GET, colName);
      }
    };

    // 1. Users sync
    syncCollection('users', d => d, list => {
      this.data.users = list;
    });

    // 2. Wallets sync
    syncCollection('wallets', d => d, list => {
      this.data.wallets = list;
    });

    // 3. Transactions sync
    syncCollection('transactions', d => d, list => {
      this.data.transactions = list;
    });

    // 4. Orders sync
    syncCollection('orders', d => d, list => {
      this.data.orders = list;
    });

    // 5. Providers sync
    syncCollection('providers', d => d, list => {
      const hasSmmctrl = list.some(p => p.url && p.url.includes('smmctrl.com'));
      if (!hasSmmctrl) {
        const defaultProvider: Provider = {
          id: 'prov_smmctrl',
          name: 'SMMCTRL',
          apiType: 'smm',
          url: 'https://smmctrl.com/api/v2',
          apiKey: '',
          balance: 0,
          active: true,
          createdAt: new Date().toISOString()
        };
        list.push(defaultProvider);
        this.persistDoc('providers', defaultProvider.id, defaultProvider);
      }
      this.data.providers = list;
    });

    // 6. Services sync
    syncCollection('services', d => d, list => {
      this.data.services = list;
    });

    // 7. Tickets sync
    syncCollection('tickets', d => d, list => {
      this.data.tickets = list;
    });

    // 8. Categories sync
    syncCollection('categories', d => d, list => {
      this.data.categories = list;
    });

    // 9. Referrals sync
    syncCollection('referrals', d => d, list => {
      this.data.referrals = list;
    });

    // 10. Commissions sync
    syncCollection('commissions', d => d, list => {
      this.data.commissions = list;
    });

    // 11. Announcements sync
    syncCollection('announcements', d => d, list => {
      this.data.announcements = list;
    });

    // 12. AuditLogs sync (using auditLogs collection)
    syncCollection('auditLogs', d => d, list => {
      this.data.auditLogs = list;
    });

    // 13. Settings sync (single document)
    try {
      onSnapshot(doc(fdb, 'settings', 'panel_config'), (snap) => {
        if (snap.exists()) {
          this.data.settings = snap.data() as PanelSettings;
          this.saveCache();
        } else {
          // If Firestore settings is missing, deploy cached / defaults
          this.updateSettings(this.data.settings);
        }
      }, (err) => {
        console.error('[Sync System] Settings listener error:', err.message);
        handleFirestoreError(err, OperationType.GET, 'settings/panel_config');
      });
    } catch (err: any) {
      console.error('[Sync System] Failed to bind settings listener:', err.message);
    }

    // 14. Passwords mapping sync
    syncCollection('passwords_legacy', d => d, list => {
      const records: Record<string, string> = {};
      list.forEach(item => {
        if (item.userId) {
          records[item.userId] = item.passwordVal || '';
        }
      });
      this.data.passwords = records;
    });
  }

  // Quick async Firestore persist wrapper
  private async persistDoc(colName: string, id: string, docData: any) {
    try {
      await setDoc(doc(fdb, colName, id), docData);
    } catch (err: any) {
      console.error(`[Sync Database System] Failed to persist ${colName}/${id}:`, err.message);
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${id}`);
    }
  }

  private async removeDoc(colName: string, id: string) {
    try {
      await deleteDoc(doc(fdb, colName, id));
    } catch (err: any) {
      console.error(`[Sync Database System] Failed to delete ${colName}/${id}:`, err.message);
      handleFirestoreError(err, OperationType.DELETE, `${colName}/${id}`);
    }
  }

  // --- DATABASE HELPER INTERFACES (Mapped perfectly to original calls) ---

  // User Operations
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserByApiKey(apiKey: string): User | undefined {
    return this.data.users.find(u => u.apiKey === apiKey);
  }

  getPasswordForUser(userId: string): string | undefined {
    return this.data.passwords[userId];
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'apiKey'>, passwordVal: string): User {
    const id = 'u_' + Math.random().toString(36).substr(2, 9);
    const newUser: User = {
      ...user,
      id,
      apiKey: 'mk_api_live_' + Math.random().toString(36).substr(2, 14),
      createdAt: new Date().toISOString(),
      balance: 0,
      currency: 'PKR'
    };

    this.data.users.push(newUser);
    this.data.passwords[id] = passwordVal;
    
    // Save User Profile to Firestore
    this.persistDoc('users', id, newUser);
    this.persistDoc('passwords_legacy', id, { userId: id, passwordVal });

    // Initialize multi-currency wallet in Firestore automatically
    const initialWallet = {
      id,
      userId: id,
      USD: 0,
      PKR: 0,
      EUR: 0,
      GBP: 0,
      currency: 'PKR',
      updatedAt: new Date().toISOString()
    };
    this.persistDoc('wallets', id, initialWallet);
    if (!this.data.wallets) this.data.wallets = [];
    this.data.wallets.push(initialWallet);

    // Create an initial Transaction Log in registration history
    const initTx = {
      userId: id,
      username: newUser.username,
      amount: 0,
      method: 'System (Wallet Activation)',
      status: 'completed' as const,
      type: 'deposit' as const,
      senderDetails: 'Registration & PKR Wallet Online Protocol',
      adminNotes: 'Welcome to MK SMM Panel. Your account is online and your mobile wallet is linked.'
    };
    this.createTransaction(initTx);

    // Track in system audit ledger
    this.createAuditLog({
      userId: id,
      username: newUser.username,
      action: 'REGISTER_SUCCESS',
      details: `User created successfully with default PKR preferred currency, zero starting balance, and active wallet.`
    });

    this.saveCache();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    
    const originalUser = this.data.users[idx];
    const updatedUser = { ...originalUser, ...updates };
    this.data.users[idx] = updatedUser;
    
    // Persist user to Firestore
    this.persistDoc('users', id, updatedUser);

    // If balance was modified, reflect it globally in the multi-currency wallets table
    if (updates.balance !== undefined) {
      const USD = updates.balance;
      const PKR = convertCurrency(USD, 'USD', 'PKR');
      const EUR = convertCurrency(USD, 'USD', 'EUR');
      const GBP = convertCurrency(USD, 'USD', 'GBP');

      this.persistDoc('wallets', id, {
        id,
        userId: id,
        USD,
        PKR,
        EUR,
        GBP,
        updatedAt: new Date().toISOString()
      });
    }

    this.saveCache();
    return updatedUser;
  }

  // Service Operations
  getServices(): Service[] {
    return this.data.services;
  }

  getServiceById(id: string): Service | undefined {
    return this.data.services.find(s => s.id === id);
  }

  createService(service: Omit<Service, 'id'>): Service {
    const id = 's' + (this.data.services.length + 1) + '_' + Math.random().toString(36).substr(2, 5);
    const newService: Service = { ...service, id };
    this.data.services.push(newService);
    
    // Persist to Firestore
    this.persistDoc('services', id, newService);

    this.saveCache();
    return newService;
  }

  updateService(id: string, updates: Partial<Service>): Service | undefined {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    
    const updated = { ...this.data.services[idx], ...updates };
    this.data.services[idx] = updated;
    
    // Persist to Firestore
    this.persistDoc('services', id, updated);

    this.saveCache();
    return updated;
  }

  deleteService(id: string): boolean {
    const originalLen = this.data.services.length;
    this.data.services = this.data.services.filter(s => s.id !== id);
    
    // Remove from Firestore
    this.removeDoc('services', id);

    this.saveCache();
    return this.data.services.length < originalLen;
  }

  // Order Operations
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  createOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
    const id = 'o_' + Math.floor(100 + Math.random() * 900) + '_' + Math.random().toString(36).substr(2, 4);
    const newOrder: Order = {
      ...order,
      id,
      createdAt: new Date().toISOString()
    };
    this.data.orders.push(newOrder);
    
    // Persist to Firestore
    this.persistDoc('orders', id, newOrder);

    this.saveCache();
    return newOrder;
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return undefined;
    
    const updated = { ...this.data.orders[idx], ...updates };
    this.data.orders[idx] = updated;
    
    // Persist to Firestore
    this.persistDoc('orders', id, updated);

    this.saveCache();
    return updated;
  }

  // Support Ticket Operations
  getTickets(): Ticket[] {
    return this.data.tickets;
  }

  getTicketById(id: string): Ticket | undefined {
    return this.data.tickets.find(t => t.id === id);
  }

  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'replies'>): Ticket {
    const id = 't_' + Math.floor(1000 + Math.random() * 9000);
    const newTicket: Ticket = {
      ...ticket,
      id,
      replies: [],
      createdAt: new Date().toISOString()
    };
    this.data.tickets.push(newTicket);
    
    // Persist to Firestore
    this.persistDoc('tickets', id, newTicket);

    this.saveCache();
    return newTicket;
  }

  addTicketReply(ticketId: string, reply: Omit<TicketReply, 'id' | 'createdAt'>): TicketReply | undefined {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return undefined;

    const id = 'tr_' + Math.random().toString(36).substr(2, 9);
    const newReply: TicketReply = {
      ...reply,
      id,
      createdAt: new Date().toISOString()
    };

    ticket.replies.push(newReply);
    ticket.status = reply.role === 'admin' ? 'answered' : 'open';
    
    // Persist updated Ticket with Replies to Firestore
    this.persistDoc('tickets', ticketId, ticket);

    this.saveCache();
    return newReply;
  }

  updateTicketStatus(id: string, status: 'open' | 'answered' | 'closed'): Ticket | undefined {
    const t = this.getTicketById(id);
    if (!t) return undefined;
    t.status = status;
    
    // Persist to Firestore
    this.persistDoc('tickets', id, t);

    this.saveCache();
    return t;
  }

  // Transaction API
  getTransactions(): Transaction[] {
    return this.data.transactions;
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.data.transactions.find(t => t.id === id);
  }

  createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const id = 'tx_' + Math.floor(100000 + Math.random() * 900000);
    const newTx: Transaction = {
      ...tx,
      id,
      createdAt: new Date().toISOString()
    };
    this.data.transactions.push(newTx);
    
    // Persist transaction to Firestore
    this.persistDoc('transactions', id, newTx);

    this.saveCache();
    return newTx;
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | undefined {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    
    const updated = { ...this.data.transactions[idx], ...updates };
    this.data.transactions[idx] = updated;
    
    // Persist to Firestore
    this.persistDoc('transactions', id, updated);

    this.saveCache();
    return updated;
  }

  // Category operations
  getCategories(): Category[] {
    return this.data.categories || [];
  }

  createCategory(category: Omit<Category, 'id'>): Category {
    const id = 'cat_' + Math.random().toString(36).substr(2, 9);
    const newCategory: Category = { ...category, id };
    if (!this.data.categories) this.data.categories = [];
    this.data.categories.push(newCategory);
    
    // Persist category to Firestore
    this.persistDoc('categories', id, newCategory);

    this.saveCache();
    return newCategory;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    
    const updated = { ...this.data.categories[idx], ...updates };
    this.data.categories[idx] = updated;
    
    // Persist category to Firestore
    this.persistDoc('categories', id, updated);

    this.saveCache();
    return updated;
  }

  deleteCategory(id: string): boolean {
    const originalLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    
    // Delete category from register
    this.removeDoc('categories', id);

    this.saveCache();
    return this.data.categories.length < originalLen;
  }

  // Provider operations
  getProviders(): Provider[] {
    return this.data.providers || [];
  }

  createProvider(provider: Omit<Provider, 'id' | 'createdAt'>): Provider {
    const id = 'prov_' + Math.random().toString(36).substr(2, 9);
    const newProvider: Provider = { ...provider, id, createdAt: new Date().toISOString() };
    if (!this.data.providers) this.data.providers = [];
    this.data.providers.push(newProvider);
    
    // Persist to Firestore
    this.persistDoc('providers', id, newProvider);

    this.saveCache();
    return newProvider;
  }

  updateProvider(id: string, updates: Partial<Provider>): Provider | undefined {
    const idx = this.data.providers.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    
    const updated = { ...this.data.providers[idx], ...updates };
    this.data.providers[idx] = updated;
    
    // Persist to Firestore
    this.persistDoc('providers', id, updated);

    this.saveCache();
    return updated;
  }

  deleteProvider(id: string): boolean {
    const originalLen = this.data.providers.length;
    this.data.providers = this.data.providers.filter(p => p.id !== id);
    
    // Remove from Firestore list
    this.removeDoc('providers', id);

    this.saveCache();
    return this.data.providers.length < originalLen;
  }

  // Settings operations
  getSettings(): PanelSettings {
    return this.data.settings || {
      panelName: 'MK SMM Panel',
      currency: 'USD',
      maintenanceMode: false,
      minDeposit: 5,
      maxDeposit: 10000,
      autoSyncServices: false,
      autoSyncIntervalHours: 6
    };
  }

  updateSettings(updates: Partial<PanelSettings>): PanelSettings {
    const updated = { ...this.getSettings(), ...updates };
    this.data.settings = updated;
    
    // Persist settings directly in document 'panel_config' inside 'settings' collection
    this.persistDoc('settings', 'panel_config', updated);

    this.saveCache();
    return updated;
  }

  // Audit Logs operations
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs || [];
  }

  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const id = 'log_' + Math.random().toString(36).substr(2, 9);
    const newLog: AuditLog = { ...log, id, createdAt: new Date().toISOString() };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.push(newLog);
    
    // Save to Firestore
    this.persistDoc('auditLogs', id, newLog);

    this.saveCache();
    return newLog;
  }

  // Referral Operations
  getReferrals(): Referral[] {
    return this.data.referrals || [];
  }

  getReferralsByReferrer(referrerId: string): Referral[] {
    return this.getReferrals().filter(r => r.referrerId === referrerId);
  }

  createReferral(referral: Omit<Referral, 'id' | 'createdAt' | 'commissionsEarned'>): Referral {
    const id = 'ref_' + Math.random().toString(36).substr(2, 9);
    const newReferral: Referral = {
      ...referral,
      id,
      createdAt: new Date().toISOString(),
      commissionsEarned: 0
    };
    if (!this.data.referrals) this.data.referrals = [];
    this.data.referrals.push(newReferral);
    
    // Persist to register
    this.persistDoc('referrals', id, newReferral);

    // Update referral count on referrer
    const referrer = this.getUserById(referral.referrerId);
    if (referrer) {
      this.updateUser(referral.referrerId, {
        referralCount: (referrer.referralCount || 0) + 1
      });
    }

    this.saveCache();
    return newReferral;
  }

  // Commission Operations
  getCommissions(): Commission[] {
    return this.data.commissions || [];
  }

  getCommissionsByReferrer(referrerId: string): Commission[] {
    return this.getCommissions().filter(c => c.referrerId === referrerId);
  }

  createCommission(commission: Omit<Commission, 'id' | 'createdAt'>): Commission {
    const id = 'comm_' + Math.random().toString(36).substr(2, 9);
    const newCommission: Commission = {
      ...commission,
      id,
      createdAt: new Date().toISOString()
    };
    if (!this.data.commissions) this.data.commissions = [];
    this.data.commissions.push(newCommission);

    // Persist commission to Firestore
    this.persistDoc('commissions', id, newCommission);

    // Update referrer balance and earnings accumulator
    const referrer = this.getUserById(commission.referrerId);
    if (referrer) {
      const newEarnings = parseFloat(((referrer.referralEarnings || 0) + commission.commissionAmount).toFixed(4));
      const newRefBalance = parseFloat((referrer.balance + commission.commissionAmount).toFixed(4));
      this.updateUser(commission.referrerId, {
        balance: newRefBalance,
        referralEarnings: newEarnings
      });

      // Update the commissionsEarned counter on the specific Referral document
      if (this.data.referrals) {
        const refLinkIdx = this.data.referrals.findIndex(r => r.referrerId === commission.referrerId && r.referredId === commission.referredId);
        if (refLinkIdx !== -1) {
          const updatedRef = {
            ...this.data.referrals[refLinkIdx],
            commissionsEarned: parseFloat((this.data.referrals[refLinkIdx].commissionsEarned + commission.commissionAmount).toFixed(4))
          };
          this.data.referrals[refLinkIdx] = updatedRef;
          
          // Persist changed referral link
          this.persistDoc('referrals', updatedRef.id, updatedRef);
        }
      }
    }

    this.saveCache();
    return newCommission;
  }

  // Announcement Operations
  getAnnouncements(): Announcement[] {
    return this.data.announcements || [];
  }

  createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Announcement {
    const id = 'ann_' + Math.random().toString(36).substr(2, 9);
    const newAnnouncement: Announcement = { ...announcement, id, createdAt: new Date().toISOString() };
    if (!this.data.announcements) this.data.announcements = [];
    this.data.announcements.push(newAnnouncement);
    
    // Persist to register
    this.persistDoc('announcements', id, newAnnouncement);

    this.saveCache();
    return newAnnouncement;
  }

  deleteAnnouncement(id: string): boolean {
    if (!this.data.announcements) return false;
    const len = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    
    // Remove from Firestore
    this.removeDoc('announcements', id);

    this.saveCache();
    return this.data.announcements.length < len;
  }

  // Notification operations
  createNotification(notif: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const id = 'notif_' + Math.floor(100000 + Math.random() * 900000);
    const newNotif: Notification = {
      ...notif,
      id,
      createdAt: new Date().toISOString()
    };
    // Persist directly to Firestore notifications collection
    this.persistDoc('notifications', id, newNotif);
    return newNotif;
  }
}

export const db = new Database();
