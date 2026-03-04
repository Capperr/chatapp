# ChatApp — Opsætningsvejledning

## Krav
- Node.js (placeret i `C:\Users\caspe\node\`)
- En Supabase-konto (gratis på supabase.com)
- En GitHub-konto
- En Netlify-konto

---

## 1. Supabase opsætning

### Opret projekt
1. Gå til [supabase.com](https://supabase.com) → **New Project**
2. Notér din **Project URL** og **anon public key** (Settings → API)

### Kør database-schema
1. Gå til **SQL Editor** i Supabase
2. Kopier indholdet fra `supabase/schema.sql` og kør det
3. Gå til **Authentication → Settings** og sørg for at e-mail er aktiveret

### (Valgfrit) Slå e-mail bekræftelse fra under udvikling
- Authentication → Settings → Email → **Disable email confirmations**

---

## 2. Miljøvariabler

Opret filen `.env.local` i projektmappen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dit-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-nøgle
```

---

## 3. Kør lokalt

```bash
# Naviger til projektmappen i Command Prompt
cd C:\Users\caspe\chatapp

# Installer afhængigheder (første gang)
C:\Users\caspe\node\npm.cmd install

# Start udviklerserveren
C:\Users\caspe\node\npm.cmd run dev
```

Åbn browseren på http://localhost:3000

---

## 4. GitHub opsætning

```bash
# 1. Log ind på github.com og opret et nyt tomt repository
#    Kald det f.eks. "chatapp"

# 2. Åbn Command Prompt og naviger til mappen
cd C:\Users\caspe\chatapp

# 3. Forbind til GitHub (erstat med din egen URL)
git remote add origin https://github.com/DIT-BRUGERNAVN/chatapp.git

# 4. Push kode
git branch -M main
git push -u origin main
```

---

## 5. Netlify deployment

### Via Netlify UI (anbefalet)
1. Gå til [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Vælg GitHub og dit `chatapp` repository
3. Build settings er allerede sat i `netlify.toml`
4. Tilføj miljøvariabler:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Installer Netlify's Next.js plugin via deres UI
6. Tryk **Deploy site**

### Supabase URL i produktion
I Supabase → Authentication → URL Configuration:
- **Site URL**: `https://din-app.netlify.app`
- **Redirect URLs**: `https://din-app.netlify.app/**`

---

## Projektstruktur

```
chatapp/
├── app/
│   ├── (auth)/login/       ← Login side
│   ├── (auth)/register/    ← Oprettelsesside
│   ├── (main)/chat/        ← Fælles chat (realtid)
│   ├── (main)/profile/     ← Profil side
│   └── api/auth/callback/  ← Supabase auth callback
├── components/
│   ├── auth/               ← Login & register formularer
│   ├── chat/               ← ChatRoom, ChatMessage, ChatInput
│   ├── profile/            ← Profilformular
│   ├── providers/          ← ThemeProvider
│   └── ui/                 ← Navbar, ThemeToggle, Avatar
├── lib/supabase/           ← Supabase klient (browser + server)
├── types/                  ← TypeScript typer
├── supabase/schema.sql     ← Database schema
├── middleware.ts           ← Auth routing
└── netlify.toml           ← Netlify konfiguration
```
