export const config = {
  exchanges: {
    upbit: {
      id: 'upbit',
      engName: 'Upbit',
      korName: '업비트',
      ws: {
        url: 'wss://api.upbit.com/websocket/v1'
      }
    }
  },
  getExchangeLabels: () => {
    return Object.values(config.exchanges).map(exchange => {
      return { key: exchange.id, title: exchange.korName }
    })
  }
}


/*
bitmex: {
  id: 'bitmex',
  engName: 'Bitmex',
  korName: '비트맥스',
  displayCurrencyUnit: 'USD',
  ws: {
    url: ''
  }
},
bithumb: {
  id: 'bithumb',
  engName: 'Bithumb',
  korName: '빗썸',
  displayCurrencyUnit: 'KRW',
  ws: null
},
binance: {
  id: 'binance',
  engName: 'Binance',
  korName: '바이낸스',
  displayCurrencyUnit: 'USDT',
  ws: {
    url: ''
  }
}
*/
