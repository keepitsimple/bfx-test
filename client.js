const Grapes = require('./configs/grapes')
const Default = require('./configs/default')
const Client = require('./exchange_client')

const [ , , port, order] = process.argv

if(!port) {
    console.log('Port number is mandatory argument')
    process.exit(1)
}

// TODO extract all grapes hostnames and randomly take one
const grapeHostname = Grapes?.[0].dht_bootstrap?.[0].split(':')[0]
if(!grapeHostname) {
    console.log('Cannot find grapes setup in configs')
    process.exit(1)
}
const grapeHost = grapeHostname + ':' + Grapes?.[0].api_port

const client = new Client( Default.protocol + grapeHost, port, Default.announceInterval )
client.start((err) => {
    if (err) {
        console.log(err, 'Cannot start client. Error:', err)
        process.exit(1)
    }

    if(order) {
        const [ type, amount, label, price] = order.split(':')
        // TODO implement normal validation via RegEx or validator
        if(!type || !amount || !label || !price)
        client.broadcastOrder( { type, amount, label, price }, (err) =>{
          if(err) {
            console.log(err, 'Cannot set order. Error:', err)
            process.exit(1)
          }
        })
    }
})


