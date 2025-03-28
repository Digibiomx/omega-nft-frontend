import { useState, useEffect } from "react";
import { createConfig, WagmiConfig, useAccount, useConnect, useDisconnect, useWalletClient, useChainId } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { walletConnect } from "@wagmi/connectors";
import { createPublicClient, http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import omegaNFTABI from "./utils/omegaNFTABI";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    walletConnect({
      projectId: "d512d1dac86c0440191b4e4f981c58ec",
      showQrModal: true,
    }),
  ],
  transports: {
    [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology/"),
  },
});

const viemClient = createPublicClient({
  chain: polygonAmoy,
  transport: http("https://rpc-amoy.polygon.technology/"),
});

function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors: availableConnectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isConnected && address) {
      if (chainId !== polygonAmoy.id) {
        setErrorMessage(`Por favor, cambia a la red Polygon Amoy (chain ID: ${polygonAmoy.id}).`);
        return;
      }
      const initContract = async () => {
        try {
          const contractAddress = "0x38a2550FB656DDAaDB478B3C2258E48866C91b7f";
          setContract({ address: contractAddress, abi: omegaNFTABI });
          await loadNfts({ address: contractAddress, abi: omegaNFTABI }, address);
        } catch (error) {
          console.error("Error al inicializar el contrato:", error);
          setErrorMessage("Error al inicializar el contrato: " + error.message);
        }
      };
      initContract();
    }
  }, [isConnected, address, chainId]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
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

        // Filtra los eventos Transfer para encontrar los tokens que fueron enviados a la wallet conectada
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
            // Verifica si la wallet conectada sigue siendo la dueña del NFT
            const tokenOwner = await viemClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "ownerOf",
              args: [tokenId],
            });
            if (tokenOwner.toLowerCase() !== owner.toLowerCase()) {
              console.log(`Token ID ${tokenId} ya no pertenece a ${owner}, pertenece a ${tokenOwner}`);
              continue; // Si la wallet conectada no es la dueña, salta este NFT
            }

            const tokenURI = await viemClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "tokenURI",
              args: [tokenId],
            });
            console.log(`Token ID ${tokenId} URI: ${tokenURI}`);

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
            const attributes = metadata.attributes || [];
            console.log(`Image for token ${tokenId}:`, image);
            console.log(`Name for token ${tokenId}:`, name);
            const nft = {
              tokenId,
              uri: tokenURI,
              image,
              name,
              attributes,
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

  const disconnectWallet = async () => {
    await disconnect();
    setContract(null);
    setNfts([]);
  };

  const registerForEvent = (tokenId, eventName) => {
    // Aquí podrías implementar una llamada a un backend para registrar al usuario
    // Por ahora, mostramos un mensaje de confirmación
    alert(`Registro para ${eventName} con el NFT #${tokenId} enviado con éxito!`);
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
        <p
            style={{
              fontSize: "1rem",
              color: "#ff5555",
              marginBottom: "20px",
            }}
        >
          Para una mejor experiencia en móviles, abre esta página en el navegador integrado de MetaMask.
        </p>
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
        <h2
            style={{
              fontSize: "2rem",
              marginBottom: "30px",
              color: "#00aaff",
            }}
        >
          Mis Relojes
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
                      alt={`Reloj ${nft.tokenId}`}
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
                      marginBottom: "5px",
                    }}
                >
                  Modelo: {nft.attributes.find(attr => attr.trait_type === "Model")?.value || "N/A"}
                </p>
                <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#cccccc",
                      marginBottom: "5px",
                    }}
                >
                  Número de serie: {nft.attributes.find(attr => attr.trait_type === "Serial Number")?.value || "N/A"}
                </p>
                <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#cccccc",
                      marginBottom: "10px",
                    }}
                >
                  Fecha de fabricación: {nft.attributes.find(attr => attr.trait_type === "Manufacture Date")?.value || "N/A"}
                </p>
                <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#999999",
                      wordBreak: "break-all",
                    }}
                >
                  Token ID: {nft.tokenId}
                </p>
              </div>
          ))}
        </div>
        {isConnected && nfts.length > 0 && (
            <div
                style={{
                  marginTop: "40px",
                  maxWidth: "1200px",
                  width: "100%",
                }}
            >
              <h2
                  style={{
                    fontSize: "2rem",
                    marginBottom: "30px",
                    color: "#00aaff",
                  }}
              >
                Experiencias Exclusivas
              </h2>
              {nfts.map((nft, index) => {
                const eventAccess = nft.attributes.find(attr => attr.trait_type === "Event Access")?.value;
                return eventAccess ? (
                    <div
                        key={index}
                        style={{
                          backgroundColor: "#2a2a4a",
                          borderRadius: "15px",
                          padding: "20px",
                          marginBottom: "20px",
                          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                        }}
                    >
                      <p
                          style={{
                            fontSize: "1rem",
                            color: "#cccccc",
                            marginBottom: "10px",
                          }}
                      >
                        Tu reloj #{nft.tokenId} te da acceso a: {eventAccess}
                      </p>
                      <button
                          onClick={() => registerForEvent(nft.tokenId, eventAccess)}
                          style={{
                            padding: "10px 20px",
                            fontSize: "1rem",
                            fontWeight: "bold",
                            color: "#ffffff",
                            backgroundColor: "#00aaff",
                            border: "none",
                            borderRadius: "25px",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            boxShadow: "0 4px 15px rgba(0, 170, 255, 0.3)",
                          }}
                          onMouseOver={(e) => (e.target.style.backgroundColor = "#0088cc")}
                          onMouseOut={(e) => (e.target.style.backgroundColor = "#00aaff")}
                      >
                        Registrarse para el evento
                      </button>
                    </div>
                ) : null;
              })}
            </div>
        )}
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