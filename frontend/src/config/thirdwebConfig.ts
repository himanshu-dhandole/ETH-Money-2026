import { createThirdwebClient, defineChain } from "thirdweb";

export const client = createThirdwebClient({
  clientId: "1352c821105c090d6850b2ab656e0f6b",
});

// Arc Circle Testnet - USDC-native Layer 1 blockchain
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.net",
    },
  ],
  testnet: true,
});
