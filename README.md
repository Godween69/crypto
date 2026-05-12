
```
crypto
├─ back
│  ├─ .env
│  ├─ .prettierrc
│  ├─ dist
│  │  ├─ src
│  │  │  ├─ app.module.d.ts
│  │  │  ├─ app.module.js
│  │  │  ├─ app.module.js.map
│  │  │  ├─ common
│  │  │  │  └─ prisma
│  │  │  │     ├─ prisma.module.d.ts
│  │  │  │     ├─ prisma.module.js
│  │  │  │     ├─ prisma.module.js.map
│  │  │  │     ├─ prisma.service.d.ts
│  │  │  │     ├─ prisma.service.js
│  │  │  │     └─ prisma.service.js.map
│  │  │  ├─ config
│  │  │  │  ├─ app.config.d.ts
│  │  │  │  ├─ app.config.js
│  │  │  │  ├─ app.config.js.map
│  │  │  │  ├─ env.d.ts
│  │  │  │  ├─ env.js
│  │  │  │  └─ env.js.map
│  │  │  ├─ main.d.ts
│  │  │  ├─ main.js
│  │  │  ├─ main.js.map
│  │  │  ├─ modules
│  │  │  │  ├─ market
│  │  │  │  │  ├─ coin-resolver.service.d.ts
│  │  │  │  │  ├─ coin-resolver.service.js
│  │  │  │  │  ├─ coin-resolver.service.js.map
│  │  │  │  │  ├─ coin.repository.d.ts
│  │  │  │  │  ├─ coin.repository.js
│  │  │  │  │  ├─ coin.repository.js.map
│  │  │  │  │  ├─ market.controller.d.ts
│  │  │  │  │  ├─ market.controller.js
│  │  │  │  │  ├─ market.controller.js.map
│  │  │  │  │  ├─ market.module.d.ts
│  │  │  │  │  ├─ market.module.js
│  │  │  │  │  ├─ market.module.js.map
│  │  │  │  │  ├─ market.service.d.ts
│  │  │  │  │  ├─ market.service.js
│  │  │  │  │  ├─ market.service.js.map
│  │  │  │  │  └─ types
│  │  │  │  │     ├─ market.types.d.ts
│  │  │  │  │     ├─ market.types.js
│  │  │  │  │     └─ market.types.js.map
│  │  │  │  ├─ portfolio
│  │  │  │  │  ├─ core
│  │  │  │  │  │  ├─ calculatePortfolio.d.ts
│  │  │  │  │  │  ├─ calculatePortfolio.js
│  │  │  │  │  │  └─ calculatePortfolio.js.map
│  │  │  │  │  ├─ portfolio.controller.d.ts
│  │  │  │  │  ├─ portfolio.controller.js
│  │  │  │  │  ├─ portfolio.controller.js.map
│  │  │  │  │  ├─ portfolio.module.d.ts
│  │  │  │  │  ├─ portfolio.module.js
│  │  │  │  │  ├─ portfolio.module.js.map
│  │  │  │  │  ├─ portfolio.service.d.ts
│  │  │  │  │  ├─ portfolio.service.js
│  │  │  │  │  ├─ portfolio.service.js.map
│  │  │  │  │  └─ types
│  │  │  │  │     ├─ portfolio.types.d.ts
│  │  │  │  │     ├─ portfolio.types.js
│  │  │  │  │     └─ portfolio.types.js.map
│  │  │  │  └─ transaction
│  │  │  │     ├─ dto
│  │  │  │     │  ├─ create-transaction.dto.d.ts
│  │  │  │     │  ├─ create-transaction.dto.js
│  │  │  │     │  ├─ create-transaction.dto.js.map
│  │  │  │     │  ├─ update-transaction.dto.d.ts
│  │  │  │     │  ├─ update-transaction.dto.js
│  │  │  │     │  └─ update-transaction.dto.js.map
│  │  │  │     ├─ mappers
│  │  │  │     │  ├─ transaction.mapper.d.ts
│  │  │  │     │  ├─ transaction.mapper.js
│  │  │  │     │  └─ transaction.mapper.js.map
│  │  │  │     ├─ transaction.controller.d.ts
│  │  │  │     ├─ transaction.controller.js
│  │  │  │     ├─ transaction.controller.js.map
│  │  │  │     ├─ transaction.module.d.ts
│  │  │  │     ├─ transaction.module.js
│  │  │  │     ├─ transaction.module.js.map
│  │  │  │     ├─ transaction.service.d.ts
│  │  │  │     ├─ transaction.service.js
│  │  │  │     ├─ transaction.service.js.map
│  │  │  │     └─ types
│  │  │  │        ├─ transaction.types.d.ts
│  │  │  │        ├─ transaction.types.js
│  │  │  │        └─ transaction.types.js.map
│  │  │  └─ redis
│  │  │     ├─ redis.module.d.ts
│  │  │     ├─ redis.module.js
│  │  │     ├─ redis.module.js.map
│  │  │     ├─ redis.service.d.ts
│  │  │     ├─ redis.service.js
│  │  │     └─ redis.service.js.map
│  │  ├─ test
│  │  │  ├─ app.e2e-spec.d.ts
│  │  │  ├─ app.e2e-spec.js
│  │  │  └─ app.e2e-spec.js.map
│  │  └─ tsconfig.tsbuildinfo
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
│  │  ├─ logger
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
│  │  │  │  ├─ types
│  │  │  │  │  └─ portfolio.types.ts
│  │  │  │  └─ utils
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
│  │     ├─ redis.module.ts
│  │     └─ redis.service.ts
│  ├─ test
│  │  ├─ app.e2e-spec.ts
│  │  └─ jest-e2e.json
│  ├─ tsconfig.build.json
│  └─ tsconfig.json
├─ front
│  ├─ .env
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api
│  │  │  ├─ client.ts
│  │  │  ├─ market.api.ts
│  │  │  ├─ portfolio.api.ts
│  │  │  └─ transaction.api.ts
│  │  ├─ app
│  │  │  └─ router.tsx
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ components
│  │  │  ├─ Layout
│  │  │  ├─ Modal
│  │  │  │  ├─ Modal.css
│  │  │  │  ├─ ModalContext.ts
│  │  │  │  └─ ModalProvider.tsx
│  │  │  ├─ Navbar
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
│  │  │  │     └─ PortfolioSummary.tsx
│  │  │  └─ TransactionForm
│  │  │     ├─ TransactionForm.css
│  │  │     └─ TransactionForm.tsx
│  │  ├─ hooks
│  │  │  ├─ useCreateTransaction.ts
│  │  │  ├─ useDeletePortfolioItem.ts
│  │  │  ├─ useDeleteTransaction.ts
│  │  │  ├─ useMarketData.ts
│  │  │  ├─ useModal.ts
│  │  │  ├─ usePortfolio.ts
│  │  │  ├─ useTransactions.ts
│  │  │  └─ useUpdateTransaction.ts
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ pages
│  │  │  ├─ PortfolioPage
│  │  │  │  ├─ PortfolioPage.css
│  │  │  │  └─ PortfolioPage.tsx
│  │  │  └─ TransactionsPage
│  │  │     ├─ TransactionsPage.css
│  │  │     └─ TransactionsPage.tsx
│  │  ├─ providers
│  │  │  └─ QueryProvider.tsx
│  │  ├─ types
│  │  │  ├─ portfolio.types.ts
│  │  │  └─ transaction.types.ts
│  │  └─ utils
│  │     └─ calculateAssetPosition.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
└─ README.md

```