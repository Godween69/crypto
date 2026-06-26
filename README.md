
```
crypto
├─ back
│  ├─ .prettierrc
│  ├─ Dockerfile.dev
│  ├─ diag-fetch.mjs
│  ├─ eslint.config.mjs
│  ├─ nest-cli.json
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ prisma
│  │  ├─ migrations
│  │  │  ├─ 20260510220931_init
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260512131027_dobavil_spisok_monet
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260522130115_add_portfolio_snapshot_with_granularity
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260526120617_add_multi_user_auth
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260526121009_sync_schema_after_manual_migration
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260528084536_add_email_verified_and_role
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260528130803_add_yandex_oauth_fields
│  │  │  │  └─ migration.sql
│  │  │  ├─ 20260601160620_add_image_to_coin
│  │  │  │  └─ migration.sql
│  │  │  └─ migration_lock.toml
│  │  └─ schema.prisma
│  ├─ src
│  │  ├─ analytics
│  │  │  ├─ index.controller.ts
│  │  │  ├─ index.module.ts
│  │  │  ├─ info.md
│  │  │  └─ portfolio-snapshot.service.ts
│  │  ├─ app.module.ts
│  │  ├─ assets
│  │  │  └─ coinlore-assets.json
│  │  ├─ common
│  │  │  └─ prisma
│  │  │     ├─ prisma.module.ts
│  │  │     └─ prisma.service.ts
│  │  ├─ main.ts
│  │  ├─ modules
│  │  │  ├─ auth
│  │  │  │  ├─ auth.controller.ts
│  │  │  │  ├─ auth.module.ts
│  │  │  │  ├─ auth.service.ts
│  │  │  │  ├─ decorators
│  │  │  │  │  ├─ current-user.decorator.ts
│  │  │  │  │  ├─ public.decorator.ts
│  │  │  │  │  └─ roles.decorator.ts
│  │  │  │  ├─ dto
│  │  │  │  │  ├─ forgot-password.dto.ts
│  │  │  │  │  ├─ login.dto.ts
│  │  │  │  │  ├─ register.dto.ts
│  │  │  │  │  └─ reset-password.dto.ts
│  │  │  │  ├─ guards
│  │  │  │  │  ├─ jwt-auth.guard.ts
│  │  │  │  │  ├─ jwt-ws.guard.ts
│  │  │  │  │  └─ roles.guard.ts
│  │  │  │  ├─ info.md
│  │  │  │  ├─ interceptors
│  │  │  │  │  └─ user-context.interceptor.ts
│  │  │  │  ├─ middleware
│  │  │  │  │  └─ user-context.middleware.ts
│  │  │  │  ├─ strategies
│  │  │  │  │  ├─ jwt.strategy.ts
│  │  │  │  │  └─ yandex.strategy.ts
│  │  │  │  └─ validators
│  │  │  │     └─ allowed-email-domain.validator.ts
│  │  │  ├─ email
│  │  │  │  ├─ email.module.ts
│  │  │  │  └─ email.service.ts
│  │  │  ├─ market
│  │  │  │  ├─ coin.repository.ts
│  │  │  │  ├─ info.md
│  │  │  │  ├─ market.controller.ts
│  │  │  │  ├─ market.gateway.ts
│  │  │  │  ├─ market.module.ts
│  │  │  │  ├─ market.service.ts
│  │  │  │  └─ types
│  │  │  │     └─ market.types.ts
│  │  │  ├─ portfolio
│  │  │  │  ├─ core
│  │  │  │  │  └─ calculatePortfolio.ts
│  │  │  │  ├─ portfolio.controller.ts
│  │  │  │  ├─ portfolio.module.ts
│  │  │  │  ├─ portfolio.service.ts
│  │  │  │  └─ types
│  │  │  │     └─ portfolio.types.ts
│  │  │  └─ transaction
│  │  │     ├─ dto
│  │  │     │  ├─ create-transaction.dto.ts
│  │  │     │  ├─ transaction-response.dto.ts
│  │  │     │  └─ update-transaction.dto.ts
│  │  │     ├─ mappers
│  │  │     │  └─ transaction.mapper.ts
│  │  │     ├─ transaction.controller.ts
│  │  │     ├─ transaction.module.ts
│  │  │     ├─ transaction.service.ts
│  │  │     └─ types
│  │  │        └─ transaction.types.ts
│  │  ├─ providers
│  │  │  ├─ coingecko
│  │  │  │  ├─ coingecko.provider.ts
│  │  │  │  └─ coingecko.resolver.ts
│  │  │  ├─ coinlore
│  │  │  │  └─ coinlore.provider.ts
│  │  │  ├─ info.md
│  │  │  └─ market-provider.interface.ts
│  │  ├─ redis
│  │  │  ├─ info.txt
│  │  │  ├─ redis.module.ts
│  │  │  └─ redis.service.ts
│  │  └─ types
│  │     └─ passport-yandex.d.ts
│  ├─ tsconfig.build.json
│  └─ tsconfig.json
├─ docker-compose.dev.yml
├─ front
│  ├─ Dockerfile.dev
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ api
│  │  │  ├─ client.ts
│  │  │  ├─ market.api.ts
│  │  │  ├─ portfolio.api.ts
│  │  │  └─ transaction.api.ts
│  │  ├─ app
│  │  │  └─ router.tsx
│  │  ├─ components
│  │  │  ├─ Analytics
│  │  │  │  ├─ ChartPanel
│  │  │  │  │  ├─ ChartPanel.css
│  │  │  │  │  └─ ChartPanel.tsx
│  │  │  │  ├─ PortfolioDistributionChart
│  │  │  │  │  ├─ PortfolioDistributionChart.css
│  │  │  │  │  ├─ PortfolioDistributionChart.tsx
│  │  │  │  │  └─ chart.config.ts
│  │  │  │  └─ PortfolioIndexChart
│  │  │  │     ├─ PortfolioIndexChart.css
│  │  │  │     ├─ PortfolioIndexChart.tsx
│  │  │  │     ├─ index-chart.config.ts
│  │  │  │     └─ info.md
│  │  │  ├─ Auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ AuthHero.tsx
│  │  │  │  ├─ AuthLayout.tsx
│  │  │  │  ├─ FormField.tsx
│  │  │  │  ├─ OAuthButtons.tsx
│  │  │  │  └─ PasswordInput.tsx
│  │  │  ├─ MarketRefreshIndicator
│  │  │  │  ├─ CircularTtlIndicator.css
│  │  │  │  ├─ CircularTtlIndicator.tsx
│  │  │  │  └─ info.md
│  │  │  ├─ Modal
│  │  │  │  ├─ Modal.css
│  │  │  │  ├─ ModalContext.ts
│  │  │  │  └─ ModalProvider.tsx
│  │  │  ├─ Navbar
│  │  │  │  ├─ Navbar.css
│  │  │  │  └─ Navbar.tsx
│  │  │  ├─ Portfolio
│  │  │  │  ├─ AssetSummary
│  │  │  │  │  ├─ AssetSummary.css
│  │  │  │  │  └─ AssetSummary.tsx
│  │  │  │  ├─ PortfolioCard
│  │  │  │  │  ├─ PortfolioCard.css
│  │  │  │  │  └─ PortfolioCard.tsx
│  │  │  │  ├─ PortfolioGrid
│  │  │  │  │  ├─ PortfolioGrid.css
│  │  │  │  │  └─ PortfolioGrid.tsx
│  │  │  │  └─ PortfolioSummary
│  │  │  │     ├─ PortfolioSummary.css
│  │  │  │     ├─ PortfolioSummary.tsx
│  │  │  │     └─ info.md
│  │  │  ├─ ProtectedRoute.tsx
│  │  │  └─ TransactionForm
│  │  │     ├─ AmountField.tsx
│  │  │     ├─ PriceField.tsx
│  │  │     ├─ SymbolField.tsx
│  │  │     ├─ TransactionForm.css
│  │  │     ├─ TransactionForm.tsx
│  │  │     ├─ info.md
│  │  │     ├─ useSymbolValidation.ts
│  │  │     └─ useTransactionForm.ts
│  │  ├─ hooks
│  │  │  ├─ useCreateTransaction.ts
│  │  │  ├─ useDeletePortfolioItem.ts
│  │  │  ├─ useDeleteTransaction.ts
│  │  │  ├─ useMarketData.ts
│  │  │  ├─ useMarketSocket.ts
│  │  │  ├─ useModal.ts
│  │  │  ├─ usePasswordStrength.ts
│  │  │  ├─ usePortfolio.ts
│  │  │  ├─ useProtectedRoute.ts
│  │  │  ├─ useTransactions.ts
│  │  │  └─ useUpdateTransaction.ts
│  │  ├─ index.css
│  │  ├─ layouts
│  │  │  ├─ RootLayout.css
│  │  │  └─ RootLayout.tsx
│  │  ├─ main.tsx
│  │  ├─ pages
│  │  │  ├─ AnalyticsPage
│  │  │  │  ├─ AnalyticsPage.css
│  │  │  │  └─ AnalyticsPage.tsx
│  │  │  ├─ Auth
│  │  │  │  ├─ ForgotPasswordPage.tsx
│  │  │  │  ├─ LoginPage.tsx
│  │  │  │  ├─ OAuthSuccessPage.tsx
│  │  │  │  ├─ RegisterPage.tsx
│  │  │  │  ├─ ResetPasswordPage.tsx
│  │  │  │  └─ VerifyEmailPage.tsx
│  │  │  ├─ ErrorPage
│  │  │  │  ├─ ErrorPage.css
│  │  │  │  └─ ErrorPage.tsx
│  │  │  ├─ PortfolioPage
│  │  │  │  ├─ PortfolioPage.css
│  │  │  │  └─ PortfolioPage.tsx
│  │  │  └─ TransactionsPage
│  │  │     ├─ TransactionsPage.css
│  │  │     └─ TransactionsPage.tsx
│  │  ├─ providers
│  │  │  └─ QueryProvider.tsx
│  │  ├─ store
│  │  │  └─ authStore.ts
│  │  ├─ types
│  │  │  ├─ portfolio.types.ts
│  │  │  └─ transaction.types.ts
│  │  └─ utils
│  │     ├─ auth.schemas.ts
│  │     └─ formatCoinName.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
└─ info.md

```