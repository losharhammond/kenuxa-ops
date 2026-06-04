# Vercel Deployment Guide — KENUXA Business Network

## Quick Start (5 minutes)

### Step 1: Prepare Vercel Account
1. Go to https://vercel.com
2. Sign in with GitHub account (kekelibluesky@gmail.com)
3. Create new project

### Step 2: Import GitHub Repository
1. Click "Add New..." → "Project"
2. Select "Import an existing project"
3. Paste: `https://github.com/LosharHammond/KENUXA-OPS`
4. Click "Import"

### Step 3: Configure Build Settings
When prompted, set:
- **Framework:** Next.js (auto-detected)
- **Root Directory:** `apps/network`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### Step 4: Add Environment Variables
In Vercel project dashboard, go to Settings → Environment Variables and add:

**Essential (Required):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyXXX...
SUPABASE_SERVICE_ROLE_KEY=eyXXX...
```

**Admin Access Control:**
```
ADMIN_EMAILS=admin@kenuxa.com,losharhammond@gmail.com,blueskyinfotechgh@gmail.com
```

**Optional:**
```
KENUX_WELCOME_BONUS=500
GROQ_API_KEY=gsk_...
```

> **Where to find Supabase keys:**
> 1. Go to https://app.supabase.com
> 2. Select your project
> 3. Settings → API → Copy the keys

### Step 5: Deploy
1. Click "Deploy" button
2. Wait 2-3 minutes for build
3. Visit your live URL (e.g., https://network.kenuxa.vercel.app)

---

## Verification Checklist

After deployment, verify everything works:

### Authentication
- [ ] Visit homepage → "Sign Up"
- [ ] Create account with test email
- [ ] Verify email (check inbox)
- [ ] Login successful

### Onboarding
- [ ] Verify wallet provisioned
- [ ] Verify 500 KENUX welcome bonus credited
- [ ] Verify demo data appeared (3 businesses, 3 products, 3 services)

### Navigation
- [ ] Dashboard tab works
- [ ] My Roles tab works
- [ ] Products tab works
- [ ] KENUXA Credit tab works
- [ ] Notifications tab works

### Admin Access
- [ ] Logout
- [ ] Login with admin email (from ADMIN_EMAILS)
- [ ] Verify Admin Panel visible in sidebar
- [ ] Visit `/admin` successfully

### Theme
- [ ] Click sun/moon icon (top right)
- [ ] Verify dark → light mode switch
- [ ] Refresh page
- [ ] Verify theme persists

### Storage
- [ ] Go to Settings → Profile
- [ ] Try uploading profile picture
- [ ] Verify upload succeeds
- [ ] Check image appears

---

## Troubleshooting

### Build Fails with "Module not found"
**Solution:** Ensure monorepo dependencies installed
```bash
# In root directory:
npm install
npm run build
```

### "useTheme must be used within ThemeProvider" Error
**Status:** ✅ FIXED in latest commit
- The error is now handled gracefully
- Theme script in `<head>` prevents flash
- If still occurs, clear Vercel cache and redeploy

### "Bucket not found" on Image Upload
**Solution:** Auto-fixed by image-upload component
- First upload attempt triggers `/api/storage/init`
- Buckets auto-created on demand
- No manual action needed

### SQL Migration Errors
**Status:** ✅ ALL 18 PHASES FIXED
- All column guards in place
- All policy syntax corrected
- All function return types fixed
- Redeploy with latest code

### Environment Variables Not Applied
**Solution:**
1. Go to Settings → Environment Variables
2. Verify all vars present
3. Click "Save"
4. Redeploy from "Deployments" tab
5. Do NOT use cached deployment

---

## Domain Setup (Optional)

To use custom domain instead of `vercel.app`:

1. Go to Settings → Domains
2. Add your domain (e.g., `network.kenuxa.com`)
3. Add DNS records shown in Vercel
4. Wait 24-48 hours for propagation
5. Verify SSL certificate auto-issued

---

## Monitoring & Maintenance

### Daily Checks
- Vercel Deployments tab → Latest deployment status
- Check Error Logs in dashboard

### Weekly Checks
- Analytics tab → Usage metrics
- Monitor bandwidth usage
- Review error patterns

### Monthly Tasks
- Database backup (via Supabase console)
- Security audit (check admin logs)
- Performance review (check Core Web Vitals)

---

## Common Operations

### Redeploy Latest Changes
```bash
# After making changes and pushing to GitHub:
# In Vercel dashboard:
1. Go to Deployments
2. Click "..." on latest git commit
3. Select "Redeploy"
```

### Rollback to Previous Version
```bash
# In Vercel dashboard:
1. Go to Deployments
2. Find previous successful deployment
3. Click "..." on that deployment
4. Select "Promote to Production"
```

### Update Environment Variables
```bash
# In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Click variable to edit
3. Update value
4. Click "Save"
5. Must redeploy for changes to take effect
6. Go to Deployments → Redeploy
```

### Check Build Logs
```bash
# In Vercel dashboard:
1. Go to Deployments
2. Click on any deployment
3. Scroll to "Build Logs" section
4. Search for specific errors
```

---

## Performance Tips

### Optimize Build Time
- Keep node_modules clean: `npm ci` instead of `npm install`
- Use monorepo caching: Vercel auto-caches if setup correctly
- Expected build time: 1-2 minutes

### Optimize Runtime Performance
- Database: Use Supabase connection pooling (automatic)
- API Routes: Keep functions under 50MB
- Images: Use Next.js Image component (automatic)
- Caching: localStorage for theme, SWR for data

### Monitor Usage
- Free tier limit: 12GB bandwidth/month
- If exceeding, upgrade to Pro ($20/month)
- Cron jobs: Limited to 1x daily on Free tier

---

## Security Best Practices

### Secrets Management
- ✅ Service role key NEVER in client code
- ✅ Use environment variables for all secrets
- ✅ Rotate keys every 6 months
- ✅ Use separate keys for staging/production

### RLS Enforcement
- ✅ All tables have RLS enabled
- ✅ Policies enforce business_id isolation
- ✅ Service role exemptions documented
- ✅ Test policies before deploying

### Admin Access
- ✅ Email-based whitelist (ADMIN_EMAILS)
- ✅ Never grant admin role to untrusted users
- ✅ Audit admin actions (check logs)
- ✅ Remove from ADMIN_EMAILS when no longer needed

---

## Support & Resources

| Resource | Link |
|----------|------|
| Vercel Docs | https://vercel.com/docs |
| Next.js Docs | https://nextjs.org/docs |
| Supabase Docs | https://supabase.com/docs |
| GitHub Repo | https://github.com/LosharHammond/KENUXA-OPS |
| API Status | https://status.supabase.com |

---

## Deployment Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Build succeeds without warnings
- [ ] All 5 main tabs functional
- [ ] Admin access working
- [ ] Dark mode toggle works
- [ ] Demo data appears for new users
- [ ] Storage uploads working
- [ ] Notifications system functional
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] RLS policies verified in Supabase

---

## Need Help?

If deployment fails:

1. **Check build logs** in Vercel dashboard
2. **Look for error patterns** (SQL, TypeScript, module)
3. **Verify environment variables** are all set
4. **Clear cache & redeploy** (Settings → Git → Clear Vercel Cache)
5. **Check GitHub** for latest commits
6. **Review** PRODUCTION_READINESS.md for known issues

---

**Status: ✅ READY FOR PRODUCTION**

Your KENUXA Business Network is production-ready. Follow these steps to deploy to Vercel now.
