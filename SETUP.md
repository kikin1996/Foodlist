# FoodList – Setup Guide

## Požadavky
- Node.js 20+
- Účet na [Supabase](https://supabase.com) (databáze)
- API klíč [Anthropic](https://console.anthropic.com) (Claude AI)
- Účet na [Rohlík.cz](https://www.rohlik.cz)

## 1. Instalace

```bash
npm install
```

## 2. Konfigurace prostředí

Zkopírujte `.env.local.example` do `.env.local` a vyplňte:

```bash
cp .env.local.example .env.local
```

### Supabase
1. Vytvořte projekt na [supabase.com](https://supabase.com)
2. Jděte do Settings → Database → Connection string
3. Zkopírujte **Transaction** URL jako `DATABASE_URL` (s `?pgbouncer=true`)
4. Zkopírujte **Direct** URL jako `DIRECT_URL`

### NextAuth Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Encryption Key (pro šifrování Rohlík hesel)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Anthropic API Key
Získejte na [console.anthropic.com](https://console.anthropic.com)

## 3. Databáze

```bash
npm run db:push
```

## 4. Spuštění

```bash
npm run dev
```

Otevřete [http://localhost:3000](http://localhost:3000)

## Architektura

```
src/
  app/
    (auth)/         # Login, Register stránky
    api/            # API routes
      auth/         # NextAuth + registrace
      meal-plan/    # Generování jídelníčku + objednávka
      orders/       # Potvrzení objednávky
      user/         # Profil a preference
    dashboard/      # Hlavní dashboard
    onboarding/     # Nastavení nového uživatele
    preferences/    # Úprava nastavení
  components/       # React komponenty
  lib/
    auth.ts         # NextAuth konfigurace
    db.ts           # Prisma klient
    encryption.ts   # AES-256-GCM šifrování
    meal-planner.ts # Claude API - generování jídelníčků
    rohlik.ts       # Rohlík MCP integrace

prisma/
  schema.prisma     # Databázové schema
```

## Flow objednávky

1. Uživatel klikne "Vygenerovat jídelníček"
2. Claude AI vygeneruje 7-denní plán + recepty + nákupní seznam
3. Uživatel klikne "Nakoupit na Rohlíku"
4. Claude se připojí k Rohlík MCP serveru (přes `https://mcp.rohlik.cz/mcp`)
5. Claude prohledá produkty a přidá je do košíku
6. Uživatel dostane odkaz na košík, zkontroluje a potvrdí

> **Poznámka:** Dle Rohlík ToS musí objednávku finálně potvrdit zákazník přímo na Rohlík.cz.

## Bezpečnost

- Hesla uživatelů: bcrypt (cost 12)
- Rohlík hesla: AES-256-GCM s unikátním IV pro každé šifrování
- Rohlík přihlášení: credentials jsou posílány přímo na `mcp.rohlik.cz` přes HTTPS
- Session: JWT (HTTPOnly cookie)
