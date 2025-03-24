import { useState, useEffect } from "react";
import { createConfig, WagmiConfig, useAccount, useConnect, useDisconnect } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { walletConnect } from "@wagmi/connectors";
import { createPublicClient, http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Importa QueryClient y QueryClientProvider
import omegaNFTABI from "./utils/omegaNFTABI";

// Crea un QueryClient
const queryClient = new QueryClient();

// Configura las cadenas y el cliente de Wagmi
const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    walletConnect({
      projectId: "d512d1dac86c0440191b4e4f981c58ec", // Tu Project ID de WalletConnect
      showQrModal: true,
    }),
  ],
  transports: {
    [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology/"),
  },
});

// Crea un cliente público para interactuar con la blockchain
const viemClient = createPublicClient({
  chain: polygonAmoy,
  transport: http("https://rpc-amoy.polygon.technology/"),
});

function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors: availableConnectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isConnected && address) {
      const initContract = async () => {
        try {
          // Configura el contrato usando viem
          const contractAddress = "0xCc9FeC4A298D2320748116F24d859c91455f7245";
          setContract({ address: contractAddress, abi: omegaNFTABI });
          await loadNfts({ address: contractAddress, abi: omegaNFTABI }, address);
        } catch (error) {
          console.error("Error al inicializar el contrato:", error);
          setErrorMessage("Error al inicializar el contrato: " + error.message);
        }
      };
      initContract();
    }
  }, [isConnected, address]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Conecta usando el conector de WalletConnect
      await connect({ connector: availableConnectors[0] });
    } catch (error) {
      console.error("Error al conectar:", error);
      setErrorMessage("Error al conectar con la wallet: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadNfts = async (contract, owner) => {
    if (contract && owner) {
      try {
        // Usa viem para consultar eventos
        const logs = await viemClient.getLogs({
          address: contract.address,
          event: {
            type: "event",
            name: "Transfer",
            inputs: [
              { type: "address", indexed: true, name: "from" },
              { type: "address", indexed: true, name: "to" },
              { type: "uint256", indexed: true, name: "tokenId" },
            ],
          },
          fromBlock: 0n,
          toBlock: "latest",
        });

        const transferEvents = logs
            .filter((log) => log.args.to.toLowerCase() === owner.toLowerCase())
            .map((log) => ({
              args: {
                tokenId: log.args.tokenId,
              },
            }));

        console.log("Eventos Transfer encontrados:", transferEvents.length);
        transferEvents.forEach((event, index) => {
          console.log(`Evento ${index}: Token ID ${event.args.tokenId.toString()}`);
        });

        const nftsList = [];
        for (let i = 0; i < transferEvents.length; i++) {
          const event = transferEvents[i];
          const tokenId = event.args.tokenId.toString();
          console.log(`Procesando token ID ${tokenId}...`);
          try {
            const tokenURI = await viemClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "tokenURI",
              args: [tokenId],
            });
            console.log(`Token ID ${tokenId} URI: ${tokenURI}`);

            const tokenOwner = await viemClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "ownerOf",
              args: [tokenId],
            });
            console.log(`Token ID ${tokenId} existe y pertenece a: ${tokenOwner}`);

            const response = await fetch(tokenURI);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const metadataText = await response.text();
            console.log(`Raw metadata for token ${tokenId}:`, metadataText);
            const metadata = JSON.parse(metadataText);
            console.log(`Parsed metadata for token ${tokenId}:`, JSON.stringify(metadata));
            const image = metadata.image || "https://via.placeholder.com/150";
            const name = metadata.name || `NFT ${tokenId}`;
            console.log(`Image for token ${tokenId}:`, image);
            console.log(`Name for token ${tokenId}:`, name);
            const nft = {
              tokenId,
              uri: tokenURI,
              image,
              name,
            };
            console.log(`NFT creado para token ${tokenId}:`, nft);
            nftsList.push(nft);
          } catch (error) {
            console.error(`Error processing token ${tokenId}:`, error.message);
          }
        }
        console.log("NFTs list antes de filtrar:", nftsList);
        const filteredNfts = nftsList.filter((nft) => nft !== null && nft !== undefined);
        console.log("NFTs filtrados:", filteredNfts);
        setNfts(filteredNfts);
      } catch (error) {
        console.error("Error al cargar NFTs:", error);
        setErrorMessage("Error al cargar los NFTs. Revisa la consola para más detalles.");
      }
    }
  };

  const mintNFT = async () => {
    if (contract && address) {
      try {
        const { request } = await viemClient.simulateContract({
          account: address,
          address: contract.address,
          abi: contract.abi,
          functionName: "mint",
          value: BigInt("10000000000000000"), // 0.01 MATIC en wei
        });
        const hash = await viemClient.writeContract(request);
        await viemClient.waitForTransactionReceipt({ hash });
        alert("NFT minteado con éxito!");
        await loadNfts(contract, address);
      } catch (error) {
        console.error("Error al mintear:", error);
        alert("Error al mintear el NFT. Revisa la consola.");
      }
    } else {
      setErrorMessage("Por favor, conecta tu wallet para mintear un NFT.");
    }
  };

  const disconnectWallet = async () => {
    await disconnect();
    setContract(null);
    setNfts([]);
  };

  return (
      <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            color: "#ffffff",
            fontFamily: "'Montserrat', sans-serif",
            padding: "40px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
      >
        <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              marginBottom: "20px",
              color: "#00aaff",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            }}
        >
          OmegaNFT
        </h1>
        {isConnected ? (
            <>
              <p
                  style={{
                    fontSize: "1.2rem",
                    marginBottom: "30px",
                    color: "#cccccc",
                  }}
              >
                Cuenta conectada: {address}
              </p>
              <button
                  onClick={disconnectWallet}
                  style={{
                    padding: "12px 30px",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    color: "#ffffff",
                    backgroundColor: "#ff5555",
                    border: "none",
                    borderRadius: "25px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(255, 85, 85, 0.3)",
                    marginBottom: "30px",
                  }}
                  onMouseOver={(e) => (e.target.style.backgroundColor = "#cc4444")}
                  onMouseOut={(e) => (e.target.style.backgroundColor = "#ff5555")}
              >
                Desconectar
              </button>
            </>
        ) : (
            <button
                onClick={connectWallet}
                disabled={isConnecting}
                style={{
                  padding: "12px 30px",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  color: "#ffffff",
                  backgroundColor: "#00aaff",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(0, 170, 255, 0.3)",
                  marginBottom: "30px",
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#0088cc")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#00aaff")}
            >
              {isConnecting ? "Conectando..." : "Conectar con MetaMask"}
            </button>
        )}
        {errorMessage && (
            <p
                style={{
                  fontSize: "1rem",
                  color: "#ff5555",
                  marginBottom: "20px",
                }}
            >
              {errorMessage}
            </p>
        )}
        {isConnected && (
            <button
                onClick={mintNFT}
                disabled={!contract}
                style={{
                  padding: "12px 30px",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  color: "#ffffff",
                  backgroundColor: "#00aaff",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(0, 170, 255, 0.3)",
                  marginBottom: "40px",
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = "#0088cc")}
                onMouseOut={(e) => (e.target.style.backgroundColor = "#00aaff")}
            >
              Mintear NFT (0.01 MATIC)
            </button>
        )}
        <h2
            style={{
              fontSize: "2rem",
              marginBottom: "30px",
              color: "#00aaff",
            }}
        >
          Mis NFTs
        </h2>
        <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              maxWidth: "1200px",
              width: "100%",
            }}
        >
          {nfts.map((nft, index) => (
              <div
                  key={index}
                  style={{
                    backgroundColor: "#2a2a4a",
                    borderRadius: "15px",
                    padding: "20px",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                    transition: "transform 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div
                    style={{
                      width: "100%",
                      maxHeight: "250px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: "15px",
                      overflow: "hidden",
                    }}
                >
                  <img
                      src={nft.image}
                      alt={`NFT ${nft.tokenId}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "250px",
                        objectFit: "contain",
                        borderRadius: "10px",
                      }}
                  />
                </div>
                <h3
                    style={{
                      fontSize: "1.2rem",
                      marginBottom: "10px",
                      color: "#ffffff",
                    }}
                >
                  {nft.name}
                </h3>
                <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#cccccc",
                      marginBottom: "10px",
                    }}
                >
                  Token ID: {nft.tokenId}
                </p>
                <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#999999",
                      wordBreak: "break-all",
                    }}
                >
                  URI: {nft.uri}
                </p>
              </div>
          ))}
        </div>
      </div>
  );
}

export default function WrappedApp() {
  return (
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiConfig>
  );
}