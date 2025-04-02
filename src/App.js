// src/App.js
import { useState, useEffect } from "react";
import { createConfig, WagmiConfig, useAccount, useConnect, useDisconnect, useWalletClient, useChainId } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { walletConnect } from "@wagmi/connectors";
import { createPublicClient, http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import omegaNFTABI from "./utils/omegaNFTABI";
import WalletConnect from "./components/WalletConnect";
import NFTCard from "./components/NFTCard";
import ExclusiveExperience from "./components/ExclusiveExperience";
import logo from "./assets/logo.webp";
import "./App.css";

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("nfts");

  useEffect(() => {
    if (isConnected && address) {
      if (chainId !== polygonAmoy.id) {
        setErrorMessage(`Por favor, cambia a la red Polygon Amoy (chain ID: ${polygonAmoy.id}).`);
        return;
      }
      const initContract = async () => {
        try {
          setIsLoading(true);
          const contractAddress = "0x38a2550FB656DDAaDB478B3C2258E48866C91b7f";
          setContract({ address: contractAddress, abi: omegaNFTABI });
          await loadNfts({ address: contractAddress, abi: omegaNFTABI }, address);
        } catch (error) {
          console.error("Error al inicializar el contrato:", error);
          setErrorMessage("Error al inicializar el contrato: " + error.message);
        } finally {
          setIsLoading(false);
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
            const tokenOwner = await viemClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: "ownerOf",
              args: [tokenId],
            });
            if (tokenOwner.toLowerCase() !== owner.toLowerCase()) {
              console.log(`Token ID ${tokenId} ya no pertenece a ${owner}, pertenece a ${tokenOwner}`);
              continue;
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
    setIsMenuOpen(false);
  };

  const registerForEvent = (tokenId, eventName) => {
    alert(`Registro para ${eventName} con el NFT #${tokenId} enviado con éxito!`);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const abbreviatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
      <div className="app-container">
        {isConnected && (
            <>
              <header className="navbar">
                <img src={logo} alt="Afizionados Logo" className="navbar-logo" />
                <button className="menu-button" onClick={toggleMenu}>
                  <span className="menu-icon">{isMenuOpen ? "✖" : "☰"}</span>
                </button>
              </header>
              <nav className={`menu ${isMenuOpen ? "open" : ""}`}>
                <ul>
                  <li>
                    <button
                        onClick={() => {
                          setActiveTab("nfts");
                          setIsMenuOpen(false);
                        }}
                        className="menu-link"
                    >
                      Mis Relojes
                    </button>
                  </li>
                  <li>
                    <button
                        onClick={() => {
                          setActiveTab("experiences");
                          setIsMenuOpen(false);
                        }}
                        className="menu-link"
                    >
                      Experiencias Exclusivas
                    </button>
                  </li>
                  <li>
                    <a href="https://afizionados.com/" onClick={() => setIsMenuOpen(false)}>
                      Acerca de Afizionados
                    </a>
                  </li>
                  <li>
                    <a href="https://afizionados.com/support" onClick={() => setIsMenuOpen(false)}>
                      Soporte
                    </a>
                  </li>
                  <li>
                    <button onClick={disconnectWallet} className="menu-disconnect-button">
                      Desconectar Wallet
                    </button>
                  </li>
                </ul>
              </nav>
            </>
        )}
        {!isConnected ? (
            <div className="welcome-screen">
              <img src={logo} alt="Afizionados Logo" className="logo" />
              <p className="tagline">La memorabilidad deportiva de tu equipo favorito, ahora en formato digital</p>
              <WalletConnect
                  isConnected={isConnected}
                  address={address}
                  isConnecting={isConnecting}
                  connectWallet={connectWallet}
                  disconnectWallet={disconnectWallet}
              />
              <a href="https://afizionados.com/" className="info-link">
                ¿Qué es Afizionados?
              </a>
            </div>
        ) : (
            <div className="main-content">
              {address && (
                  <p className="welcome-message">
                    ¡Bienvenido/a a Afizionados, {abbreviatedAddress}!
                  </p>
              )}
              {errorMessage && <p className="error-message">{errorMessage}</p>}
              <div className="tabs">
                <button
                    className={`tab ${activeTab === "nfts" ? "active" : ""}`}
                    onClick={() => setActiveTab("nfts")}
                >
                  Mis Relojes
                </button>
                <button
                    className={`tab ${activeTab === "experiences" ? "active" : ""}`}
                    onClick={() => setActiveTab("experiences")}
                >
                  Experiencias Exclusivas
                </button>
              </div>
              {activeTab === "nfts" && (
                  <section id="my-nfts">
                    {isLoading ? (
                        <p className="loading-state">Cargando tus relojes...</p>
                    ) : nfts.length === 0 ? (
                        <p className="empty-state">
                          No tienes relojes en tu colección. ¡Explora cómo obtener uno en{" "}
                          <a href="https://afizionados.com/" className="info-link">Afizionados.com</a>!
                        </p>
                    ) : (
                        <div className="nft-grid">
                          {nfts.map((nft, index) => (
                              <NFTCard key={index} nft={nft} />
                          ))}
                        </div>
                    )}
                  </section>
              )}
              {activeTab === "experiences" && (
                  <section id="experiences">
                    {isLoading ? (
                        <p className="loading-state">Cargando tus experiencias...</p>
                    ) : nfts.length === 0 ? (
                        <p className="empty-state">
                          No tienes experiencias disponibles. ¡Obtén un reloj para acceder a eventos exclusivos!
                        </p>
                    ) : (
                        <div className="experience-section">
                          {nfts.map((nft, index) => (
                              <ExclusiveExperience
                                  key={index}
                                  nft={nft}
                                  registerForEvent={registerForEvent}
                              />
                          ))}
                        </div>
                    )}
                  </section>
              )}
            </div>
        )}
        <footer className="footer">
          <p>
            Powered by <a href="https://digibio.solutions/" className="footer-link">Digibio</a> © 2025 |{" "}
            <a href="https://afizionados.com/terms" className="footer-link">Términos de Servicio</a> |{" "}
            <a href="https://afizionados.com/privacy" className="footer-link">Política de Privacidad</a>
          </p>
        </footer>
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