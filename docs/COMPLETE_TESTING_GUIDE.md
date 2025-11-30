# Complete Testing Guide for EcoComply SaaS

**Your SaaS:** Environmental Compliance Management Platform  
**Status:** Core features implemented, ready for testing

---

## 🎯 What Has Been Built

Based on your specifications, here's what's implemented:

### ✅ **Core Features Implemented**

1. **User Management & Authentication**
   - User registration/login
   - Role-based access control (RBAC)
   - Company and site management

2. **Document Processing**
   - Document upload and extraction
   - AI-powered obligation extraction
   - Excel import functionality

3. **Obligation Management**
   - Obligation tracking
   - Deadline management
   - Evidence linking

4. **Background Jobs System**
   - Monitoring schedule jobs
   - Deadline alerts
   - Evidence reminders
   - Document processing
   - Pack generation

5. **Notification System** ⭐ (Just Completed!)
   - Email notifications
   - Escalation chains
   - Rate limiting
   - Digest notifications
   - Template system

6. **AI Integration**
   - OpenAI integration
   - Cost tracking
   - Extraction rules library

---

## 🧪 How to Test Your SaaS

### **Step 1: Start Your Application**

```bash
# Terminal 1: Start Next.js app
npm run dev

# Terminal 2: Start background workers
npm run worker
```

**Verify:**
- ✅ App runs on http://localhost:3000
- ✅ Workers start successfully (check console for "All workers started")

---

### **Step 2: Test User Authentication**

1. **Register a New User**
   - Go to: http://localhost:3000/signup (or your signup route)
   - Create an account
   - Verify email (if required)

2. **Login**
   - Go to: http://localhost:3000/login
   - Login with credentials
   - Verify you're redirected to dashboard

3. **Check User Profile**
   - Navigate to profile/settings
   - Verify user data loads correctly

**Expected Result:** ✅ User can register, login, and access dashboard

---

### **Step 3: Test Company & Site Management**

1. **Create a Company**
   - Navigate to company creation page
   - Create a test company
   - Verify company appears in list

2. **Create a Site**
   - Navigate to site creation
   - Link site to company
   - Verify site appears

**Expected Result:** ✅ Can create and manage companies/sites

---

### **Step 4: Test Document Upload**

1. **Upload a Document**
   - Navigate to document upload page
   - Upload a PDF or document
   - Wait for processing

2. **Check Processing Status**
   - Check document status (PENDING → PROCESSING → COMPLETED)
   - Verify extraction logs appear

3. **View Extracted Obligations**
   - Check if obligations were extracted
   - Verify obligation details are correct

**Expected Result:** ✅ Documents process and obligations are extracted

---

### **Step 5: Test Obligation Management**

1. **Create Manual Obligation**
   - Navigate to obligations page
   - Create a test obligation
   - Set a deadline (e.g., 7 days from now)

2. **Link Evidence**
   - Upload evidence to obligation
   - Verify evidence links correctly

3. **Check Obligation Status**
   - Verify status updates (PENDING → DUE_SOON → OVERDUE)
   - Check deadline calculations

**Expected Result:** ✅ Obligations track correctly with deadlines

---

### **Step 6: Test Background Jobs** ⚠️ Important!

#### **6.1: Test Monitoring Schedule Job**

This job runs hourly and updates obligation statuses.

**Manual Test:**
```bash
# Create a test obligation with deadline in 6 days
# Wait for monitoring schedule job to run (or trigger manually)
# Check obligation status changes to DUE_SOON
```

**Check in Database:**
```sql
SELECT id, obligation_title, status, deadline_date 
FROM obligations 
WHERE status IN ('DUE_SOON', 'OVERDUE')
ORDER BY deadline_date;
```

**Expected Result:** ✅ Obligations update status based on deadlines

---

#### **6.2: Test Deadline Alert Job**

This job runs every 6 hours and sends deadline warnings.

**Manual Test:**
1. Create obligation with deadline in 7 days
2. Wait for deadline alert job to run
3. Check `notifications` table for alert notifications

**Check in Database:**
```sql
SELECT * FROM notifications 
WHERE notification_type LIKE 'DEADLINE_WARNING%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:** ✅ Notifications created for upcoming deadlines

---

#### **6.3: Test Evidence Reminder Job**

This job runs daily and reminds about missing evidence.

**Manual Test:**
1. Create obligation with deadline in the past
2. Don't link evidence
3. Wait for evidence reminder job (runs daily at 9 AM)
4. Check for reminder notifications

**Expected Result:** ✅ Reminders sent for obligations without evidence

---

### **Step 7: Test Notification System** ⭐ New Feature!

#### **7.1: Test Notification Delivery**

1. **Check Notification Delivery Job**
   - Job runs every 5 minutes
   - Processes PENDING notifications
   - Sends emails via Resend

**Manual Test:**
```sql
-- Create a test notification
INSERT INTO notifications (
  user_id, company_id, site_id,
  recipient_email, notification_type, channel,
  priority, subject, body_text, status
) VALUES (
  'your-user-id', 'your-company-id', 'your-site-id',
  'test@example.com', 'DEADLINE_WARNING_7D', 'EMAIL',
  'NORMAL', 'Test Notification', 'This is a test',
  'PENDING'
);
```

2. **Wait 5 minutes** (or trigger job manually)
3. **Check email inbox** for notification
4. **Check notification status** in database:
```sql
SELECT id, status, sent_at, delivery_status 
FROM notifications 
WHERE id = 'your-notification-id';
```

**Expected Result:** ✅ Notification status: PENDING → SENDING → SENT

---

#### **7.2: Test Rate Limiting**

1. **Create multiple notifications quickly**
2. **Check if some are queued** (status = QUEUED)
3. **Verify rate limit metadata**:
```sql
SELECT id, status, metadata->>'rate_limit_exceeded' 
FROM notifications 
WHERE status = 'QUEUED';
```

**Expected Result:** ✅ Notifications queued when rate limits exceeded

---

#### **7.3: Test Escalation**

1. **Create obligation with deadline**
2. **Wait for deadline alert** (creates Level 1 notification)
3. **Wait 24 hours** (or manually update timestamps)
4. **Check escalation check job** runs hourly
5. **Verify Level 2 escalation** notification created

**Check in Database:**
```sql
SELECT id, escalation_level, notification_type 
FROM notifications 
WHERE is_escalation = true
ORDER BY created_at DESC;
```

**Expected Result:** ✅ Escalation notifications created after time delays

---

#### **7.4: Test User Preferences**

1. **Update notification preferences**:
```bash
PUT /api/v1/users/{userId}/notification-preferences
{
  "notification_type": "DEADLINE_WARNING_7D",
  "channel_preference": "EMAIL_ONLY",
  "frequency_preference": "DAILY_DIGEST",
  "enabled": true
}
```

2. **Create notification**
3. **Verify it's queued for digest** (not sent immediately)

**Expected Result:** ✅ Preferences respected, notifications queued for digest

---

### **Step 8: Test API Endpoints**

#### **8.1: Health Check**

```bash
curl http://localhost:3000/api/v1/health
```

**Expected:** `{"status": "ok"}`

---

#### **8.2: Get Notifications**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/notifications
```

