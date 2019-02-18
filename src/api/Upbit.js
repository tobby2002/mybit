import { config } from '~/Config'
import Base from '@api/Base'
import Utils from '~/Utils'
import numeral from 'numeral'

/**
 * upbit api
 */

class Upbit extends Base {
  constructor() {
    super(config.exchanges.upbit)
  }
  ticker(base) {
    const keys = Object.values(this.marketKeyMap[base])
    .map(marketKey => marketKey.key)
    this.newWebsocket({
      type: 'ticker',
      format: this.formatTicker,
      initSend: JSON.stringify([
        { ticket: 'ticker' }, 
        { type: 'ticker', 
          codes: keys
        }])
    })
  }
  formatTicker = async (message) => {
    let data = JSON.parse(await new Response(message).text())
    let { base, coin } = this.revMarketKeyMap[data['code']]
    if (base === 'KRW') {
      tradePrice = numeral(data['trade_price']).format('0,000[.]00')
      changeRate = numeral(data['signed_change_rate']).format('0,0[.]00a%')
      tradeVolume = numeral(data['acc_trade_price']).format('0,0[.]00a')
      tradeVolume=tradeVolume.replace('b', '억').replace('m', '백만').replace('k', '만')
    } else if (base.startsWith('USD')) {
      tradePrice = numeral(data['trade_price']).format('0,0[.]00a')
      changeRate = numeral(data['signed_change_rate']).format('0,0[.]00a%')
      tradeVolume = numeral(data['acc_trade_price']).format('0,0[.]000a')
    } else {
      tradePrice = numeral(data['trade_price']).format('0,0[.]00000000a')
      if (isNaN(tradePrice)) {
        tradePrice = '0.000000' + (data['trade_price'] * 100000000).toFixed(0)
      }
      changeRate = numeral(data['signed_change_rate']).format('0,0[.]00a%')
      tradeVolume = numeral(data['acc_trade_price']).format('0,0[.]000a')
    }
    return {
      base: base,
      coin: coin,
      changeRate: changeRate,
      tradePrice: tradePrice,
      tradeVolume: tradeVolume
    }
  }
  orderbook(base, coin) {
    const key = this.marketKeyMap[base][coin].key
    const cfg = {
      type: 'orderbook',
      format: this.formatOrderbook,
      initSend: JSON.stringify([
        { ticket: 'orderbook' }, 
        { type: 'orderbook', 
          codes: [key] }
        ])
    }
    this.newWebsocket(cfg)
  }
  formatOrderbook = async (message) => {
    let data = JSON.parse(await new Response(message).text())
    let { base, coin } = this.revMarketKeyMap[data['code']]
    let asks = []
    let bids = []
    data['orderbook_units'].forEach(orderbook => {
      asks.push({
        price: numeral(orderbook['ask_price']).format('0,000[.]00'),
        size: orderbook['ask_size'],
        unit: 'ask'
      })
      bids.push({
        price: numeral(orderbook['bid_price']).format('0,000[.]00'),
        size: orderbook['bid_size'],
        unit: 'bid'
      })
    })

    return {
      base: base,
      coin: coin,
      units: asks.reverse().concat(bids),
      time: data['timestamp']
    }
  }

}
export default new Upbit()
