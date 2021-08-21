const Grape = require('grenache-grape').Grape
const grapes = require('./configs/grapes')

grapes.map( (options, idx) => {
  const grape = new Grape( options )

  grape.on('ready', () => {
    console.log(`grape ${idx}: ready`)
  } )
  grape.on('listening', () => {
    console.log(`grape ${idx}: is listening.`)
  } )
  grape.on('peer', (...info) => {
    console.log(`grape ${idx}: potential peer is found.`)
    console.log(info)
  } )
  grape.on('node', () => {
    console.log(`grape ${idx}: found a new node`)
  } )
  grape.on('warning', (...info) => {
    console.log(`grape ${idx}: warning `)
    console.log(info)
  } )
  grape.on('announce', (...info) => {
    console.log(`grape ${idx}: a peer announced itself`)
    console.log(info)
  } )

  //TODO : make simultaneous start for nodes
  grape.start( (err) => {
    if(err){
      console.log(`grape ${idx}: cannot start`, err)
      process.exit(1)
    }
  })

} )


