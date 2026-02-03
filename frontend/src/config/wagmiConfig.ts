import { http, createConfig } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(),
  ],
  transports: {
    [polygonAmoy.id]: http(
      'https://rpc.ankr.com/polygon_amoy/e1368674b6a38d7ca1b503d1b995764cd946b33c5b14ac861a09b0689fa16449'
    ),
  },
})
