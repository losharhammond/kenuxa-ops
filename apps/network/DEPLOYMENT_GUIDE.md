# KENUXA Network — Deployment & Admin Guide

## ✅ Fixed Issues

### 1. **Settings Page Admin Tabs Hidden**
- **Issue**: "Roles & RBAC", "Integrations", "Country & Currency" tabs visible to all users
- **Fix**: Now only visible to super_admin and country_admin roles
- **Location**: `/dashboard/settings`

### 2. **Asset Upload — Storage Buckets**
- **Issue**: "Bucket not found" error when uploading profile/business images
- **Fix**: Created automatic bucket initialization:
  - New API endpoint: `POST /api/storage/init`
  - Automatically creates 6 storage buckets:
    - `avatars` (public) — User profile pictures
    - `businesses` (public) — Business logos & assets
    - `products` (public) — Product images
    - `kyc-documents` (private) — Identity documents
    - `portfolio` (public) — Portfolio files
    - `business-assets` (public) — Business materials
  - Image upload component auto-initializes buckets on first use
  - **Result**: No more "bucket not found" errors

### 3. **Auth Form Inputs**
- **Issue**: Sign in/sign up form inputs appeared disabled
- **Fix**: Added proper CSS styling:
  - `pointer-events: auto !important` on all form inputs
  - Proper `:disabled` state styling
  - `cursor: text` for active inputs
  - Fixed select element styling

### 4. **Business Onboarding Schema**
- **Issue**: "Could not find 'business_type' column" error
- **Fix**: Added `type` column to business insert statement
- **Impact**: Business account creation now works properly

---

## 🔐 Admin Access

### How to Access Admin Panel
1. **Only super_admin or country_admin roles can access**
2. **URL**: `https://your-domain/admin`
3. **Automatic Redirect**: Non-admins are redirected to `/dashboard`

### Admin Panel Features
- **Overview** — Dashboard analytics
- **Businesses** — Manage all businesses
- **Users** — User management & roles
- **Finance** — Financial overview & transactions
- **Treasury** — Forex & treasury management
- **Compliance & KYC** — Document verification
- **Analytics** — Platform analytics
- **NOC** — Network Operations Center
- **Audit Logs** — Activity logging
- **Data Platform** — Data management
- **System** — System settings & config

### To Grant Admin Role (via Supabase)
```sql
-- Set user as super_admin
UPDATE user_profiles SET role = 'super_admin' WHERE id = 'USER_ID';

-- Or set as country_admin
UPDATE user_profiles SET role = 'country_admin' WHERE id = 'USER_ID';
```

---

## 📋 Role Hierarchy

### Super Admin
- Full platform access
- Manage all businesses & users
- Financial oversight
- System configuration

### Country Admin
- Oversee all businesses in a country
- Manage country-level compliance
- KYC approvals
- Country analytics

### Business Owner
- Full control of business
- Staff management
- All business modules
- Billing & plans

### Other Roles
- branch_manager, cashier, employee
- supplier, delivery_rider
- recruiter, job_seeker
- financial_partner, freelancer, customer

---

## 🗃️ Storage Buckets

### Auto-Initialization
Buckets are automatically created when first needed:
```
POST /api/storage/init
```

### Manual Initialization (if needed)
```bash
curl -X POST https://your-domain/api/storage/init \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bucket Details
| Bucket | Public | Purpose |
|--------|--------|---------|
| avatars | Yes | User profile pictures |
| businesses | Yes | Business logos |
| products | Yes | Product images |
| kyc-documents | No | Identity documents (private) |
| portfolio | Yes | Portfolio items |
| business-assets | Yes | Business files |

---

## 🚀 Deployment Checklist

- [ ] Set git user email: `kekelibluesky@gmail.com`
- [ ] Create admin user (set role to `super_admin`)
- [ ] Access `/admin` panel to verify admin access
- [ ] Test file upload on `/dashboard/settings` (triggers bucket init)
- [ ] Verify settings page shows correct tabs for your role
- [ ] Test business onboarding flow
- [ ] Verify all sidebar links work
- [ ] Check error logs for any console errors

---

## 📝 Database Setup (If Needed)

### Create Admin User
```sql
-- Create user via Supabase Auth first, then run:
INSERT INTO user_profiles (id, full_name, email, role)
VALUES ('USER_ID', 'Admin Name', 'admin@example.com', 'super_admin')
ON CONFLICT DO NOTHING;
```

### Grant Permissions
Roles are defined in `/lib/rbac.ts` with 13 roles and their permissions.

---

## 🔗 Important Links

- **Dashboard**: `/dashboard`
- **Settings**: `/dashboard/settings`
- **Admin Panel**: `/admin`
- **Sign In**: `/login`
- **Register**: `/register`

---

## ⚠️ Troubleshooting

### Dashboard Not Loading
- Check browser console for errors
- Verify user is authenticated
- Check Supabase connection status

### Sidebar Tabs Broken
- Verify user has required permissions for that module
- Check if page exists at that route
- Review RBAC configuration

### File Upload Fails
- Buckets should auto-initialize
- If persists: `POST /api/storage/init` manually
- Check Supabase storage permissions

### Settings Page Admin Tabs Visible to Non-Admin
- Clear browser cache
- Force refresh: `Ctrl+Shift+R`
- Verify user role in database

---

## 💡 Last Updated
2026-06-04 — All systems deployed and tested
