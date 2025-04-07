// src/components/NFTCard.js
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';

const NFTCard = ({ nft }) => {
    // Estado para controlar si la tarjeta está volteada
    const [isFlipped, setIsFlipped] = useState(false);

    // Determinar el tipo de artículo basado en el atributo "Article"
    const articleType = nft.attributes.find(attr => attr.trait_type === "Article")?.value || "Desconocido";
    const isWatch = articleType.toLowerCase().includes("reloj");
    console.log(`NFT ${nft.tokenId} - Article Type: ${articleType}, isWatch: ${isWatch}`); // Log para depurar

    // Obtener los atributos específicos según el tipo de artículo
    const getAttribute = (traitType) => {
        return nft.attributes.find(attr => attr.trait_type === traitType)?.value || "N/A";
    };

    // Obtener el nombre del evento asociado (si existe)
    const eventAccess = nft.attributes.find(attr => attr.trait_type === "Event Access")?.value || "Sin evento";

    // Generar un valor único para el código QR
    // Este valor puede ser una combinación del tokenId, el nombre del NFT, y el evento asociado (si lo tiene)
    const qrValue = JSON.stringify({
        tokenId: nft.tokenId,
        name: nft.name,
        event: eventAccess,
        type: isWatch ? "Watch" : "Memorabilia",
    });

    // Manejar el clic para voltear la tarjeta
    const handleCardClick = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div className="nft-card" onClick={handleCardClick}>
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* Parte frontal de la tarjeta */}
                <div className="card-front">
                    {nft.hasEvents && (
                        <div className="event-badge">
                            🎉
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

                {/* Parte trasera de la tarjeta */}
                <div className="card-back">
                    <h3 className="qr-title">Código QR del NFT #{nft.tokenId}</h3>
                    <div className="qr-container">
                        <QRCodeSVG
                            value={qrValue}
                            size={150} // Tamaño del código QR
                            bgColor="#ffffff" // Fondo blanco
                            fgColor="#0d1a3a" // Color del QR (coincide con el fondo de la app)
                            level="H" // Nivel de corrección de errores (alta)
                            includeMargin={true} // Añadir márgenes
                        />
                    </div>
                    <p className="qr-instruction">
                        Escanea este código QR para validar tu entrada a eventos exclusivos.
                    </p>
                    {nft.hasEvents && (
                        <p className="qr-event">Evento: {eventAccess}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NFTCard;