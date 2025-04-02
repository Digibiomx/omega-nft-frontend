// src/components/NFTCard.js
import React from 'react';
import '../App.css';

const NFTCard = ({ nft }) => {
    // Determinar el tipo de artículo basado en el atributo "Article"
    const articleType = nft.attributes.find(attr => attr.trait_type === "Article")?.value || "Desconocido";
    const isWatch = articleType.toLowerCase().includes("reloj");
    console.log(`NFT ${nft.tokenId} - Article Type: ${articleType}, isWatch: ${isWatch}`); // Log para depurar

    // Obtener los atributos específicos según el tipo de artículo
    const getAttribute = (traitType) => {
        return nft.attributes.find(attr => attr.trait_type === traitType)?.value || "N/A";
    };

    return (
        <div className="nft-card">
            {nft.hasEvents && (
                <div className="event-badge">
                    🎉 Eventos Disponibles
                </div>
            )}
            <div className="nft-image-container">
                <div className="shine-effect"></div>
                <img src={nft.image} alt={`NFT ${nft.tokenId}`} className="nft-image" />
            </div>
            <h3 className="nft-title">{nft.name}</h3>
            <div className="nft-attributes">
                {isWatch ? (
                    <>
                        <div className="nft-attribute">
                            <span className="attribute-label">Modelo:</span>
                            <span className="attribute-value">{getAttribute("Model")}</span>
                        </div>
                        <div className="nft-attribute">
                            <span className="attribute-label">Número de serie:</span>
                            <span className="attribute-value">{getAttribute("Serial Number")}</span>
                        </div>
                        <div className="nft-attribute">
                            <span className="attribute-label">Fecha de fabricación:</span>
                            <span className="attribute-value">{getAttribute("Manufacture Date")}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="nft-attribute">
                            <span className="attribute-label">Equipo:</span>
                            <span className="attribute-value">{getAttribute("Team")}</span>
                        </div>
                        <div className="nft-attribute">
                            <span className="attribute-label">Jugador:</span>
                            <span className="attribute-value">{getAttribute("Player")}</span>
                        </div>
                        <div className="nft-attribute">
                            <span className="attribute-label">Fecha del artículo:</span>
                            <span className="attribute-value">{getAttribute("Article Date")}</span>
                        </div>
                    </>
                )}
            </div>
            <p className="nft-token-id">Token ID: {nft.tokenId}</p>
        </div>
    );
};

export default NFTCard;