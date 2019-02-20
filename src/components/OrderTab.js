import React, { Component } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Dimensions, AsyncStorage } from 'react-native'
import Nexus from '@api/Nexus'
import RNPickerSelect from 'react-native-picker-select'
import { exchangeKeyId } from '@constants/StorageKey'
import numeral from 'numeral'

const { width, height } = Dimensions.get('window')

const viewType = {
    buy: true,
    sell: false
}

export default class OrderTab extends Component {
    constructor(props) {
        super(props)
        this.isScrollTo = true
        this.state = {
            units: [],
            viewType: viewType.buy, //default view type
            orderType: 'market',
            orderTypes: [
                {
                    label: '시장가',
                    value: 'market',
                },
                {
                    label: '지정가',
                    value: 'limit',
                },
            ],
            price: 0,
            limitPrice: 0,
            quantity: 1,
            enableScrollViewScroll: true,
            base: 0,
            coin: 0
        }
    }
    updateOrderbook() {
        this._interval = setTimeout(() => {
            const priceInfo = Nexus.getPriceInfo(this.props.exchange)
            const orderbook = priceInfo[this.props.base][this.props.coin]['orderbook']
            if (orderbook) {
                this.setState({
                    units: orderbook['units'] || []
                })
            }
            this.updateOrderbook()
        }, 200)
    }
    _fetchBalance = async () => {
        let exchangeKeys = await AsyncStorage.getItem(exchangeKeyId)
        if (exchangeKeys === null || exchangeKeys === undefined) {
            this.setState({
                base: '거래소키를 등록하세요.',
                coin: '거래소키를 등록하세요.'
            })
            return false
        }
        exchangeKey = JSON.parse(exchangeKeys)[this.props.exchange]
        if (exchangeKey === undefined || exchangeKey === null) {
            this.setState({
                base: '거래소키를 등록하세요.',
                coin: '거래소키를 등록하세요.'
            })
            return false
        }
        let accessKey = exchangeKey['active']['accessKey']
        let secretKey = exchangeKey['active']['secretKey']
        let exchange = this.props.exchange
        let base = this.props.base
        let coin = this.props.coin
        let balance = await Nexus.getBalance(exchange, accessKey, secretKey)
        if (balance['status'] == 'success') {
            this.setState({
                base: numeral(balance['data'][base]['used'] || 0).format('0,0[.]00000000'),
                coin: numeral(balance['data'][coin]['used'] || 0).format('0,0[.]00000000')
            })
        } else {
            this.setState({
                base: '조회 실패.',
                coin: '조회 실패.'
            })
        }
        
        this._interval = setTimeout(() => {
            this._fetchBalance()
        }, 1000)
    }
    componentWillMount() {
        // 오더북 연결
        const exchange = this.props.exchange
        const base = this.props.base
        const coin = this.props.coin
        Nexus.runOrderbook(exchange, base, coin)
        this.updateOrderbook()
        this._fetchBalance()
    }
    componentWillUpdate() {
        if (this.refs['orderbook'] !== undefined
            && this.isScrollTo
            && this.state.units.length > 0) {
            this.isScrollTo = false
            let y = (this.state.units.length / 2) * 20
            this.refs['orderbook'].scrollToOffset({ animated: false, offset: y })
        }
    }
    componentWillUnmount() {
        // 오더북 종료
        clearTimeout(this._interval)
        this._interval = null
        Nexus.close(this.props.exchange, 'orderbook')
        clearTimeout(this._interval)
        Nexus.runTicker(this.props.exchange, this.props.base)
    }
    onEnableScroll(value) {
        this.setState({
            enableScrollViewScroll: value,
        })
    }
    order = async () => {
        let exchangeKeys = await AsyncStorage.getItem(exchangeKeyId)
        if (exchangeKeys === null || exchangeKeys === undefined) {
            alert('거래소 키를 먼저 등록하세요.')
            return false
        }
        exchangeKey = JSON.parse(exchangeKeys)[this.props.exchange]
        if (exchangeKey === undefined || exchangeKey === null) {
            alert('거래소 키를 먼저 등록하세요.')
            return false
        }
        if (this.state.orderType === null) {
            alert('주문방식을 선택하세요.')
            return false
        }
        if (this.state.quantity == 0) {
            alert('수량을 입력하세요.')
            return false
        }
        let exchange = this.props.exchange
        let base = this.props.base
        let coin = this.props.coin
        let accessKey = exchangeKey['active']['accessKey']
        let secretKey = exchangeKey['active']['secretKey']
        let orderCfg = {
            symbol: `${coin}/${base}`,
            type: this.state.orderType,
            side: this.state.viewType ? 'buy' : 'sell',
            amount: String(this.state.quantity).replace(/[^0-9.]/gi, ''),
            price: String(this.state.price).replace(/[^0-9]/gi, '')
        }
        let order = await Nexus.createOrder(exchange, accessKey, secretKey, orderCfg)
        if (order['status'] === 'success') {
            alert('주문완료')
        } else {
            alert(order['message'])
        }
        // createOrder (symbol, type, side, amount[, price[, params]])

        // console.log(order)

    }
    render() {
        if (this.state.units.length == 0) {
            return null
        }
        return (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled>
                <ScrollView style={{ flex: 1, flexDirection: 'row' }} ref="scroll" scrollEnabled={this.state.enableScrollViewScroll}>
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <FlatList
                            ref="orderbook"
                            style={{ width: width / 2 }}
                            data={this.state.units}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{
                                        height: 40,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        backgroundColor: item.unit == 'ask' ? 'rgba(234,98,104,0.1)' : 'rgba(148,172,218,0.1)',
                                        paddingVertical: 10,
                                        paddingHorizontal: 10,
                                        borderBottomWidth: 0.5,
                                        borderBottomColor: '#bbb'
                                    }}
                                    onPress={(e) => {
                                        this.setState({
                                            price: item.price,
                                            limitPrice: item.price
                                        })
                                    }}
                                    onTouchStart={() => {
                                        this.onEnableScroll(false)
                                    }}
                                    onMomentumScrollEnd={() => {
                                        this.onEnableScroll(true)
                                    }}
                                >
                                    <Text style={{
                                        flex: 1.2,
                                        textAlign: 'right',
                                        fontSize: 12
                                    }}>{item.price}</Text>
                                    <Text style={{
                                        flex: 1,
                                        textAlign: 'right',
                                        fontSize: 8
                                    }}>{item.size}</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <View style={{ width: width / 2 - 20, marginHorizontal: 10 }}>

                            <View style={{ flexDirection: 'row', marginTop: 30 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        height: 50,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: this.state.viewType ? '#2743ce' : '#b7b3b3',
                                        marginRight: 5,
                                        borderRadius: 2
                                    }}
                                    onPress={(e) => { this.state.viewType = !this.state.viewType }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 20
                                    }}>구매</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        height: 50,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: !this.state.viewType ? '#e04323' : '#b7b3b3',
                                        marginLeft: 5,
                                        borderRadius: 2
                                    }}
                                    onPress={(e) => { this.state.viewType = !this.state.viewType }}>
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontSize: 20
                                        }}>판매</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 40 }}>
                                <Text style={{ fontSize: 20, color: 'gray' }}>
                                    주문방식
                                </Text>
                                <RNPickerSelect
                                    style={{
                                        ...pickerSelectStyles,
                                        iconContainer: {
                                            top: 20,
                                            right: 10,
                                        },
                                    }}
                                    placeholder={{
                                        label: '선택하세요.',
                                        value: null,
                                    }}
                                    items={this.state.orderTypes}
                                    onValueChange={(value) => {
                                        this.setState({
                                            orderType: value,
                                        })
                                    }}
                                    value={this.state.orderType}
                                    Icon={() => {
                                        return (
                                            <View
                                                style={{
                                                    marginTop: 5,
                                                    backgroundColor: 'transparent',
                                                    borderTopWidth: 10,
                                                    borderTopColor: 'gray',
                                                    borderRightWidth: 10,
                                                    borderRightColor: 'transparent',
                                                    borderLeftWidth: 10,
                                                    borderLeftColor: 'transparent',
                                                    width: 0,
                                                    height: 0,
                                                }}
                                            />
                                        )
                                    }}
                                />
                            </View>
                            <View style={{ marginTop: 20 }}>
                                <Text style={{ fontSize: 20, color: 'gray' }}>수량</Text>
                                <TextInput
                                    style={defaultStyle.textInput}
                                    keyboardType='numeric'
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    value={String(this.state.quantity)}
                                    onChangeText={text => {
                                        this.setState({
                                            quantity: text.replace(/[^\d\.]/gi, '') || ''
                                        })
                                    }}
                                />
                                <Text style={{
                                    textAlign: 'right',
                                    color: 'gray',
                                    fontSize: 10
                                    }}>
                                    {this.props.coin}: {this.state.coin}
                                </Text>
                                <Text style={{
                                    textAlign: 'right',
                                    color: 'gray',
                                    fontSize: 10
                                    }}>
                                    {this.props.base}: {this.state.base}
                                </Text>
                            </View>
                            <View style={{ marginTop: 20, display: this.state.orderType == 'limit' ? 'flex' : 'none' }}>
                                <Text style={{ fontSize: 20, color: 'gray' }}>가격</Text>
                                <TextInput
                                    style={defaultStyle.textInput}
                                    keyboardType='numeric'
                                    autoCorrect={false}
                                    value={String(this.state.price)}
                                    onChangeText={text => {
                                        this.setState({
                                            price: text.replace(/[^\d\.]/gi, '') || ''
                                        })
                                    }}
                                    onFocus={(e) => {
                                        this.refs['scroll'].scrollTo({ y: 60 })
                                    }} />
                            </View>
                            {/* <View style={{ marginTop: 20, display: this.state.orderType == 'limit' ? 'flex' : 'none' }}>
                                <Text style={{ fontSize: 20, color: 'gray' }}>발동가격</Text>
                                <TextInput
                                    style={defaultStyle.textInput}
                                    keyboardType='numeric'
                                    autoCorrect={false}
                                    value={String(this.state.limitPrice)}
                                    onChangeText={text => {
                                        this.setState({
                                            limitPrice: text.replace(/[^\d\.]/gi, '') || ''
                                        })
                                    }}
                                    onFocus={(e) => {
                                        this.refs['scroll'].scrollTo({ y: 80 })
                                    }}
                                />
                            </View> */}
                            <View
                                style={{
                                    marginTop: 40
                                }}>
                                <TouchableOpacity
                                    onPress={() => this.order()}
                                    style={{
                                        display: !this.state.viewType,
                                        height: 50,
                                        backgroundColor: '#2743ce',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 3
                                    }}>
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontSize: 20,
                                        }}>
                                        구매하기
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.order()}
                                    color='#e04323'
                                    style={{
                                        display: this.state.viewType,
                                        height: 50,
                                        backgroundColor: '#e04323',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 3
                                    }}>
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontSize: 20,
                                        }}>
                                        판매하기
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>



                </ScrollView>
            </KeyboardAvoidingView>
        )
    }
}

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        marginTop: 10,
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 0.5,
        borderColor: 'gray',
        borderRadius: 4,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
    },
    inputAndroid: {
        marginTop: 10,
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'gray',
        borderRadius: 8,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
    }
})
const defaultStyle = StyleSheet.create({
    textInput: {
        marginTop: 10,
        fontSize: 16,
        height: 45,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'gray',
        borderRadius: 2,
        color: 'black'
    }
})