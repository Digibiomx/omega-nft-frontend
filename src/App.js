// src/App.js
import { useState, useEffect, useCallback } from "react";
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
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import axios from 'axios';
import "./App.css";

// Imágenes para el carrusel (puedes reemplazarlas con imágenes reales)
const carouselImages = [
  "https://ipfs.io/ipfs/bafkreib2jijsffefwnksnbp2bjtc2ques7vondinbqipatx66c5ynnpgem",
  "https://ipfs.io/ipfs/bafkreiehgj3eidq5l2ll5slegy2dl6mx4o4srznhus6wcyd4eboky4ybbq",
  "https://ipfs.io/ipfs/bafkreiapq2e7ios4zzqu4b5odei2woauo3kryvkn6sclwlfjf5z67c4ifu",
];

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
  const [email, setEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [eventHistory, setEventHistory] = useState([]);

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    console.log("Particles loaded:", container);
  }, []);

  // URL del backend
  const API_URL = "https://mvp-backend-3lb5.onrender.com/api/users";

  // Cargar datos del usuario desde el backend
  useEffect(() => {
    if (isConnected && address) {
      const fetchUserData = async () => {
        try {
          const response = await axios.get(`${API_URL}/${address}`);
          const userData = response.data;
          setEmail(userData.email || "");
          setEventHistory(userData.eventHistory || []);
        } catch (error) {
          console.error("Error al cargar datos del usuario:", error);
          setErrorMessage("No se pudieron cargar los datos del usuario. Por favor, intenta de nuevo.");
        }
      };
      fetchUserData();
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      console.log("Conectado con address:", address); // Log para depurar
      console.log("Chain ID actual:", chainId); // Log para depurar
      if (chainId !== polygonAmoy.id) {
        setErrorMessage(`Por favor, cambia a la red Polygon Amoy (chain ID: ${polygonAmoy.id}).`);
        return;
      }
      const initContract = async () => {
        try {
          setIsLoading(true);
          const contractAddress = "0x38a2550FB656DDAaDB478B3C2258E48866C91b7f";
          console.log("Inicializando contrato en:", contractAddress); // Log para depurar
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
        console.log("Cargando NFTs para owner:", owner); // Log para depurar
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

        console.log("Logs obtenidos:", logs); // Log para depurar

        const transferEvents = logs
            .filter((log) => log.args.to.toLowerCase() === owner.toLowerCase())
            .map((log) => ({
              args: {
                tokenId: log.args.tokenId,
              },
            }));

        console.log("Eventos Transfer encontrados:", transferEvents.length); // Log para depurar
        transferEvents.forEach((event, index) => {
          console.log(`Evento ${index}: Token ID ${event.args.tokenId.toString()}`);
        });

        const nftsList = await Promise.all(
            transferEvents.map(async (event) => {
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
                  return null;
                }

                const tokenURI = await viemClient.readContract({
                  address: contract.address,
                  abi: contract.abi,
                  functionName: "tokenURI",
                  args: [tokenId],
                });
                const response = await fetch(tokenURI);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const metadataText = await response.text();
                const metadata = JSON.parse(metadataText);
                const image = metadata.image || "https://via.placeholder.com/150";
                const name = metadata.name || `NFT ${tokenId}`;
                const attributes = metadata.attributes || [];
                const hasEvents = attributes.some(attr => attr.trait_type === "Event Access" && attr.value);
                return {
                  tokenId,
                  uri: tokenURI,
                  image,
                  name,
                  attributes,
                  hasEvents,
                };
              } catch (error) {
                console.error(`Error processing token ${tokenId}:`, error.message);
                return null;
              }
            })
        );
        console.log("NFTs list antes de filtrar:", nftsList);
        const filteredNfts = nftsList.filter((nft) => nft !== null && nft !== undefined);
        console.log("NFTs filtrados:", filteredNfts);
        setNfts(filteredNfts);
      } catch (error) {
        console.error("Error al cargar NFTs:", error);
        setErrorMessage("Error al cargar los NFTs. Revisa la consola para más detalles.");
      }
    } else {
      console.log("Contrato o owner no definidos:", { contract, owner }); // Log para depurar
    }
  };

  const disconnectWallet = async () => {
    await disconnect();
    setContract(null);
    setNfts([]);
    setIsMenuOpen(false);
    setEmail("");
    setEventHistory([]);
  };

  const registerForEvent = async (tokenId, eventName) => {
    const newEvent = {
      tokenId,
      eventName,
      date: new Date().toLocaleString(),
    };
    try {
      // Enviar el evento al backend
      const response = await axios.post(`${API_URL}/${address}/events`, newEvent);
      setEventHistory(response.data.eventHistory);
      alert(`Registro para ${eventName} con el NFT #${tokenId} enviado con éxito!`);
    } catch (error) {
      console.error("Error al registrar el evento:", error);
      setErrorMessage("Error al registrar el evento. Por favor, intenta de nuevo.");
    }
  };



  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Dirección copiada al portapapeles!");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const saveEmail = async () => {
    try {
      // Enviar el email al backend
      const response = await axios.post(`${API_URL}/${address}/email`, { email });
      setEmail(response.data.email);
      setIsEditingEmail(false);
      alert("Correo electrónico guardado con éxito!");
    } catch (error) {
      console.error("Error al guardar el email:", error);
      setErrorMessage("Error al guardar el email. Por favor, intenta de nuevo.");
    }
  };

  const abbreviatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    prevArrow: <button className="slick-prev">←</button>,
    nextArrow: <button className="slick-next">→</button>,
  };

  // src/App.js (el return principal)
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
                      Mis NFTs
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
                    <button
                        onClick={() => {
                          setActiveTab("profile");
                          setIsMenuOpen(false);
                        }}
                        className="menu-link"
                    >
                      Perfil
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
              <Particles
                  id="tsparticles"
                  init={particlesInit}
                  loaded={particlesLoaded}
                  options={{
                    background: {
                      color: {
                        value: "transparent",
                      },
                    },
                    fpsLimit: 60,
                    interactivity: {
                      events: {
                        onClick: {
                          enable: true,
                          mode: "push",
                        },
                        onHover: {
                          enable: true,
                          mode: "repulse",
                        },
                        resize: true,
                      },
                      modes: {
                        push: {
                          quantity: 4,
                        },
                        repulse: {
                          distance: 200,
                          duration: 0.4,
                        },
                      },
                    },
                    particles: {
                      color: {
                        value: "#00aaff",
                      },
                      links: {
                        color: "#00aaff",
                        distance: 150,
                        enable: true,
                        opacity: 0.5,
                        width: 1,
                      },
                      collisions: {
                        enable: true,
                      },
                      move: {
                        direction: "none",
                        enable: true,
                        outModes: {
                          default: "bounce",
                        },
                        random: false,
                        speed: 2,
                        straight: false,
                      },
                      number: {
                        density: {
                          enable: true,
                          area: 800,
                        },
                        value: 80,
                      },
                      opacity: {
                        value: 0.5,
                      },
                      shape: {
                        type: "circle",
                      },
                      size: {
                        value: { min: 1, max: 5 },
                      },
                    },
                    detectRetina: true,
                  }}
                  className="particles"
              />
              <img src={logo} alt="Afizionados Logo" className="logo" />
              <p className="tagline">La memorabilidad deportiva de tu equipo favorito, ahora en formato digital</p>
              <div className="carousel-container">
                <Slider {...sliderSettings}>
                  {carouselImages.map((image, index) => (
                      <div key={index}>
                        <img src={image} alt={`NFT ${index + 1}`} className="carousel-image" />
                      </div>
                  ))}
                </Slider>
              </div>
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
                  Mis NFTs
                </button>
                <button
                    className={`tab ${activeTab === "experiences" ? "active" : ""}`}
                    onClick={() => setActiveTab("experiences")}
                >
                  Experiencias Exclusivas
                </button>
                <button
                    className={`tab ${activeTab === "profile" ? "active" : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                  Perfil
                </button>
              </div>
              {activeTab === "nfts" && (
                  <section id="my-nfts">
                    {isLoading ? (
                        <p className="loading-state">Cargando tus NFTs...</p>
                    ) : nfts.length === 0 ? (
                        <p className="empty-state">
                          No tienes NFTs en tu colección. ¡Explora cómo obtener uno en{" "}
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
                          No tienes experiencias disponibles. ¡Obtén un NFT para acceder a eventos exclusivos!
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
              {activeTab === "profile" && (
                  <section id="profile">
                    <h2 className="profile-title">Perfil de usuario</h2>
                    <div className="profile-info">
                      <div className="profile-item">
                        <span className="profile-label">Dirección de Wallet:</span>
                        <div className="profile-value">
                          <span>{abbreviatedAddress}</span>
                          <button
                              className="copy-button"
                              onClick={() => copyToClipboard(address)}
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                      <div className="profile-item">
                        <span className="profile-label">Correo Electrónico:</span>
                        {isEditingEmail ? (
                            <div className="profile-value">
                              <input
                                  type="email"
                                  value={email}
                                  onChange={handleEmailChange}
                                  className="email-input"
                                  placeholder="Ingresa tu correo"
                              />
                              <button className="save-button" onClick={saveEmail}>
                                Guardar
                              </button>
                            </div>
                        ) : (
                            <div className="profile-value">
                              <span>{email || "No especificado"}</span>
                              <button
                                  className="edit-button"
                                  onClick={() => setIsEditingEmail(true)}
                              >
                                Editar
                              </button>
                            </div>
                        )}
                      </div>
                    </div>
                    <h3 className="profile-subtitle">Tus NFTs</h3>
                    {nfts.length === 0 ? (
                        <p className="empty-state">No tienes NFTs en tu colección.</p>
                    ) : (
                        <div className="nft-grid profile-nft-grid">
                          {nfts.map((nft, index) => (
                              <div key={index} className="profile-nft-item">
                                <img
                                    src={nft.image}
                                    alt={`NFT ${nft.tokenId}`}
                                    className="profile-nft-image"
                                />
                                <p className="profile-nft-name">{nft.name}</p>
                              </div>
                          ))}
                        </div>
                    )}
                    <h3 className="profile-subtitle">Historial de Eventos</h3>
                    {eventHistory.length === 0 ? (
                        <p className="empty-state">No te has registrado en ningún evento aún.</p>
                    ) : (
                        <ul className="event-history">
                          {eventHistory.map((event, index) => (
                              <li key={index} className="event-history-item">
                                <span>Evento: {event.eventName}</span>
                                <span>Token ID: {event.tokenId}</span>
                                <span>Fecha: {event.date}</span>
                              </li>
                          ))}
                        </ul>
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