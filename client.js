const Grapes = require('./configs/grapes')
const Default = require('./configs/default')
const Client = require('./exchange_client')

const [, , port, order] = process.argv

if (!port) {
    console.log('Port number is mandatory argument')
    process.exit(1)
}

// TODO extract all grapes hostnames and randomly take one
const grapeHostname = Grapes?.[0].dht_bootstrap?.[0].split(':')[0]
if (!grapeHostname) {
    console.log('Cannot find grapes setup in configs')
    process.exit(1)
}
const grapeUrl = Default.protocol + grapeHostname + ':' + Grapes?.[Math.floor(Math.random() * Grapes.length)].api_port

const client = new Client({grapeUrl, port, announceInterval: Default.announceInterval})
client.start((err) => {
    if (err) {
        console.log(err, 'Cannot start client. Error:', err)
        process.exit(1)
    }

    console.log('Client started')

    if (order) {
        const [type, amount, code, price] = order.split(':')
        console.log('There is an order:', order)
        // TODO implement normal validation via RegEx or validator
        if (!type || !amount || !code || !price) {
            console.log('Invalid order. Use format like "buy:0.1:btcusd:10000"')
            process.exit(1)
        }
        client.broadcastOrder({type, amount, code, price}, (err) => {
            if (err) {
                console.log(err, 'Cannot set order. Error:', err)
                process.exit(1)
            }
        })
    }
})


