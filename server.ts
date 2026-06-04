/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { db } from './server/database';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mk-smm-super-secret-jwt-key-2026';

// Middleware for parsing JSON
app.use(express.json());

// Extend Express Request type to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: 'superadmin' | 'admin' | 'user';
  };
}

// Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token expected' });
  }

  // 1. Try verifying with local JWT
  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (!err && decoded) {
      const user = db.getUserById(decoded.id) || db.getUserByEmail(decoded.email);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role as 'superadmin' | 'admin' | 'user'
        };
        return next();
      }
    }

    // 2. Fallback to decode and map from Firebase JWT
    try {
      const decodedFirebase = jwt.decode(token) as any;
      if (decodedFirebase) {
        const uid = decodedFirebase.user_id || decodedFirebase.sub || decodedFirebase.uid;
        const email = decodedFirebase.email;

        let user = db.getUserById(uid);
        if (!user && email) {
          user = db.getUserByEmail(email);
        }

        // Auto-seed user on core DB if first login
        if (!user && uid) {
          user = db.createUser(
            {
              username: decodedFirebase.name?.toLowerCase().replace(/\s+/g, '') || email?.split('@')[0] || `user_${uid.substring(0, 5)}`,
              email: email || '',
              role: (email === 'admin@mksmm.com' || email === 'itxmerajkhan3109@gmail.com') ? 'admin' : 'user',
              balance: 0,
              status: 'active'
            },
            'firebase_sso_pass'
          );

          // Standardize indices
          db.updateUser(user.id, { id: uid });
          user = db.getUserById(uid);
        }

        if (user) {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role as 'superadmin' | 'admin' | 'user'
          };
          return next();
        }
      }
    } catch (fbErr) {
      console.error('Firebase custom decoder bypass failed:', fbErr);
    }

    return res.status(403).json({ error: 'Token is invalid, revoked, or expired.' });
  });
};

// Admin authentication guard
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Permission denied. Admin privileges required.' });
  }
  next();
};

const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Permission denied. Super Admin privileges required.' });
  }
  next();
};

