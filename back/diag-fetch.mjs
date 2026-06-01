// back/diag-fetch.mjs
// Минимальный тест: встроенный fetch без внешних зависимостей
console.log('🔍 Тест: чистый fetch к CoinLore');

(async () => {
  try {
    const start = Date.now();

    const response = await fetch('https://api.coinlore.net/api/assets/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/144.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    console.log('✅ Статус:', response.status);
    console.log('✅ Заголовки:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('✅ Длина тела:', text.length, 'байт');
    console.log('✅ Время:', Date.now() - start, 'мс');

    // Попробуем распарсить
    const data = JSON.parse(text);
    console.log(
      '✅ Монет:',
      Array.isArray(data) ? data.length : data.info?.coins_num,
    );
  } catch (error) {
    console.error('❌ Ошибка:', {
      name: error.name,
      message: error.message,
      code: error.code,
      cause: error.cause?.message,
    });
  }
})();
