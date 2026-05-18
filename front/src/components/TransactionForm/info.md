TransactionForm/
├── useTransactionForm.ts   ← Вся логика: RHF, стейт, эффекты, API, валидация, submit
├── TransactionForm.tsx     ← Только layout, refs и keyboard-навигация (~70 строк)
├── SymbolField.tsx         ← BUY input / SELL select + uppercase + blur-триггер
├── AmountField.tsx         ← Количество + чекбокс "Продать всё"
├── PriceField.tsx          ← Цена + чекбокс "Рыночная цена" + подсказка
└── TransactionForm.css     ← Стили (без изменений)