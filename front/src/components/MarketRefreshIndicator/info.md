1. Бэкенд возвращает { data: [...], nextRefreshIn: 300 }
   ↓
2. PortfolioPage рендерит:
   <MarketRefreshIndicator key={300} seconds={300} />
   ↓
3. React монтирует новый инстанс компонента:
   • useState(0) → progress = 0
   • useEffect запускает setInterval с шагом 100/300 %/сек
   ↓
4. Каждую секунду setProgress обновляет состояние → полоска растёт
   ↓
5. Через 5 минут бэкенд обновляет кэш → nextRefreshIn снова 300
   ↓
6. React видит: key изменился (был 0, стал 300) → старый компонент удаляется, новый монтируется
   ↓
7. Новый инстанс начинает с progress = 0 → цикл замыкается
