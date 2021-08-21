# bfx test project



## Requirements
create a simplified distributed exchange
* Each client will have its own instance of the orderbook.
* Clients submit orders to their own instance of orderbook. The order is distributed to other instances, too.
* If a client's order matches with another order, any remainder is added to the orderbook, too.

### Tips

- you don't need to store state in a DB or filesystem
- it is possible to solve the task with the node std lib, async and grenache libraries
- beware of race conditions!
- no need for express or any other http api layers

## Implementation


Within a Grenache network, connected peers can interact in different ways with each other.
They can store and retrieve data in the DHT. 

An `ExchangeClient` is a client instance, and it's consist of 2 parts `PeerRPCServer` and `PeerRPCClient`:  
-  `PeerRPCServer` is used for incoming connections and commands. 
- `PeerRPCClient` is used for sending commands to other peers.

Client actions:
- create orderbook for client
- submit order (BUY / SELL, amount) from client; match order with orders from other clients

### Orders 
- buy amount code price
- sell amount code price
 
### Order statuses
- `new` - Client created a new order
- `closed` - Order closed by match



## How to start

### Prerequisite: start grapes

```shell
yarn start-grapes
```

### start client

```shell
# yarn start-client PORT [ORDER]
yarn start-client 1001
yarn start-client 1002 buy:0.1:btcusd:10000
yarn start-client 1003 sell:0.1:btcusd:10000
```
- PORT - any available local port ; it's preferred to use value > 1000
- ORDER - optional argument. Format - [buy|sell]:[amount]:[code]:[price]