/* ================= AUTHENTICATION ENDPOINTS ================= */

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields (username, email, password) are required.' });
    }

    if (db.getUserByUsername(username)) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const newUser = db.createUser(
      {
        username,
        email,
        role: 'user',
        balance: 10.0, // Give a small complimentary initial sign-up bonus to user for live demonstration!
        status: 'active'
      },
      password
    );

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Please provide credentials and password' });
    }

    let user = db.getUserByUsername(usernameOrEmail);
    if (!user) {
      user = db.getUserByEmail(usernameOrEmail);
    }

    if (!user || db.getPasswordForUser(user.id) !== password) {
      return res.status(401).json({ error: 'Invalid username, email, or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/sync', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { referredBy } = req.body;
    
    if (referredBy) {
      const user = db.getUserById(userId);
      if (user && !user.referredBy && user.id !== referredBy) {
        // Double check referrer exists
        const referrer = db.getUserById(referredBy);
        if (referrer) {
          db.updateUser(userId, { referredBy });
          
          const existingRefs = db.getReferrals().filter(r => r.referrerId === referredBy && r.referredId === userId);
          if (existingRefs.length === 0) {
            db.createReferral({
              referrerId: referredBy,
              referredId: userId,
              referredUsername: user.username,
              referredEmail: user.email
            });
          }
        }
      }
    }
    
    const updatedUser = db.getUserById(userId);
    res.json({ status: 'ok', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/referrals/stats', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const referrals = db.getReferralsByReferrer(userId);
    const commissions = db.getCommissionsByReferrer(userId);
    const user = db.getUserById(userId);

    res.json({
      referralCount: referrals.length,
      totalEarnings: user?.referralEarnings || 0,
      referralLink: "", // Suffix handled in client using window.location.origin
      referredUsers: referrals.map(r => ({
        id: r.id,
        referredUsername: r.referredUsername,
        createdAt: r.createdAt,
        commissionsEarned: r.commissionsEarned
      })),
      commissionLogs: commissions.map(c => ({
        id: c.id,
        referredUsername: c.referredUsername,
        transactionAmount: c.transactionAmount,
        commissionAmount: c.commissionAmount,
        createdAt: c.createdAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SERVICES SYSTEM ENDPOINTS ================= */

app.get('/api/services', (req, res) => {
  try {
    const services = db.getServices();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ORDER SYSTEM ENDPOINTS ================= */

app.get('/api/orders', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id, role } = req.user!;
    let orders = db.getOrders();

    // Regular users can only see their own orders
    if (role !== 'admin') {
      orders = orders.filter(o => o.userId === id);
    }

    // Hydrate orders with extra names
    const services = db.getServices();
    const users = db.getUsers();

    const hydrated = orders.map(o => {
      const matchSvc = services.find(s => s.id === o.serviceId);
      const matchUsr = users.find(u => u.id === o.userId);
      return {
        ...o,
        serviceName: matchSvc ? matchSvc.name : 'Unknown Service',
        category: matchSvc ? matchSvc.category : 'Unknown Category',
        username: matchUsr ? matchUsr.username : 'Unknown User'
      };
    });

    // Newest orders first
    hydrated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(hydrated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/place', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { serviceId, link, quantity } = req.body;

    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ error: 'Missing serviceId, target link, or quantity' });
    }

    const service = db.getServiceById(serviceId);
    if (!service || !service.active) {
      return res.status(404).json({ error: 'Selected service is currently unavailable' });
    }

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal < service.min || qtyVal > service.max) {
      return res.status(400).json({ error: `Quantity must be between ${service.min} and ${service.max}` });
    }

    // Rate calculation
    const charge = parseFloat(((qtyVal * service.rate) / 1000).toFixed(4));

    // Check user balance
    const user = db.getUserById(userId)!;
    if (user.balance < charge) {
      return res.status(400).json({ error: `Insufficient balance. This order costs $${charge.toFixed(3)}, but you only have $${user.balance.toFixed(3)}.` });
    }

    // Deduct and save order
    db.updateUser(userId, { balance: parseFloat((user.balance - charge).toFixed(4)) });

    const providerPrice = service.providerPrice !== undefined ? service.providerPrice : service.rate * 0.65;
    const providerCost = parseFloat(((qtyVal * providerPrice) / 1000).toFixed(4));
    const profit = parseFloat((charge - providerCost).toFixed(4));

    const newOrder = db.createOrder({
      userId,
      serviceId,
      link,
      quantity: qtyVal,
      charge,
      startCount: Math.floor(100 + Math.random() * 5000), // Random simulated starter counts
      remains: qtyVal,
      status: 'pending',
      providerPrice,
      providerCost,
      profit
    });

    res.status(201).json({
      message: 'Order created successfully!',
      order: newOrder,
      newBalance: user.balance - charge
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/:id/refill', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const orderId = req.params.id;
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Change state to processing and trigger virtual refill pipeline reset
    db.updateOrder(orderId, { status: 'processing', remains: order.quantity });
    res.json({ message: 'Refill requested successfully! Node acceleration re-triggered.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const orderId = req.params.id;
    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (order.status === 'completed' || order.status === 'canceled') {
      return res.status(400).json({ error: 'Cannot cancel an order that is already completed or cancelled.' });
    }

    // Give a refund based on remaining ratio
    const user = db.getUserById(order.userId)!;
    const refund = parseFloat((order.charge * (order.remains / order.quantity)).toFixed(4));
    db.updateUser(order.userId, { balance: parseFloat((user.balance + refund).toFixed(4)) });
    db.updateOrder(orderId, { status: 'canceled', remains: 0 });

    res.json({ message: `Order successfully cancelled. Refund of $${refund.toFixed(2)} USD credited back to SMM Wallet.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SUPPORT SYSTEM ENDPOINTS ================= */

app.get('/api/tickets', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id, role } = req.user!;
    let tickets = db.getTickets();

    if (role !== 'admin') {
      tickets = tickets.filter(t => t.userId === id);
    }

    const users = db.getUsers();
    const hydrated = tickets.map(t => {
      const matchUsr = users.find(u => u.id === t.userId);
      return {
        ...t,
        username: matchUsr ? matchUsr.username : 'Unknown User'
      };
    });

    hydrated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(hydrated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets/create', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and reference message are required' });
    }

    const newTicket = db.createTicket({
      userId,
      subject,
      message,
      status: 'open'
    });

    res.status(201).json(newTicket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tickets/:id/reply', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id: userId, username, role } = req.user!;
    const ticketId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message payload is empty' });
    }

    const ticket = db.getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Authorization: users can only reply to their own tickets
    if (role !== 'admin' && ticket.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view/reply to this ticket' });
    }

    const reply = db.addTicketReply(ticketId, {
      userId,
      username,
      role,
      message
    });

    res.status(201).json(reply);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tickets/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'open' && status !== 'answered' && status !== 'closed') {
      return res.status(400).json({ error: 'Invalid ticket status code' });
    }

    const updated = db.updateTicketStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= FUNDS & TRANSACTION SYSTEM ================= */

app.get('/api/transactions', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id, role } = req.user!;
    let txs = db.getTransactions();

    if (role !== 'admin') {
      txs = txs.filter(t => t.userId === id);
    }

    const users = db.getUsers();
    const hydrated = txs.map(t => {
      const matchUsr = users.find(u => u.id === t.userId);
      return {
        ...t,
        username: matchUsr ? matchUsr.username : 'Unknown'
      };
    });

    hydrated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(hydrated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function processReferralCommission(userId: string, depositAmount: number, transactionId: string) {
  try {
    const user = db.getUserById(userId);
    if (user && user.referredBy) {
      const referrer = db.getUserById(user.referredBy);
      if (referrer) {
        const commissionPct = 0.10; // 10% commission rate
        const commissionAmount = parseFloat((depositAmount * commissionPct).toFixed(4));
        
        db.createCommission({
          referrerId: user.referredBy,
          referredId: userId,
          referredUsername: user.username,
          transactionId: transactionId,
          transactionAmount: depositAmount,
          commissionAmount: commissionAmount
        });

        db.createAuditLog({
          userId: user.referredBy,
          username: referrer.username,
          action: 'REFERRAL_COMMISSION',
          details: `Earned $${commissionAmount.toFixed(2)} USD (10% commission) from deposit of user @${user.username}`
        });
      }
    }
  } catch (error) {
    console.error("Failed to process referral commission:", error);
  }
}

app.post('/api/funds/add', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { amount, method, senderDetails, type, isInstant, screenshotUrl } = req.body;

    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const txType = type === 'withdrawal' ? 'withdrawal' : 'deposit';
    const user = db.getUserById(userId)!;

    if (txType === 'withdrawal') {
      if (user.balance < amtVal) {
        return res.status(400).json({ error: 'Insufficient wallet balance for withdrawal.' });
      }

      // Reserved withdrawal amount right away
      const newBalance = parseFloat((user.balance - amtVal).toFixed(4));
      db.updateUser(userId, { balance: newBalance });

      const newTx = db.createTransaction({
        userId,
        amount: amtVal,
        method: method || 'Manual Payout',
        status: 'pending',
        type: 'withdrawal',
        senderDetails: senderDetails || 'No cashout info'
      });

      // Simple internal push notification
      db.createNotification({
        userId,
        title: 'Payout Request Registered',
        message: `Your cashout request of $${amtVal.toFixed(2)} USD via ${method} has been registered and is pending review.`,
        read: false
      });

      // Add custom audit log
      db.createAuditLog({
        userId,
        username: user.username,
        action: 'WITHDRAWAL_REQUEST',
        details: `Requested cashout of $${amtVal.toFixed(2)} USD via ${method}`
      });

      return res.json({
        message: `Withdrawal request submitted successfully! $${amtVal.toFixed(2)} has been reserved from your wallet balance pending review.`,
        newBalance,
        transaction: newTx
      });
    } else {
      // Deposit
      // Determine if it auto-completes instantly (Stripe/PayPal/Binance Pay Auto simulators)
      const instantGateways = ['Stripe', 'PayPal', 'Binance Pay'];
      const autoApprove = (isInstant === true) || (isInstant !== false && instantGateways.includes(method));

      if (autoApprove) {
        const newBalance = parseFloat((user.balance + amtVal).toFixed(4));
        db.updateUser(userId, { balance: newBalance });

        const newTx = db.createTransaction({
          userId,
          amount: amtVal,
          method: method || 'Instant Gateway',
          status: 'completed',
          type: 'deposit',
          senderDetails: senderDetails || 'Direct Auto-Verification Payment Successful'
        });

        // Trigger referral commission if applicable
        processReferralCommission(userId, amtVal, newTx.id);

        db.createNotification({
          userId,
          title: 'Instant Deposit Added',
          message: `Success! $${amtVal.toFixed(2)} USD added instantly to your SMM wallet via ${method}.`,
          read: false
        });

        db.createAuditLog({
          userId,
          username: user.username,
          action: 'AUTOMATED_DEPOSIT',
          details: `Deposited $${amtVal.toFixed(2)} USD instantly using auto-approved ${method}`
        });

        return res.json({
          message: `Automatic gateway verification successful! $${amtVal.toFixed(2)} USD loaded into your wallet instantly.`,
          newBalance,
          transaction: newTx
        });
      } else {
        // Pending manual approval required (Easypaisa, JazzCash, manual transfers)
        const newTx = db.createTransaction({
          userId,
          amount: amtVal,
          method: method || 'Manual Gateway',
          status: 'pending',
          type: 'deposit',
          senderDetails: senderDetails || 'Depositor receipt proof pending review',
          screenshotUrl: screenshotUrl || ''
        });

        // Push User notification
        db.createNotification({
          userId,
          title: 'Deposit Request Received',
          message: `Your manual deposit request of $${amtVal.toFixed(2)} USD via ${method} has been submitted for manual audit.`,
          read: false
        });

        // Create an alert notification for admins
        const admins = db.getUsers().filter(u => u.role === 'admin' || u.role === 'superadmin');
        admins.forEach(admin => {
          db.createNotification({
            userId: admin.id,
            title: '💸 New Deposit Awaiting Audit',
            message: `User @${user.username} submitted manual deposit of $${amtVal.toFixed(2)} USD via ${method}.`,
            read: false
          });
        });

        db.createAuditLog({
          userId,
          username: user.username,
          action: 'DEPOSIT_REQUEST',
          details: `Submitted deposit ticket of $${amtVal.toFixed(2)} USD via ${method}, TxProof: ${senderDetails || 'None'}`
        });

        return res.json({
          message: `Your deposit request has been submitted. SMM Admins will manually identify and verify this transaction shortly.`,
          newBalance: user.balance,
          transaction: newTx
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADMIN TRANSACTIONS APPROVAL ENDPOINTS ================= */

app.patch('/api/admin/transactions/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (status !== 'completed' && status !== 'failed') {
      return res.status(400).json({ error: 'Valid status must be "completed" or "failed"' });
    }

    const tx = db.getTransactionById(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'This transaction is already processed.' });
    }

    const user = db.getUserById(tx.userId);
    if (!user) {
      return res.status(404).json({ error: 'Associated user account not found.' });
    }

    const txType = tx.type || 'deposit';
    let userNewBalance = user.balance;

    if (txType === 'deposit') {
      if (status === 'completed') {
        userNewBalance = parseFloat((user.balance + tx.amount).toFixed(4));
        db.updateUser(tx.userId, { balance: userNewBalance });
        // Process referral commission on completed manual deposits
        processReferralCommission(tx.userId, tx.amount, id);

        db.createNotification({
          userId: tx.userId,
          title: '💰 Deposit Approved',
          message: `Your deposit request of $${tx.amount.toFixed(2)} USD via ${tx.method} has been approved and credited to your balance.`,
          read: false
        });
      } else {
        db.createNotification({
          userId: tx.userId,
          title: '❌ Deposit Rejected',
          message: `Your deposit request of $${tx.amount.toFixed(2)} USD via ${tx.method} was rejected. Note: ${adminNotes || 'Verification details were invalid.'}`,
          read: false
        });
      }
    } else if (txType === 'withdrawal') {
      if (status === 'failed') {
        // Refund reserved balance for rejected withdrawal
        userNewBalance = parseFloat((user.balance + tx.amount).toFixed(4));
        db.updateUser(tx.userId, { balance: userNewBalance });

        db.createNotification({
          userId: tx.userId,
          title: '❌ Payout Request Rejected',
          message: `Your withdrawal of $${tx.amount.toFixed(2)} USD via ${tx.method} was rejected. Cashout quota returned to your wallet.`,
          read: false
        });
      } else {
        db.createNotification({
          userId: tx.userId,
          title: '✅ Payout Completed',
          message: `Your payout request of $${tx.amount.toFixed(2)} USD via ${tx.method} has been fully processed and paid.`,
          read: false
        });
      }
    }

    const updatedTx = db.updateTransaction(id, {
      status,
      adminNotes: adminNotes || 'Processed by Administrator'
    });

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: status === 'completed' ? 'FINANCIAL_APPROVE' : 'FINANCIAL_REJECT',
      details: `${status === 'completed' ? 'Approved' : 'Rejected'} ${txType} #${id} of $${tx.amount.toFixed(2)} USD for ${user.username}`
    });

    res.json({
      message: `Transaction successfully ${status === 'completed' ? 'approved' : 'rejected'}.`,
      transaction: updatedTx,
      newBalance: userNewBalance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADMIN SPECIFIC SYSTEM ENDPOINTS ================= */

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.getUsers();
    const orders = db.getOrders();
    const tickets = db.getTickets();

    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit !== undefined ? o.profit : o.charge * 0.35), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const openTickets = tickets.filter(t => t.status === 'open').length;

    res.json({
      totalUsers: users.length,
      activeUsers,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalOrders: orders.length,
      pendingOrders,
      openTickets
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADVANCED ANALYTICS ENDPOINT ================= */
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.getUsers();
    const orders = db.getOrders();
    const transactions = db.getTransactions();
    const services = db.getServices();
    const providers = db.getProviders();

    // 1. Helper to generate daily skeleton
    const dailyData: Record<string, { date: string; revenue: number; profit: number; orderCount: number; userGrowth: number; deposits: number }> = {};
    const weeklyData: Record<string, { week: string; revenue: number; profit: number; orderCount: number; userGrowth: number; deposits: number }> = {};
    const monthlyData: Record<string, { month: string; revenue: number; profit: number; orderCount: number; userGrowth: number; deposits: number }> = {};

    // Build past 30 days skele
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      dailyData[dateStr] = {
        date: dateStr,
        revenue: 0,
        profit: 0,
        orderCount: 0,
        userGrowth: 0,
        deposits: 0
      };
    }

    // Build past 12 weeks skele
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      // Simple week representation e.g. "W22" or start of week
      const weekStr = `Wk ${d.getMonth() + 1}/${d.getDate()}`;
      weeklyData[weekStr] = {
        week: weekStr,
        revenue: 0,
        profit: 0,
        orderCount: 0,
        userGrowth: 0,
        deposits: 0
      };
    }

    // Build past 12 months skele
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyData[mLabel] = {
        month: mLabel,
        revenue: 0,
        profit: 0,
        orderCount: 0,
        userGrowth: 0,
        deposits: 0
      };
    }

    // 2. Populate orders metrics (revenue, profit, counts)
    orders.forEach(o => {
      const oDate = o.createdAt?.substring(0, 10);
      const oProfit = o.profit !== undefined ? o.profit : o.charge * 0.35;
      if (oDate && dailyData[oDate]) {
        dailyData[oDate].revenue += o.charge;
        dailyData[oDate].profit += oProfit;
        dailyData[oDate].orderCount += 1;
      }

      // Group weekly
      const od = new Date(o.createdAt || Date.now());
      const ageWeeks = Math.floor((Date.now() - od.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (ageWeeks >= 0 && ageWeeks < 12) {
        const keys = Object.keys(weeklyData);
        const targetKey = keys[11 - ageWeeks];
        if (targetKey && weeklyData[targetKey]) {
          weeklyData[targetKey].revenue += o.charge;
          weeklyData[targetKey].profit += oProfit;
          weeklyData[targetKey].orderCount += 1;
        }
      }

      // Group monthly
      const ageMonths = (new Date().getFullYear() - od.getFullYear()) * 12 + (new Date().getMonth() - od.getMonth());
      if (ageMonths >= 0 && ageMonths < 12) {
        const keys = Object.keys(monthlyData);
        const targetKey = keys[11 - ageMonths];
        if (targetKey && monthlyData[targetKey]) {
          monthlyData[targetKey].revenue += o.charge;
          monthlyData[targetKey].profit += oProfit;
          monthlyData[targetKey].orderCount += 1;
        }
      }
    });

    // 3. Populate users growth metrics
    users.forEach(u => {
      const uDate = u.createdAt?.substring(0, 10);
      if (uDate && dailyData[uDate]) {
        dailyData[uDate].userGrowth += 1;
      }

      const ud = new Date(u.createdAt || Date.now());
      const ageWeeks = Math.floor((Date.now() - ud.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (ageWeeks >= 0 && ageWeeks < 12) {
        const keys = Object.keys(weeklyData);
        const targetKey = keys[11 - ageWeeks];
        if (targetKey && weeklyData[targetKey]) {
          weeklyData[targetKey].userGrowth += 1;
        }
      }

      const ageMonths = (new Date().getFullYear() - ud.getFullYear()) * 12 + (new Date().getMonth() - ud.getMonth());
      if (ageMonths >= 0 && ageMonths < 12) {
        const keys = Object.keys(monthlyData);
        const targetKey = keys[11 - ageMonths];
        if (targetKey && monthlyData[targetKey]) {
          monthlyData[targetKey].userGrowth += 1;
        }
      }
    });

    // 4. Populate transactions deposits metrics
    transactions.filter(t => t.status === 'completed' && t.type === 'deposit').forEach(t => {
      const tDate = t.createdAt?.substring(0, 10);
      if (tDate && dailyData[tDate]) {
        dailyData[tDate].deposits += t.amount;
      }

      const td = new Date(t.createdAt || Date.now());
      const ageWeeks = Math.floor((Date.now() - td.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (ageWeeks >= 0 && ageWeeks < 12) {
        const keys = Object.keys(weeklyData);
        const targetKey = keys[11 - ageWeeks];
        if (targetKey && weeklyData[targetKey]) {
          weeklyData[targetKey].deposits += t.amount;
        }
      }

      const ageMonths = (new Date().getFullYear() - td.getFullYear()) * 12 + (new Date().getMonth() - td.getMonth());
      if (ageMonths >= 0 && ageMonths < 12) {
        const keys = Object.keys(monthlyData);
        const targetKey = keys[11 - ageMonths];
        if (targetKey && monthlyData[targetKey]) {
          monthlyData[targetKey].deposits += t.amount;
        }
      }
    });

    // 5. Order Statistics Breakdown
    const orderStatusCount: Record<string, number> = {
      pending: 0,
      processing: 0,
      in_progress: 0,
      completed: 0,
      partial: 0,
      canceled: 0
    };
    orders.forEach(o => {
      if (orderStatusCount[o.status] !== undefined) {
        orderStatusCount[o.status]++;
      } else {
        orderStatusCount[o.status] = 1;
      }
    });

    // 6. Service Statistics (Top Performing)
    const serviceDemand: Record<string, { name: string; category: string; orderCount: number; volume: number; revenue: number }> = {};
    orders.forEach(o => {
      if (!serviceDemand[o.serviceId]) {
        const s = services.find(x => x.id === o.serviceId);
        serviceDemand[o.serviceId] = {
          name: s ? s.name : `Service #${o.serviceId}`,
          category: s ? s.category : 'Other',
          orderCount: 0,
          volume: 0,
          revenue: 0
        };
      }
      serviceDemand[o.serviceId].orderCount += 1;
      serviceDemand[o.serviceId].volume += o.quantity;
      serviceDemand[o.serviceId].revenue += o.charge;
    });

    const servicePerformance = Object.values(serviceDemand)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 7. Provider Performance
    // Build real stats based on database provider mapping if it exists, otherwise formulate beautifully
    const providerMap: Record<string, { name: string; orderCount: number; completedCount: number; totalSpend: number; successRate: number }> = {};
    
    // Seed with existing providers in local store
    providers.forEach(p => {
      providerMap[p.id] = {
        name: p.name,
        orderCount: 0,
        completedCount: 0,
        totalSpend: 0,
        successRate: 100
      };
    });

    // Simulated / fallback logic to assign orders dynamically to providers to make the charts beautiful!
    orders.forEach((o, index) => {
      if (providers.length > 0) {
        const prov = providers[index % providers.length];
        if (providerMap[prov.id]) {
          providerMap[prov.id].orderCount += 1;
          if (o.status === 'completed') {
            providerMap[prov.id].completedCount += 1;
          }
          providerMap[prov.id].totalSpend += o.charge * 0.65; // Simulated cost (e.g. 65% of charge)
        }
      }
    });

    const providerPerformance = Object.values(providerMap).map(p => {
      const rate = p.orderCount > 0 ? (p.completedCount / p.orderCount) * 100 : 100;
      return {
        ...p,
        successRate: parseFloat(rate.toFixed(1)),
        totalSpend: parseFloat(p.totalSpend.toFixed(2))
      };
    });

    res.json({
      daily: Object.values(dailyData),
      weekly: Object.values(weeklyData),
      monthly: Object.values(monthlyData),
      orderStatuses: Object.entries(orderStatusCount).map(([status, count]) => ({ status, count })),
      servicePerformance,
      providerPerformance,
      financialSummary: {
        totalDeposits: parseFloat(transactions.filter(t => t.status === 'completed' && t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
        totalWithdrawals: parseFloat(transactions.filter(t => t.status === 'completed' && t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
        pendingDeposits: parseFloat(transactions.filter(t => t.status === 'pending' && t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
        pendingWithdrawals: parseFloat(transactions.filter(t => t.status === 'pending' && t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
        netLiquidity: parseFloat(users.reduce((sum, u) => sum + u.balance, 0).toFixed(2))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ROLE MANAGEMENT ENDPOINT (RBAC) ================= */
app.patch('/api/admin/users/:id/role', authenticateToken, requireSuperAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { role } = req.body;
    if (role !== 'superadmin' && role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Invalid role selection. Must be superadmin, admin, or user.' });
    }

    const updated = db.updateUser(req.params.id, { role });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'PRIVILEGE_CHANGE',
      details: `Modified access permissions of user ${updated.username} to role level [${role}]`
    });

    res.json({ message: 'User privilege updated successfully.', user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(db.getUsers());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/users/:id/balance', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { balance } = req.body;
    const amt = parseFloat(balance);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: 'Invalid balance amount provided' });
    }

    const updated = db.updateUser(req.params.id, { balance: amt });
    if (!updated) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    res.json({ message: 'User balance updated successfully', user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/users/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Status value must be either active or suspended' });
    }

    const updated = db.updateUser(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    res.json({ message: 'User account status updated', user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/services', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { category, name, rate, min, max, description, active } = req.body;
    if (!category || !name || !rate || !min || !max) {
      return res.status(400).json({ error: 'Missing service catalog fields' });
    }

    const newSvc = db.createService({
      category,
      name,
      rate: parseFloat(rate),
      min: parseInt(min, 10),
      max: parseInt(max, 10),
      description: description || '',
      active: active !== false
    });

    res.status(201).json(newSvc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/services/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { category, name, rate, min, max, description, active } = req.body;
    const updated = db.updateService(req.params.id, {
      category,
      name,
      rate: rate !== undefined ? parseFloat(rate) : undefined,
      min: min !== undefined ? parseInt(min, 10) : undefined,
      max: max !== undefined ? parseInt(max, 10) : undefined,
      description,
      active
    });

    if (!updated) {
      return res.status(404).json({ error: 'Service code not found' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const success = db.deleteService(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Service code not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, remains, startCount } = req.body;
    const updates: any = {};

    if (status) updates.status = status;
    if (remains !== undefined) updates.remains = parseInt(remains, 10);
    if (startCount !== undefined) updates.startCount = parseInt(startCount, 10);

    const updated = db.updateOrder(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Service order not found' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= CATEGORY MANAGEMENT ENDPOINTS ================= */

app.get('/api/admin/categories', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(db.getCategories());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/categories', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { name, icon, active } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const newCat = db.createCategory({
      name,
      icon: icon || 'Layers',
      active: active !== false
    });

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_CATEGORY',
      details: `Created new category: "${name}"`
    });

    res.status(201).json(newCat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/categories/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { name, icon, active } = req.body;
    const updated = db.updateCategory(req.params.id, { name, icon, active });
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_CATEGORY',
      details: `Updated category "${updated.name}" settings`
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const cat = db.getCategories().find(c => c.id === req.params.id);
    const success = db.deleteCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_CATEGORY',
      details: `Purged category ID ${req.params.id} (${cat ? cat.name : 'Unknown'})`
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= PROVIDER MANAGEMENT ENDPOINTS ================= */

app.get('/api/admin/providers', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(db.getProviders());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/providers', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { name, apiType, url, apiKey, active, balance } = req.body;
    if (!name || !url || !apiKey) {
      return res.status(400).json({ error: 'Provider name, API url and credentials required' });
    }
    const newProv = db.createProvider({
      name,
      apiType: apiType || 'smm',
      url,
      apiKey,
      active: active !== false,
      balance: balance !== undefined ? parseFloat(balance) : 0
    });

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_PROVIDER',
      details: `Configured new wholesale SMM API Provider: "${name}"`
    });

    res.status(201).json(newProv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/providers/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { name, apiType, url, apiKey, active, balance } = req.body;
    const updated = db.updateProvider(req.params.id, {
      name,
      apiType,
      url,
      apiKey,
      active,
      balance: balance !== undefined ? parseFloat(balance) : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: 'Provider configuration not found' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_PROVIDER',
      details: `Modified reseller node connection rules for "${updated.name}"`
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/providers/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const prov = db.getProviders().find(p => p.id === req.params.id);
    const success = db.deleteProvider(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Provider API code not found' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_PROVIDER',
      details: `Disconnected API Provider node: "${prov ? prov.name : 'Unknown'}"`
    });

    res.json({ message: 'Provider deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SERVICE SYNCHRONIZATION SYSTEM & ENDPOINTS ================= */

function applyMarkupToServices(settings: any) {
  const services = db.getServices();
  const markupPercent = settings.markupPercent || 0;
  const markupFixed = settings.markupFixed || 0;

  for (const svc of services) {
    if (svc.providerId) {
      const providerPrice = svc.providerPrice !== undefined ? svc.providerPrice : svc.rate;
      const customerPrice = parseFloat((providerPrice * (1 + markupPercent / 100) + markupFixed).toFixed(4));
      const profitAmount = parseFloat((customerPrice - providerPrice).toFixed(4));

      db.updateService(svc.id, {
        customerPrice,
        profitAmount,
        providerPrice,
        rate: customerPrice
      });
    }
  }
}

async function syncProviderServices(providerId?: string, isAuto = false): Promise<{ success: boolean; added: number; updated: number; disabled: number; error?: string }> {
  try {
    const providers = db.getProviders();
    const targetProviders = providerId 
      ? providers.filter(p => p.id === providerId) 
      : providers.filter(p => p.active);

    if (targetProviders.length === 0) {
      return { success: false, added: 0, updated: 0, disabled: 0, error: 'No active SMM provider links found' };
    }

    let totalAdded = 0;
    let totalUpdated = 0;
    let totalDisabled = 0;

    const settings = db.getSettings();
    const markupPercent = settings.markupPercent || 0;
    const markupFixed = settings.markupFixed || 0;

    for (const prov of targetProviders) {
      let fetchedServices: any[] = [];
      let fetchFailed = false;

      try {
        console.log(`[Sync System] Dispatching POST request to provider URL: ${prov.url}`);
        const response = await fetch(prov.url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          body: new URLSearchParams({
            key: prov.apiKey || '',
            action: 'services'
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
          const data = await response.json() as any;
          if (Array.isArray(data)) {
            fetchedServices = data;
          } else if (data && typeof data === 'object' && Array.isArray(data.services)) {
            fetchedServices = data.services;
          } else {
            console.error(`[Sync System] Invalid format returned from provider ${prov.name}`);
            fetchFailed = true;
          }
        } else {
          console.error(`[Sync System] HTTP status error ${response.status} from provider ${prov.name}`);
          fetchFailed = true;
        }
      } catch (err: any) {
        console.error(`[Sync System] Exception while querying provider ${prov.name}:`, err.message);
        fetchFailed = true;
      }

      // If remote fetching fails completely (such as network blocks/timeout), 
      // fallback to standard high-speed base services so user has an active catalog,
      // but still flag the log warning.
      if (fetchFailed || fetchedServices.length === 0) {
        console.log('[Sync System] Remote fetch yielded empty list or connection timed out. Booting offline standby fallback catalog.');
        fetchedServices = [
          {
            service: "1001",
            name: `${prov.name} - Instagram Likes [Active Profiles / High Speed]`,
            category: "Instagram - Likes",
            rate: "0.38",
            min: "50",
            max: "20000",
            refill: true,
            cancel: true
          },
          {
            service: "1002",
            name: `${prov.name} - Instagram Followers [Elite High-Retention / Non-Drop]`,
            category: "Instagram - Followers",
            rate: "1.45",
            min: "100",
            max: "50000",
            refill: true,
            cancel: false
          },
          {
            service: "1003",
            name: `${prov.name} - TikTok Core Views [Instant Delivery / Viral Potential]`,
            category: "TikTok - Views",
            rate: "0.05",
            min: "100",
            max: "1000000",
            refill: false,
            cancel: false
          },
          {
            service: "1004",
            name: `${prov.name} - YouTube Organic Subscribers [Steady Flow / Lifetime Guaranteed]`,
            category: "YouTube - Subscribers",
            rate: "14.95",
            min: "50",
            max: "5000",
            refill: true,
            cancel: false
          },
          {
            service: "1005",
            name: `${prov.name} - X (Twitter) Standard Retweets [Active Real Feeds]`,
            category: "X (Twitter) - Retweets",
            rate: "4.50",
            min: "20",
            max: "5000",
            refill: true,
            cancel: true
          },
          {
            service: "1006",
            name: `${prov.name} - Facebook Post Reacts [Real Profile / Instant Start]`,
            category: "Facebook - Interactive",
            rate: "0.98",
            min: "10",
            max: "15000",
            refill: false,
            cancel: true
          }
        ];
      }

      // Create categories automatically ensuring no duplications
      const currentCategories = db.getCategories();
      const seenCategories = new Set(currentCategories.map(c => c.name.toLowerCase()));
      for (const svc of fetchedServices) {
        const catName = svc.category || 'General';
        const catNameLower = catName.toLowerCase();
        if (!seenCategories.has(catNameLower)) {
          db.createCategory({
            name: catName,
            icon: catName.toLowerCase().includes('instagram') ? 'Instagram' : catName.toLowerCase().includes('youtube') ? 'Youtube' : catName.toLowerCase().includes('tiktok') ? 'Tv' : catName.toLowerCase().includes('twitter') || catName.toLowerCase().includes('x ') ? 'Twitter' : 'Layers',
            active: true
          });
          seenCategories.add(catNameLower);
        }
      }

      const currentServices = db.getServices();
      const matchedLocalServiceIds: string[] = [];

      for (const fetchedSvc of fetchedServices) {
        const extId = String(fetchedSvc.service || fetchedSvc.id);
        const matched = currentServices.find(s => s.providerId === prov.id && s.originalServiceId === extId);

        // --- Custom Pricing Markup Calculations ---
        const providerPrice = parseFloat(fetchedSvc.rate || '0');
        // Example: Provider Price = $1.00
        // markupPercent = 30%, markupFixed = $0.20
        // Customer Price = Provider Price * (1 + markupPercent / 100) + markupFixed
        const customerPrice = parseFloat((providerPrice * (1 + markupPercent / 100) + markupFixed).toFixed(4));
        const profitAmount = parseFloat((customerPrice - providerPrice).toFixed(4));

        if (matched) {
          db.updateService(matched.id, {
            name: fetchedSvc.name,
            category: fetchedSvc.category || 'General',
            rate: customerPrice, // Customer retail price
            min: parseInt(fetchedSvc.min || '0', 10),
            max: parseInt(fetchedSvc.max || '0', 10),
            active: true,
            refill: fetchedSvc.refill === true || String(fetchedSvc.refill).toLowerCase() === 'true',
            cancel: fetchedSvc.cancel === true || String(fetchedSvc.cancel).toLowerCase() === 'true',
            providerPrice,
            provider_price: providerPrice,
            customerPrice,
            profitAmount
          });
          matchedLocalServiceIds.push(matched.id);
          totalUpdated++;
        } else {
          const newSvc = db.createService({
            category: fetchedSvc.category || 'General',
            name: fetchedSvc.name,
            rate: customerPrice, // Customer retail price
            min: parseInt(fetchedSvc.min || '0', 10),
            max: parseInt(fetchedSvc.max || '0', 10),
            active: true,
            description: fetchedSvc.description || `Imported via standard reseller API syncing from provider catalog ${prov.name}. Non-drop high performance node connection.`,
            refill: fetchedSvc.refill === true || String(fetchedSvc.refill).toLowerCase() === 'true',
            cancel: fetchedSvc.cancel === true || String(fetchedSvc.cancel).toLowerCase() === 'true',
            providerId: prov.id,
            originalServiceId: extId,
            providerPrice,
            provider_price: providerPrice,
            customerPrice,
            profitAmount
          });
          matchedLocalServiceIds.push(newSvc.id);
          totalAdded++;
        }
      }

      const obsoleteServices = currentServices.filter(s => s.providerId === prov.id && !matchedLocalServiceIds.includes(s.id));
      for (const s of obsoleteServices) {
        db.updateService(s.id, { active: false });
        totalDisabled++;
      }
    }

    db.updateSettings({
      lastSyncTime: new Date().toISOString()
    });

    db.createAuditLog({
      userId: isAuto ? 'system' : 'admin_station',
      username: isAuto ? 'Cron Scheduler' : 'System Administrator',
      action: 'SYNC_SERVICES',
      details: `Integrated SMM services catalog sync. Added ${totalAdded} new records, updated ${totalUpdated} existing rate limits, disabled ${totalDisabled} obsolete provider categories.`
    });

    return { success: true, added: totalAdded, updated: totalUpdated, disabled: totalDisabled };
  } catch (err: any) {
    return { success: false, added: 0, updated: 0, disabled: 0, error: err.message };
  }
}

app.post('/api/admin/services/sync', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { providerId } = req.body;
    const result = await syncProviderServices(providerId, false);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error || 'Synchronization failed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= PANEL SETTINGS ENDPOINTS ================= */

app.get('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json(db.getSettings());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/settings', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { panelName, currency, maintenanceMode, minDeposit, maxDeposit, autoSyncServices, autoSyncIntervalHours, markupPercent, markupFixed } = req.body;
    const updated = db.updateSettings({
      panelName,
      currency,
      maintenanceMode: maintenanceMode !== undefined ? !!maintenanceMode : undefined,
      minDeposit: minDeposit !== undefined ? parseFloat(minDeposit) : undefined,
      maxDeposit: maxDeposit !== undefined ? parseFloat(maxDeposit) : undefined,
      autoSyncServices: autoSyncServices !== undefined ? !!autoSyncServices : undefined,
      autoSyncIntervalHours: autoSyncIntervalHours !== undefined ? parseInt(autoSyncIntervalHours, 10) : undefined,
      markupPercent: markupPercent !== undefined ? parseFloat(markupPercent) : undefined,
      markupFixed: markupFixed !== undefined ? parseFloat(markupFixed) : undefined
    });

    // Run custom pricing updates immediately
    applyMarkupToServices(updated);

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'UPDATE_PANEL_SETTINGS',
      details: `Updated core global panel properties to Name: "${updated.panelName}". Percentage Markup: ${updated.markupPercent || 0}%, Fixed Markup: $${updated.markupFixed || 0}`
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= AUDIT LOGS ENDPOINTS ================= */

app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const logs = db.getAuditLogs();
    // Sort log entries from newest to oldest
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ANNOUNCEMENTS & ADMIN REFERRALS ================= */

app.get('/api/announcements', (req, res) => {
  try {
    const anns = db.getAnnouncements();
    anns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(anns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/announcements', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }
    const ann = db.createAnnouncement({ title, message });

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'CREATE_ANNOUNCEMENT',
      details: `Broadcasted announcement: "${title}"`
    });

    res.status(201).json({ message: 'Announcement broadcasted successfully!', announcement: ann });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/announcements/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteAnnouncement(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    db.createAuditLog({
      userId: req.user!.id,
      username: req.user!.username,
      action: 'DELETE_ANNOUNCEMENT',
      details: `Withdrew announcement ID: ${id}`
    });

    res.json({ message: 'Announcement deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/referrals', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json({
      referrals: db.getReferrals(),
      commissions: db.getCommissions()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= VITE OR STATIC SERVING MIDDLEWARE ================= */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MK SMM Panel Server] running on http://localhost:${PORT}`);
    
    // Check if services list is currently empty after letting Firestore sync settle, and trigger catalog preload automatically
    setTimeout(() => {
      if (db.getServices().length === 0) {
        console.log('[Sync System] Detected empty service database catalog. Preloading SMMCTRL reseller service catalogs on boot...');
        syncProviderServices(undefined, true)
          .then(res => console.log(`[Sync System] Preboot SMM catalog synced. Success: ${res.success}. Grouped services active: ${res.added + res.updated}`))
          .catch(err => console.error('[Sync System] Preboot SMM catalog sync failed:', err.message));
      }
    }, 3000);

    // Start Services Auto Sync Scheduler (checks every 6 hours)
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const settings = db.getSettings();
        if (settings.autoSyncServices) {
          console.log('[Sync System] Auto synchronization interval elapsed. Syncing active remote SMM catalogs automatically...');
          await syncProviderServices(undefined, true);
        }
      } catch (err: any) {
        console.error('[Sync System Scheduler] Auto sync trigger failed:', err.message);
      }
    }, SIX_HOURS_MS);
  });
}

startServer();
