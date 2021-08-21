const async = require('async')
const Link = require('grenache-nodejs-link')
const { PeerRPCServer, PeerRPCClient } = require('grenache-nodejs-http')
const { generateUniqId } = require('./utils')

const BroadcastKey = 'all'

class ExchangeClient {
    constructor(grapeUrl, port, announceInterval = 1000 ) {
        this._initialized = false
        this._id = generateUniqId()
        this._announceInterval = announceInterval
        this._port = port

        this._link = new Link({
            grape: grapeUrl
        })
        this._link.start()

        this._clientPeer = new PeerRPCClient(this._link, {})
        this._clientPeer.init()
        this._serverPeer = new PeerRPCServer(this._link, {})
        this._serverPeer.init()
        this._service = this._serverPeer.transport('server')
        this._service.listen(this._port)
        this._initialized = true
        this._service.on('request', this.handleRequest.bind(this))


        // this._sentOffers = {}
        // this._interestingOffers = {}
        // this._broadcastKey = broadcastKey
        // this._requestOptions = requestOptions
        // this._processingQueue = []
        this._interval = null
    }

    handleRequest (rid, key, payload, handler) {
        console.log(payload) //  { msg: 'hello' }
        handler.reply(null, { msg: 'hello ' + payload.msg  })
    }

    start (cb = () => {}) {
        if (!this._initialized) {
            const err = new Error('OTCClient should be initialized first')
            if (!cb) {
                throw err
            }
            return cb(err)
        }

        async.parallel(
          [
                cb => this._link.announce('client:'+ this._id, this._service.port, {}, cb),
                cb => this._link.announce(BroadcastKey, this._service.port, {}, cb)
          ],
          (err) => {
                console.log('client:'+ this._id, 'started')
                if (!err) {
                    this._interval = setInterval(() => {
                        this._link.announce('client:'+ this._id, this._service.port, {})
                        this._link.announce(BroadcastKey, this._service.port, {})
                    }, this._announceInterval)
                }
                cb(err)
            }
        )



        // this._clientPeer.request('rpc_test', { msg: `client: ${this._id}` }, { timeout: 10000 }, (err, data) => {
        //     if (err) {
        //         console.error(err)
        //         process.exit(-1)
        //     }
        //     console.log(data) // { msg: 'world' }
        // })
    }





}


module.exports = ExchangeClient
