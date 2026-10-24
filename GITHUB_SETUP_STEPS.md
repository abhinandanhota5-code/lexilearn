# GitHub Setup: Step-by-Step Instructions

**Date:** October 24, 2026, 09:16 UTC  
**Status:** Ready for you to execute manually  
**Current Repo State:** ✅ Initial commit created (1 commit on main)

---

## ✅ WHAT'S ALREADY DONE

- [x] Git initialized locally
- [x] .gitignore configured (excludes scratch files, test data, audit reports)
- [x] 104 production files staged and committed
- [x] Initial commit message created with full attribution
- [x] Ready to connect to remote repository

---

## 🚀 STEP 1: Create Private GitHub Repository (Manual)

### On GitHub.com:

1. **Go to:** https://github.com/new

2. **Fill in Repository Details:**
   - **Repository name:** `ipp-mvp` (or your preferred name)
   - **Description:** `Instant Personalization Platform MVP - LexiLearn Extension`
   - **Visibility:** ⚫ **Private** (important for security)
   - **Initialize this repository with:**
     - ❌ Do NOT check "Add a README file"
     - ❌ Do NOT check "Add .gitignore"
     - ❌ Do NOT check "Choose a license"

3. **Click:** "Create repository"

4. **Copy the Repository URL** (you'll need it in Step 2)
   - Should look like: `https://github.com/YOUR_USERNAME/ipp-mvp.git`
   - Or: `https://github.com/YOUR_ORG/ipp-mvp.git`

---

## 📋 STEP 2: Connect Local Repo to GitHub (Manual + Scripted)

### Option A: HTTPS (Recommended for this setup)

**2a. Copy-paste these commands into your terminal:**

```bash
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Add remote (replace with YOUR actual GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/ipp-mvp.git

# Verify remote was added
git remote -v
# Should show:
# origin  https://github.com/YOUR_USERNAME/ipp-mvp.git (fetch)
# origin  https://github.com/YOUR_USERNAME/ipp-mvp.git (push)
```

**2b. If you get "remote already exists" error:**
```bash
# View current remotes
git remote -v

# Remove the old one (if wrong)
git remote remove origin

# Add the correct one
git remote add origin https://github.com/YOUR_USERNAME/ipp-mvp.git
```

### Option B: SSH (If you prefer)

**If you have SSH keys set up:**

```bash
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Add remote (SSH format)
git remote add origin git@github.com:YOUR_USERNAME/ipp-mvp.git

# Verify
git remote -v
```

---

## 🔐 STEP 3: Authenticate with GitHub

### For HTTPS:

**First push will prompt for authentication:**

```bash
git push -u origin main
# GitHub will prompt you to authenticate
```

**You have two options:**

**Option 3a: Personal Access Token (Recommended)**
1. Go to: https://github.com/settings/tokens
2. Click: "Generate new token (classic)"
3. Name it: `ipp-mvp-cli`
4. Select scopes:
   - ✅ `repo` (full control of private repositories)
5. Copy the token
6. When `git push` asks for password, **paste the token** (not your GitHub password)

**Option 3b: GitHub CLI (If installed)**
```bash
gh auth login
# Follow prompts to authenticate
```

**Option 3c: Git Credential Manager**
- If already configured on your machine, it will handle authentication automatically

---

## 🚀 STEP 4: Push Main Branch to GitHub

**Once authentication is set up, run:**

```bash
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Push main branch
git push -u origin main

# Verify on GitHub
# You should see main branch with 1 commit
```

---

## 🌿 STEP 5: Create Feature Branches

**Create and push the 3 feature branches:**

```bash
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Branch 1: Workspace Mode (Friend 1)
git checkout -b feature/workspace-mode
git push -u origin feature/workspace-mode

# Branch 2: Education Mode (Friend 2)
git checkout -b feature/education-mode
git push -u origin feature/education-mode

# Branch 3: Personalization Engine (Friend 3)
git checkout -b feature/personalization-engine
git push -u origin feature/personalization-engine

# Return to main
git checkout main

# Verify all branches created
git branch -a
# Should show:
#   main
#   feature/workspace-mode
#   feature/education-mode
#   feature/personalization-engine
#   remotes/origin/main
#   remotes/origin/feature/workspace-mode
#   remotes/origin/feature/education-mode
#   remotes/origin/feature/personalization-engine
```

---

## ✅ VERIFICATION CHECKLIST

After completing Steps 1-5, verify everything:

```bash
# 1. Check remote is configured
git remote -v
# Should show origin with your GitHub URL

# 2. Check current branch
git branch
# Should show: * main

# 3. Check all branches exist locally
git branch -a
# Should list all 4 branches (main + 3 features)

# 4. Check commit history
git log --oneline
# Should show: 1 commit (Initial commit: IPP MVP baseline...)
```

---

## 📤 Share GitHub URL with Your Team

**Once everything is verified, share this information with your 3 friends:**

```
GitHub Repository: https://github.com/YOUR_USERNAME/ipp-mvp
Visibility: Private

Each friend should:
1. Clone: git clone https://github.com/YOUR_USERNAME/ipp-mvp.git
2. Checkout their branch:
   - Friend 1: git checkout feature/workspace-mode
   - Friend 2: git checkout feature/education-mode
   - Friend 3: git checkout feature/personalization-engine
3. Read their role-specific brief
4. Start building!
```

---

## 🆘 TROUBLESHOOTING

### "Authentication failed"
- Verify your GitHub credentials
- If using HTTPS, ensure you're using Personal Access Token, not password
- Check token has `repo` scope
- Token may be expired — create a new one

### "Permission denied (publickey)"
- If using SSH, verify your SSH key is added to GitHub
- Go to: https://github.com/settings/keys
- Add your public key if not there

### "fatal: remote origin already exists"
- Run: `git remote remove origin`
- Then run the add command again

### "Repository not found"
- Verify the GitHub URL is correct
- Verify the repository is Private (not accidentally deleted)
- Check you have permission to push to it

### "Branch already exists"
- You may have already created it
- Run: `git branch -a` to see all branches
- If remote branch exists, pull instead: `git pull origin feature/YOUR-BRANCH`

---

## 📋 FINAL CHECKLIST

Before your team starts:

- [ ] GitHub repository created (Private)
- [ ] Main branch pushed to GitHub
- [ ] All 3 feature branches created and pushed
- [ ] Verified all branches visible on GitHub.com
- [ ] GitHub URL copied and ready to share
- [ ] Friends have read their role-specific briefs
- [ ] Friends know to clone and checkout their branch

---

## 🎯 NEXT ACTION

1. **You:**
   - Execute Steps 1-5 above
   - Verify everything works
   - Copy your GitHub URL

2. **Send to Friends:**
   - GitHub URL
   - Their role-specific brief (FRIEND1/2/3_*.md)
   - Link to TEAM_QUICK_START.md
   - Instructions to clone and checkout their branch

3. **Friends:**
   - Clone the repo
   - Checkout their branch
   - Read their brief
   - Start building (Days 2-3)

---

**Questions?** Refer to:
- This file (troubleshooting section above)
- TEAM_COLLABORATION_PLAN.md (complete reference)
- Your role-specific brief (after you send to friends)

---

**Status:** ✅ Ready to execute  
**Time to complete:** ~5-10 minutes  
**Next checkpoint:** All branches visible on GitHub.com

Good luck! 🚀
