# إعداد Auto-Commit (لإني أقدر أعمل commit و push تلقائي)

## الطريقة: استخدام GitHub CLI (`gh`)

بعد ما تعمل الإعداد ده **مرة واحدة**، أنا (الـ AI) هقدر أعمل commit و push على GitHub بنفسي بدون ما تحتاج تعمل push من Terminal.

---

## الخطوة 1: تثبيت GitHub CLI

### على Mac:
```bash
brew install gh
```

### على Linux:
```bash
# Ubuntu/Debian
sudo apt install gh

# أو من الموقع الرسمي
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### على Windows:
```powershell
winget install --id GitHub.cli
```

---

## الخطوة 2: تسجيل الدخول

```bash
gh auth login
```

اتبع الخطوات:
1. **GitHub.com** → Enter
2. **HTTPS** → Enter
3. **Authenticate Git with your GitHub credentials?** → **Yes**
4. **How would you like to authenticate?** → **Login with a web browser**
5. اضغط **Enter** - هيفتح المتصفح
6. في المتصفح: اضغط **Authorize github**
7. في Terminal: اضغط **Enter** بعد ما تخلص

---

## الخطوة 3: اختبار

```bash
gh auth status
```

المفروض يطلع:
```
✓ Logged in to github.com as YOUR_USERNAME
```

---

## الخطوة 4: تفعيل Auto-Push في Git

```bash
cd /Users/ahmedhamdy/Documents/agentforge
git config --global credential.helper osxkeychain  # على Mac
# أو
git config --global credential.helper store       # على Linux/Windows
```

---

## بعد الإعداد

بعد ما تعمل الخطوات دي، أنا (الـ AI) هقدر:

1. **أعمل commit:**
   ```bash
   git add <files>
   git commit -m "message"
   ```

2. **أعمل push باستخدام GitHub CLI:**
   ```bash
   gh repo sync  # أو
   git push origin main  # مع gh authentication هيشتغل تلقائي
   ```

---

## ملاحظات

- الـ authentication هيتحفظ في `~/.config/gh/` - مش محتاج تعمله تاني
- لو حصل أي مشكلة، شغّل `gh auth refresh` لتحديث الـ token
- لو عايز تسحب الـ authentication: `gh auth logout`

---

## بديل: استخدام GitHub Actions (أكثر تعقيداً)

لو مش عايز تستخدم GitHub CLI، ممكن نعمل GitHub Actions workflow يرفع تلقائي، بس ده محتاج setup أكتر.

---

**بعد ما تعمل الإعداد، قول لي "خلص" وأنا هجرب أعمل commit و push تلقائي.**
