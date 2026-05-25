
```
crypto
├─ back
│  ├─ .prettierrc
│  ├─ Dockerfile
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
│  │  │  └─ migration_lock.toml
│  │  └─ schema.prisma
│  ├─ README.md
│  ├─ src
│  │  ├─ analytics
│  │  │  ├─ index.controller.ts
│  │  │  ├─ index.module.ts
│  │  │  ├─ info.md
│  │  │  └─ portfolio-snapshot.service.ts
│  │  ├─ app.module.ts
│  │  ├─ common
│  │  │  └─ prisma
│  │  │     ├─ prisma.module.ts
│  │  │     └─ prisma.service.ts
│  │  ├─ config
│  │  │  ├─ app.config.ts
│  │  │  └─ env.ts
│  │  ├─ guards
│  │  ├─ interceptors
│  │  ├─ main.ts
│  │  ├─ modules
│  │  │  ├─ market
│  │  │  │  ├─ coin-resolver.service.ts
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
│  │  │     ├─ core
│  │  │     ├─ dto
│  │  │     │  ├─ create-transaction.dto.ts
│  │  │     │  └─ update-transaction.dto.ts
│  │  │     ├─ mappers
│  │  │     │  └─ transaction.mapper.ts
│  │  │     ├─ transaction.controller.ts
│  │  │     ├─ transaction.module.ts
│  │  │     ├─ transaction.service.ts
│  │  │     └─ types
│  │  │        └─ transaction.types.ts
│  │  └─ redis
│  │     ├─ info.txt
│  │     ├─ redis.module.ts
│  │     └─ redis.service.ts
│  ├─ tsconfig.build.json
│  └─ tsconfig.json
└─ front
   ├─ Dockerfile
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  ├─ favicon.svg
   │  └─ icons.svg
   ├─ README.md
   ├─ src
   │  ├─ api
   │  │  ├─ client.ts
   │  │  ├─ market.api.ts
   │  │  ├─ portfolio.api.ts
   │  │  └─ transaction.api.ts
   │  ├─ app
   │  │  └─ router.tsx
   │  ├─ App.css
   │  ├─ App.tsx
   │  ├─ components
   │  │  ├─ Analytics
   │  │  │  ├─ ChartPanel
   │  │  │  │  ├─ ChartPanel.css
   │  │  │  │  └─ ChartPanel.tsx
   │  │  │  ├─ PortfolioDistributionChart
   │  │  │  │  ├─ chart.config.ts
   │  │  │  │  ├─ PortfolioDistributionChart.css
   │  │  │  │  └─ PortfolioDistributionChart.tsx
   │  │  │  └─ PortfolioIndexChart
   │  │  │     ├─ index-chart.config.ts
   │  │  │     ├─ info.md
   │  │  │     ├─ PortfolioIndexChart.css
   │  │  │     └─ PortfolioIndexChart.tsx
   │  │  ├─ MarketRefreshIndicator
   │  │  │  ├─ CircularTtlIndicator.css
   │  │  │  ├─ CircularTtlIndicator.tsx
   │  │  │  └─ info.md
   │  │  ├─ Modal
   │  │  │  ├─ Modal.css
   │  │  │  ├─ ModalContext.ts
   │  │  │  └─ ModalProvider.tsx
   │  │  ├─ Navbar
   │  │  │  ├─ Navbar.css
   │  │  │  └─ Navbar.tsx
   │  │  ├─ Portfolio
   │  │  │  ├─ AssetSummary
   │  │  │  │  ├─ AssetSummary.css
   │  │  │  │  └─ AssetSummary.tsx
   │  │  │  ├─ PortfolioCard
   │  │  │  │  ├─ PortfolioCard.css
   │  │  │  │  └─ PortfolioCard.tsx
   │  │  │  ├─ PortfolioGrid
   │  │  │  │  ├─ PortfolioGrid.css
   │  │  │  │  └─ PortfolioGrid.tsx
   │  │  │  └─ PortfolioSummary
   │  │  │     ├─ PortfolioSummary.css
   │  │  │     └─ PortfolioSummary.tsx
   │  │  └─ TransactionForm
   │  │     ├─ AmountField.tsx
   │  │     ├─ info.md
   │  │     ├─ PriceField.tsx
   │  │     ├─ SymbolField.tsx
   │  │     ├─ TransactionForm.css
   │  │     ├─ TransactionForm.tsx
   │  │     ├─ useSymbolValidation.ts
   │  │     └─ useTransactionForm.ts
   │  ├─ hooks
   │  │  ├─ useCreateTransaction.ts
   │  │  ├─ useDeletePortfolioItem.ts
   │  │  ├─ useDeleteTransaction.ts
   │  │  ├─ useMarketData.ts
   │  │  ├─ useMarketSocket.ts
   │  │  ├─ useModal.ts
   │  │  ├─ usePortfolio.ts
   │  │  ├─ useTransactions.ts
   │  │  └─ useUpdateTransaction.ts
   │  ├─ index.css
   │  ├─ layouts
   │  │  ├─ RootLayout.css
   │  │  └─ RootLayout.tsx
   │  ├─ main.tsx
   │  ├─ pages
   │  │  ├─ AnalyticsPage
   │  │  │  ├─ AnalyticsPage.css
   │  │  │  └─ AnalyticsPage.tsx
   │  │  ├─ ErrorPage
   │  │  │  ├─ ErrorPage.css
   │  │  │  └─ ErrorPage.tsx
   │  │  ├─ PortfolioPage
   │  │  │  ├─ PortfolioPage.css
   │  │  │  └─ PortfolioPage.tsx
   │  │  └─ TransactionsPage
   │  │     ├─ TransactionsPage.css
   │  │     └─ TransactionsPage.tsx
   │  ├─ providers
   │  │  └─ QueryProvider.tsx
   │  ├─ types
   │  │  ├─ portfolio.types.ts
   │  │  └─ transaction.types.ts
   │  └─ utils
   │     ├─ calculateAssetPosition.ts
   │     └─ formatCoinName.ts
   ├─ tsconfig.app.json
   ├─ tsconfig.json
   ├─ tsconfig.node.json
   └─ vite.config.ts

```