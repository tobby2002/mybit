import React, { Component } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import Nexus from '@api/Nexus'
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome'

const { width, height } = Dimensions.get('window')

export default class Ticker extends React.Component {
    constructor(props) {
        super(props)
        this.token = props.token
        this.updateTicker = this.updateTicker.bind(this)
        this.index = props.index
        this.exchange = props.exchange
        this.exchangeKr = props.exchangeKr
        this.base = props.base
        this.state = {
            tickers: []
        }
        // 최초 실행.
        Nexus.runTicker(props.exchange, props.base)
        this.updateTicker()
        this.isConnect = true
    }
    goCoinDetail(exchange, base, coin) {
        Nexus.closeAll()
        this.props.navigation.navigate('coinDetail', {
            exchangeKr: this.exchangeKr,
            exchange: exchange,
            base: base,
            coin: coin
        })
    }
    updateTicker() {
        this._interval = setTimeout(() => {
            const tickers = Object.values(Nexus.getPriceInfo(this.exchange)[this.base])
            // TODO 변경사항에 있을때 highlight animate
            this.setState({
                tickers: tickers
            })
            this.updateTicker()
        }, 500)
    }
    componentWillReceiveProps(props) {
        if (this.index !== props.index) {
            clearTimeout(this._interval)
            this.isConnect = false
        } else if (this.index === props.index && !this.isConnect) {
            Nexus.runTicker(this.exchange, this.base)
            this.updateTicker()
            this.isConnect = true
        } else if (this.token === props.token && !Nexus.isSubscribe(this.exchange, 'ticker')) {
            Nexus.runTicker(this.exchange, this.base)
            this.updateTicker()
        }
    }
    shouldComponentUpdate() {
        return this.isConnect
    }
    render() {
        return (
            <FlatList
                data={this.state.tickers}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => {
                        if (item.ticker && item.ticker.tradePrice != 0) {
                            this.goCoinDetail(this.exchange, this.base, item.ticker.coin)
                        } else {
                            alert('거래불가 코인입니다.')
                        }
                    }}>
                        <View style={{
                            flex: 1,
                            flexDirection: 'row',
                            height: 50,
                            borderBottomWidth: 0.5,
                            borderBottomColor: '#bbb',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginHorizontal: 10
                        }}>
                            <Text style={{ width: width / 4 - 30, fontSize: 14, textAlign: 'left' }}>
                                {item.ticker ? item.ticker.coin : null}
                            </Text>
                            <Text style={{
                                width: width / 4,
                                fontSize: 14,
                                textAlign: 'right'
                            }}>
                                {item.ticker ? item.ticker.tradePrice : null}
                            </Text>
                            <Text style={{
                                width: width / 4 - 30,
                                fontSize: 14,
                                textAlign: 'right',
                                color: item.ticker ? (Number(item.ticker.changeRate) > 0 ? 'blue' : (Number(item.ticker.changeRate) < 0 ? 'red' : 'black')) : 'black'
                            }}>
                                {item.ticker ? item.ticker.changeRate + '%' : null}
                            </Text>
                            <Text style={{ width: width / 4 - 15, fontSize: 14, textAlign: 'right' }}>
                                {item.ticker ? item.ticker.tradeVolume : null}
                            </Text>
                            {/* <FontAwesomeIcon name="chevron-right" size={20} color="gray" /> */}
                        </View>
                    </TouchableOpacity>
                )}
            />
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 22
    },
    item: {
        padding: 10,
        fontSize: 18,
        height: 44,
        textAlign: 'center'
    },
})