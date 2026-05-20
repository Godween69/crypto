
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
│  │  │  └─ migration_lock.toml
│  │  └─ schema.prisma
│  ├─ README.md
│  ├─ src
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
   │  │  ├─ MarketRefreshIndicator
   │  │  │  ├─ info.md
   │  │  │  ├─ MarketRefreshIndicator.css
   │  │  │  └─ MarketRefreshIndicator.tsx
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
   │  │     └─ useTransactionForm.ts
   │  ├─ hooks
   │  │  ├─ useCreateTransaction.ts
   │  │  ├─ useDeletePortfolioItem.ts
   │  │  ├─ useDeleteTransaction.ts
   │  │  ├─ useMarketData.ts
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
   │  │  ├─ AnaliticPage
   │  │  │  ├─ AnaliticPage.css
   │  │  │  └─ AnaliticPage.tsx
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