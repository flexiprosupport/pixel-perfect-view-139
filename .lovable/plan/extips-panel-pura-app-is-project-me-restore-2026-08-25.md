# Extips Panel — pura app is project me restore

Upload kiye gaye zip me pura purana app hai: ~40 pages (user + admin + legal), 100+ components, 36 backend functions aur 175 DB migrations. Ye project TanStack Start par hai, jabki purana app React Router par tha — isliye code copy hoga aur routing layer naye tarike se banega.

Backend aap apna dete hain (existing Supabase/API keys), isliye database aur saare backend functions jaise hain waise hi rehte hain — sirf frontend usse connect hoga.

## Kya banega

**1. Base setup**
- Zip ke saare dependencies install (Radix UI, recharts, react-hook-form, zod, sonner, fontsource, etc.)
- `src/index.css` ka design system + Tailwind config port (theme, fonts, colors) taaki look bilkul same rahe
- Public assets (logo, favicon, og-image, manifest, robots, sitemap) restore

**2. Saara code copy**
- `src/components/*` (ui, admin, engagement, layout, chat, subscription, organic, seo), `src/hooks/*`, `src/lib/*`, `src/integrations/supabase/*` as-is aa jayenge

**3. Routing port (React Router → TanStack)**
Har page ka apna route file banega, same URL paths ke saath:
- Public: `/`, `/auth`, legal pages (terms, privacy, refund, cookie, contact, about, shipping)
- User (login required): dashboard, orders, wallet, settings, support, api-access, engagement order + orders + detail
- Admin (admin-only): admin home, users, services, bundles, deposits, subscriptions, chat, cron monitor, provider accounts, service mapping, audit log, oxapay events, popup ad, topup plan
- `App.tsx` ke providers (Auth, Currency, Tooltip, QueryClient, Toaster, ScrollToTop, error boundary, popup ad, maintenance mode, subscription guard) root layout me shift honge
- Protected pages `_authenticated` layout ke andar, admin pages upar se AdminGuard ke saath
- `PageMeta` ki jagah har route ka apna `head()` (title/description/OG) — SEO same rahega
- 404 page port

**4. Backend connect**
- Aap ke diye Supabase URL / publishable key / project id secrets me save honge
- Frontend usi existing project ke edge functions (`place-order`, wallet, payment webhooks, engagement runs, etc.) ko pehle jaise `functions.invoke` se call karega — un functions ko dobara likhne ki zarurat nahi
- Zip ki migrations/SQL sirf reference ke liye rakhi jayengi (jab tak aap naya DB banane ko na kaho)

**5. Verify**
- Build green, home + auth + dashboard + ek admin page browser me check, console errors clear

## Technical notes
- `src/pages/*` ko `src/routes/*` file-based routes me convert kiya jayega; `routeTree.gen.ts` auto-generate hoga
- `react-router-dom` install nahi hoga; `Link`/`useNavigate`/`useParams` TanStack Router ke equivalents se replace
- `index.html` / `main.tsx` / `App.tsx` ki jagah `__root.tsx` + `src/router.tsx` (already maujood)
- Tailwind v4 (`src/styles.css`) me purana `tailwind.config.ts` theme port hoga, `postcss.config.js` ki zarurat nahi
- Browser-only libs (charts, drawing canvas) SSR-safe wrapping ke saath
- Payment webhooks (oxapay/plisio/zapupi) purane Supabase project par hi point karte rahenge — URL badalna ho to alag se batayein

## Aap se chahiye
- Supabase project URL, publishable/anon key, project id (secrets me daal denge)
- Confirm: purana domain/webhook config waise hi rahega ya naye URL par shift karna hai
