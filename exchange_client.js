const async = require('async')
const Link = require('grenache-nodejs-link')
const {PeerRPCServer, PeerRPCClient} = require('grenache-nodejs-http')
const {generateUniqId} = require('./utils')

const BroadcastKey = 'all'
const ClientPrefix = 'client:'

class ExchangeClient {
    constructor({grapeUrl, port, announceInterval = 1000}) {
        this._initialized = false
        this._id = generateUniqId()
        this._port = Number(port)
        this._announceInterval = announceInterval
        this._interval = null

        // list of my orders
        this._sentOrders = {}
        // list of orders from other clients
        this._incomingOrders = {}
        // list of successfully completed orders
        this._completedOrders = {}
        // list of queues per order id
        this._processingQueue = {}

        // TODO rename client to seller & buyer


        this._link = new Link({
            grape: grapeUrl
        })
        this._link.start()

        this._requestOptions = {timeout: 10000}
        this._clientPeer = new PeerRPCClient(this._link, {})
        this._clientPeer.init()
        this._serverPeer = new PeerRPCServer(this._link, {timeout: 300000})
        this._serverPeer.init()
        this._service = this._serverPeer.transport('server')
        this._service.listen(this._port)
        this._initialized = true
        this._service.on('request', this.handleRequest.bind(this))

        this._orderHandlers = {
            [ClientPrefix + this._id]: {
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
                client: this._id,
                type,
                amount,
                code,
                price
            }
        }
        this._sentOrders[payload.data.id] = {
            contents: payload.data,
            flags: {
                inProcess: false,
                approved: false
            }
        }
        // broadcast to all via map
        this._clientPeer.map(BroadcastKey, payload, this._requestOptions, cb)
    }

    handleOrderAcceptRequest(rid, data, handler) {
        const order = this._sentOrders[data.id]

        if (!order) {
            return handler.reply(new Error('The offer has not been found'))
        }

        if (order.flags.approved) {
            return handler.reply(null, false)
        }

        handler.reply(null, true)

        this._processingQueue[data.id].push(data)
        if (!order.flags.inProcess) {
            order.flags.inProcess = true
            this.processQueue(rid, (err, approved) => {
                // err will never have a value here
                if (err) {
                    throw err
                }
                order.flags.approved = approved
                order.flags.inProcess = false
                this._processingQueue[data.id] = []
                if (approved) {
                    this._completedOrders[order.contents.id] = order
                    delete this._sentOrders[order.contents.id]
                    const payload = {
                        event: 'closed',
                        data: {id: order.contents.id}
                    }
                    this._clientPeer.map(BroadcastKey, payload, this._requestOptions)
                }
            })
        }
    }

    handleOrderAccepted(rid, data, handler) {
        if (!this._incomingOrders[data.id]) {
            // The client has no interest in the offer, most probably an error
            return handler.reply(new Error('Client has no interest in the offer'))
        }
        console.log(`Your propose for order:${data.id} from client:${data.client} was accepted`)
        delete this._incomingOrders[data.id]
        handler.reply()
    }

    handleOrderNew(rid, data, handler) {
        // Exclude own orders
        if (data.client === this._id) return
        handler.reply()
        console.log(`Received new order:${data.id} from client:${data.client}`)
        this._incomingOrders[data.id] = data
        // Send an acceptance
        const payload = {
            event: 'accept',
            data: {
                id: data.id,
                client: data.client,
                from: this._id
            }
        }
        this._clientPeer.request(ClientPrefix + data.client, payload, this._requestOptions, (err, res) => {
            if (res) {
                console.log('Acceptance has been received', data.client, rid)
                return
            }

            delete this._incomingOrders[data.id]
            if (err) {
                console.log('Failed to accept the offer of', data.client, rid)
                console.log('Reason:', err.message, rid)
                return
            }
            console.log('Offer is already accepted', rid)
        })
    }

    handleOrderClosed(rid, data, handler) {
        delete this._incomingOrders[data.id]
        handler.reply()
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

    processQueue(rid, id, cb) {
        const processAcceptance = () => {
            const acceptCmdBody = this._processingQueue[id].shift()
            if (acceptCmdBody) {
                const payload = {
                    event: 'approved',
                    data: {
                        id: acceptCmdBody.id,
                        client: acceptCmdBody.client,
                        from: acceptCmdBody.from
                    }
                }
                // Hopefully this always acts asynchronously. Otherwise, will need to use setImmediate
                console.log('Notifying approved person', acceptCmdBody.from, rid)
                this._clientPeer.request(ClientPrefix + acceptCmdBody.from, payload, this._requestOptions, err => {
                    if (err) {
                        // On a failure we move to the next acceptance
                        console.log('Failed to approve for', acceptCmdBody.from, rid)
                        return processAcceptance()
                    }
                    console.log('Approved for', acceptCmdBody.from, rid)
                    cb(null, true)
                })
            } else {
                setImmediate(() => {
                    if (this._processingQueue[id].length) {
                        return processAcceptance()
                    }
                    cb(null, false)
                })
            }
        }

        processAcceptance()
    }

    start(cb) {
        if (!this._initialized) {
            const err = new Error('Client has problem with initialization')
            return cb(err)
        }

        async.parallel(
            [
                cb => this._link.announce(ClientPrefix + this._id, this._service.port, {}, cb),
                cb => this._link.announce(BroadcastKey, this._service.port, {}, cb)
            ],
            (err) => {


                if (!err) {
                    this._interval = setInterval(() => {
                        this._link.announce(ClientPrefix + this._id, this._service.port, {})
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
