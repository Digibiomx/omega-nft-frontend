import { useState, useEffect } from "react";
import { ethers } from "ethers";
import omegaNFTABI from "./utils/omegaNFTABI";

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contractAddress = "0xCc9FeC4A298D2320748116F24d859c91455f7245";
          const contract = new ethers.Contract(contractAddress, omegaNFTABI, signer);
          setContract(contract);
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          setAccount(accounts[0]);
          console.log("Conectado a:", accounts[0]);
          await loadNfts(contract, accounts[0]);
        } catch (error) {
          console.error("Error al conectar:", error);
        }
      } else {
        console.log("Por favor, instala MetaMask");
      }
    };
    init();
  }, []);

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
              name
            };
            console.log(`NFT creado para token ${tokenId}:`, nft);
            nftsList.push(nft);
          } catch (error) {
            console.error(`Error processing token ${tokenId}:`, error.message);
          }
        }
        console.log("NFTs list antes de filtrar:", nftsList);
        const filteredNfts = nftsList.filter(nft => nft !== null && nft !== undefined);
        console.log("NFTs filtrados:", filteredNfts);
        setNfts(filteredNfts);
      } catch (error) {
        console.error("Error al cargar NFTs:", error);
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
    }
  };

  return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        color: "#ffffff",
        fontFamily: "'Montserrat', sans-serif",
        padding: "40px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "bold",
          marginBottom: "20px",
          color: "#00aaff",
          textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
        }}>
          OmegaNFT
        </h1>
        <p style={{
          fontSize: "1.2rem",
          marginBottom: "30px",
          color: "#cccccc",
        }}>
          Cuenta conectada: {account ? account : "No conectado"}
        </p>
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
        <h2 style={{
          fontSize: "2rem",
          marginBottom: "30px",
          color: "#00aaff",
        }}>
          Mis NFTs
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          maxWidth: "1200px",
          width: "100%",
        }}>
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
                <div style={{
                  width: "100%",
                  maxHeight: "250px", // Altura máxima para la imagen
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: "15px",
                  overflow: "hidden",
                }}>
                  <img
                      src={nft.image}
                      alt={`NFT ${nft.tokenId}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "250px",
                        objectFit: "contain", // Cambiado de "cover" a "contain"
                        borderRadius: "10px",
                      }}
                  />
                </div>
                <h3 style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#ffffff",
                }}>
                  {nft.name}
                </h3>
                <p style={{
                  fontSize: "0.9rem",
                  color: "#cccccc",
                  marginBottom: "10px",
                }}>
                  Token ID: {nft.tokenId}
                </p>
                <p style={{
                  fontSize: "0.8rem",
                  color: "#999999",
                  wordBreak: "break-all",
                }}>
                  URI: {nft.uri}
                </p>
              </div>
          ))}
        </div>
      </div>
  );
}

export default App;