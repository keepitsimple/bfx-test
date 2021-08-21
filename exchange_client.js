const async = require('async')
const Link = require('grenache-nodejs-link')
const {PeerRPCServer, PeerRPCClient} = require('grenache-nodejs-http')
const {generateUniqId} = require('./utils')

const BroadcastKey = 'all'

class ExchangeClient {
    constructor({ grapeUrl, port, announceInterval = 1000}) {
        this._initialized = false
        this._id = generateUniqId()
        this._port = Number(port)
        this._announceInterval = announceInterval
        this._interval = null

        this._sentOffers = []

        this._link = new Link({
            grape: grapeUrl
        })
        this._link.start()
        this._clientPeer = new PeerRPCClient(this._link, {})
        this._clientPeer.init()
        this._serverPeer = new PeerRPCServer(this._link, {timeout: 300000})
        this._serverPeer.init()
        this._service = this._serverPeer.transport('server')
        this._service.listen(this._port)
        this._initialized = true
        this._service.on('request', this.handleRequest.bind(this))

        this._orderHandlers = {
            ['client:' + this._id]: {
                'accept': this.handleOrderAcceptRequest.bind(this),
                'accepted': this.handleOrderAccepted.bind(this)
            },
            [BroadcastKey]: {
                'new': this.handleOrderNew.bind(this),
                'closed': this.handleOrderClosed.bind(this)
            }
        }


    }


    broadcastOrder({type, amount, code, price}, cb) {
        const payload = {
            event: 'new',
            data: {
                id: generateUniqId(),
                from: this._id,
                type,
                amount,
                code,
                price
            }
        }
        this._sentOffers[payload.data.id] = {
            contents: payload.data,
            flags: {
                inProcess: false,
                approved: false
            }
        }
        // broadcast to all via map
        this._clientPeer.map(BroadcastKey, payload, {timeout: 10000}, cb)
    }

    handleOrderAcceptRequest(rid, data, handler) {

    }

    handleOrderAccepted(rid, data, handler) {

    }

    handleOrderNew(rid, data, handler) {

    }

    handleOrderClosed(rid, data, handler) {

    }

    handleRequest(rid, key, payload, handler) {
        console.log(rid, key, payload)
        const {event, data} = payload
        if (!event || !data) {
            handler.reply(new Error('Incorrect message format'))
            return
        }
        const eventHandler = this._orderHandlers[key] && this._orderHandlers[key][event]

        if (!eventHandler) {
            handler.reply(new Error('Unable to handle the request'))
            return
        }

        return eventHandler(rid, data, handler)
    }

    start(cb) {
        if (!this._initialized) {
            const err = new Error('Client has problem with initialization')
            return cb(err)
        }

        async.parallel(
            [
                cb => this._link.announce('client:' + this._id, this._service.port, {}, cb),
                cb => this._link.announce(BroadcastKey, this._service.port, {}, cb)
            ],
            (err) => {


                if (!err) {
                    this._interval = setInterval(() => {
                        this._link.announce('client:' + this._id, this._service.port, {})
                        this._link.announce(BroadcastKey, this._service.port, {})
                    }, this._announceInterval)
                }
                cb(err)
            }
        )
    }

    stop() {
        if (this._interval) {
            clearInterval(this._interval)
        }
    }

}


module.exports = ExchangeClient
