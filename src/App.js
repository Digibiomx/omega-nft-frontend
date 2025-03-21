import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { WalletConnectModal } from "@walletconnect/modal";
import omegaNFTABI from "./utils/omegaNFTABI";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [provider, setProvider] = useState(null);

  // Configura WalletConnect Modal
  const walletConnectModal = new WalletConnectModal({
    projectId: "d512d1dac86c0440191b4e4f981c58ec",
    themeMode: "dark",
    themeVariables: {
      "--wcm-z-index": "1000",
    },
  });

  const connectWallet = async () => {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Inicializa WalletConnect
      const wcProvider = await EthereumProvider.init({
        projectId: "d512d1dac86c0440191b4e4f981c58ec",
        chains: [80002], // ID de la red Polygon Amoy
        optionalChains: [80002],
        showQrModal: false, // No mostramos el modal de QR directamente, lo manejamos con WalletConnectModal
        methods: ["eth_requestAccounts", "eth_sendTransaction", "eth_sign"],
        events: ["chainChanged", "accountsChanged"],
        metadata: {
          name: "OmegaNFT",
          description: "Frontend for OmegaNFT project",
          url: "https://www.digibiosolutions.com/omega-nft-frontend/",
          icons: ["https://www.digibiosolutions.com/omega-nfts-metadata/omega-nfts-metadata/images/0.png"],
        },
      });

      // Abre el modal de WalletConnect para conectar
      await wcProvider.connect({
        modal: walletConnectModal,
      });

      // Una vez conectado, obtenemos las cuentas
      const accounts = await wcProvider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new ethers.BrowserProvider(wcProvider);
      const signer = await ethersProvider.getSigner();
      const contractAddress = "0xCc9FeC4A298D2320748116F24d859c91455f7245";
      const contract = new ethers.Contract(contractAddress, omegaNFTABI, signer);

      setProvider(wcProvider);
      setContract(contract);
      setAccount(accounts[0]);
      console.log("Conectado a:", accounts[0]);
      await loadNfts(contract, accounts[0]);
    } catch (error) {
      console.error("Error al conectar:", error);
      setErrorMessage("Error al conectar con la wallet. Revisa la consola para más detalles.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Escuchar cambios de cuenta y red
  useEffect(() => {
    if (provider) {
      provider.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (contract) {
            loadNfts(contract, accounts[0]);
          }
        } else {
          setAccount(null);
          setNfts([]);
          setProvider(null);
          setContract(null);
        }
      });

      provider.on("chainChanged", () => {
        window.location.reload();
      });

      // Limpieza al desmontar el componente
      return () => {
        provider.disconnect();
      };
    }
  }, [provider, contract]);

  const loadNfts = async (contract, owner) => {
    if (contract && owner) {
      try {
        const filter = contract.filters.Transfer(null, owner);
        const events = await contract.queryFilter(filter, 0, "latest");
        console.log("Eventos Transfer encontrados:", events.length);
        events.forEach((event, index) => {
          console.log(`Evento ${index}: Token ID ${event.args.tokenId.toString()}`);
        });

        const nftsList = [];
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const tokenId = event.args.tokenId.toString();
          console.log(`Procesando token ID ${tokenId}...`);
          try {
            let tokenURI = await contract.tokenURI(tokenId);
            console.log(`Token ID ${tokenId} URI: ${tokenURI}`);

            const tokenOwner = await contract.ownerOf(tokenId);
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
    if (contract) {
      try {
        const tx = await contract.mint({ value: ethers.parseEther("0.01") });
        await tx.wait();
        alert("NFT minteado con éxito!");
        await loadNfts(contract, account);
      } catch (error) {
        console.error("Error al mintear:", error);
        alert("Error al mintear el NFT. Revisa la consola.");
      }
    } else {
      setErrorMessage("Por favor, conecta tu wallet para mintear un NFT.");
    }
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
        {account ? (
            <p
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "30px",
                  color: "#cccccc",
                }}
            >
              Cuenta conectada: {account}
            </p>
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
        {account && (
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

export default App;