**Expected:** List of user's notifications

---

#### **8.3: Get Obligations**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/obligations
```

**Expected:** List of obligations

---

### **Step 9: Test AI Integration**

1. **Upload Document with Obligations**
2. **Check Extraction Logs**:
```sql
SELECT * FROM extraction_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

3. **Verify Cost Tracking**:
```sql
SELECT * FROM extraction_logs 
WHERE cost_tracked IS NOT NULL
ORDER BY created_at DESC;
```

**Expected Result:** ✅ AI extraction works, costs tracked

---

### **Step 10: End-to-End Test**

**Complete Workflow:**

1. ✅ **Register** as new user
2. ✅ **Create company** and site
3. ✅ **Upload document** with obligations
4. ✅ **Verify obligations** extracted
5. ✅ **Set deadlines** for obligations
6. ✅ **Wait for deadline alerts** (or trigger manually)
7. ✅ **Check email** for notifications
8. ✅ **Link evidence** to obligation
9. ✅ **Verify escalation** doesn't trigger (evidence present)
10. ✅ **Check notification preferences** work

---

## 🔍 How to Check What's Working

### **Database Queries**

```sql
-- Check all notifications
SELECT COUNT(*), status FROM notifications GROUP BY status;

-- Check background jobs status
SELECT COUNT(*), status FROM background_jobs GROUP BY status;

-- Check obligations by status
SELECT COUNT(*), status FROM obligations GROUP BY status;

-- Check extraction logs
SELECT COUNT(*), status FROM extraction_logs GROUP BY status;
```

### **Check Worker Logs**

Look for these in your worker console:
- ✅ "All workers started successfully"
- ✅ "Processing job X of type Y"
- ✅ "Job X completed successfully"

### **Check Application Logs**

Look for:
- ✅ API requests logged
- ✅ No error messages
- ✅ Successful database queries

---

## 🚨 Common Issues & Fixes

### **Issue: Workers Not Starting**

**Check:**
- Redis is running: `redis-cli ping` (should return PONG)
- `REDIS_URL` environment variable is set
- Worker script exists: `workers/index.ts`

**Fix:**
```bash
# Start Redis (if local)
redis-server

# Or check Redis connection
npm run test:redis
```

---

### **Issue: Notifications Not Sending**

**Check:**
- Resend API key is set: `RESEND_API_KEY`
- Worker is running
- Notification status in database

**Fix:**
```bash
# Check environment variables
npm run validate-env

# Check notification status
SELECT * FROM notifications WHERE status = 'PENDING';
```

---

### **Issue: Jobs Not Running**

**Check:**
- Cron scheduler is running
- Jobs are scheduled in database
- Worker is processing jobs

**Fix:**
```bash
# Check worker logs
# Verify cron scheduler is called on app startup
```

---

## 📊 Testing Checklist

### **Core Features**
- [ ] User registration/login works
- [ ] Company/site creation works
- [ ] Document upload processes
- [ ] Obligations extracted correctly
- [ ] Deadlines calculated correctly

### **Background Jobs**
- [ ] Monitoring schedule job runs
- [ ] Deadline alerts created
- [ ] Evidence reminders sent
- [ ] Document processing works

### **Notifications** ⭐
- [ ] Notifications created
- [ ] Emails sent successfully
- [ ] Rate limiting works
- [ ] Escalation chains work
- [ ] User preferences respected
- [ ] Digest notifications work

### **API Endpoints**
- [ ] Health check works
- [ ] Authentication works
- [ ] CRUD operations work
- [ ] Error handling works

---

## 🎯 Next Steps After Testing

1. **Fix any issues** found during testing
2. **Set up monitoring** (logs, metrics)
3. **Configure production** environment variables
4. **Set up Resend webhook** for delivery tracking
5. **Deploy to staging** environment
6. **Run load tests** if needed

---

## 📚 Additional Resources

- **Migration Guide:** `docs/MIGRATION_GUIDE.md`
- **Next Steps:** `docs/NEXT_STEPS.md`
- **Implementation Status:** `docs/specs/COMPLETE_IMPLEMENTATION_STATUS.md`
- **Specifications:** `docs/specs/`

---

**Need Help?** Check the troubleshooting section or review the implementation files for details.

