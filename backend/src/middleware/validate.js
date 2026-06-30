import { z } from 'zod';
import { AppError } from './errorHandler.js';

export function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues || err.errors || [];
        const details = issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new AppError('Validation failed', 400, details));
      } else {
        next(err);
      }
    }
  };
}

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['lawyer', 'client', 'admin', 'firm_admin']),
  phone: z.preprocess(emptyToNull, z.string().max(50).nullable()),
  city: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  specialization: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  barNumber: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  licenseNumber: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  experience: z.preprocess(toNum, z.number().int().min(0).max(100).nullable()),
  education: z.preprocess(emptyToNull, z.string().max(1000).nullable()),
  firmId: z.string().optional().nullable(),
  subscriptionPlan: z.enum(['free', 'student', 'starter', 'pro', 'firm']).optional(),
});

export const firmRegisterSchema = z.object({
  name: z.string().min(1, 'Firm name is required').max(255),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6).max(128),
  phone: z.preprocess(emptyToNull, z.string().max(50).nullable()),
  city: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  address: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  description: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  registrationNumber: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  adminName: z.preprocess(emptyToNull, z.string().max(255).nullable()),
  adminPhone: z.preprocess(emptyToNull, z.string().max(50).nullable()),
  documentIds: z.array(z.string()).optional(),
});

export const caseCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10000).optional().default(''),
  clientId: z.string().min(1),
  lawyerId: z.string().min(1),
  type: z.string().max(100).optional().default('General'),
  status: z.string().max(50).optional().default('pending'),
});

export const caseUpdateSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(10000).optional(),
  status: z.string().max(50).optional(),
  type: z.string().max(100).optional(),
  lawyerId: z.string().min(1, 'Lawyer is required').optional(),
  timeline: z.array(z.object({
    date: z.string(),
    event: z.string(),
    description: z.string().optional(),
  })).optional(),
  documents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    uploadedAt: z.string(),
  })).optional(),
  courtDates: z.array(z.object({
    date: z.string(),
    court: z.string(),
    notes: z.string().optional(),
  })).optional(),
});

export const caseRespondSchema = z.object({
  clientStatus: z.enum(['approved', 'rejected']),
});

export const caseWithClientSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.preprocess(emptyToNull, z.string().max(50).nullable()),
  city: z.preprocess(emptyToNull, z.string().max(100).nullable()),
  title: z.string().min(1, 'Case title is required').max(500),
  description: z.string().max(10000).optional().default(''),
  type: z.string().max(100).optional().default('General'),
  lawyerId: z.string().min(1),
});

export const messageSchema = z.object({
  receiverId: z.string().optional().default(''),
  content: z.string().max(10000).default(''),
  caseId: z.string().optional().nullable(),
  attachments: z.string().optional().default('[]'),
  shareData: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
});

export const connectionRequestSchema = z.object({
  receiverId: z.string().min(1),
  message: z.string().max(500).optional().default(''),
});

export const invoiceSchema = z.object({
  caseId: z.string().min(1),
  clientId: z.string().min(1),
  lawyerId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  hours: z.number().min(0).optional().nullable(),
  description: z.string().max(1000).optional().default(''),
  dueDate: z.string().optional().nullable(),
});

export const timeEntrySchema = z.object({
  caseId: z.string().min(1),
  hours: z.number().positive('Hours must be positive'),
  description: z.string().max(1000).optional().default(''),
  date: z.string().min(1, 'Date is required'),
  rate: z.number().min(0).optional().default(0),
});

export const journalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  notes: z.string().max(100000).optional().default(''),
  todos: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean(),
  })).optional().default([]),
  plans: z.string().max(100000).optional().default(''),
  content: z.string().max(1000000).optional().default(''),
  sketch: z.string().max(5000000).optional().default(''),
});

export const journalUpdateSchema = z.object({
  notes: z.string().max(100000).optional(),
  todos: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean(),
  })).optional(),
  plans: z.string().max(100000).optional(),
  content: z.string().max(1000000).optional(),
  sketch: z.string().max(5000000).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional().default([]),
  sessionId: z.string().optional(),
  noTools: z.boolean().optional().default(false),
  noSession: z.boolean().optional().default(false),
});

export const adminVerifySchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});
