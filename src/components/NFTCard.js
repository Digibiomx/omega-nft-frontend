import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';

const NFTCard = ({ nft, address }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Determinar el tipo de artículo basado en el atributo "Article"
    const articleType = nft.attributes.find(attr => attr.trait_type === "Article")?.value || "Desconocido";
    const isWatch = articleType.toLowerCase().includes("reloj");
    console.log(`NFT ${nft.tokenId} - Article Type: ${articleType}, isWatch: ${isWatch}`);

    // Obtener los atributos específicos según el tipo de artículo
    const getAttribute = (traitType) => {
        return nft.attributes.find(attr => attr.trait_type === traitType)?.value || "N/A";
    };

    // Obtener el nombre del evento asociado (si existe)
    const eventAccess = nft.attributes.find(attr => attr.trait_type === "Event Access")?.value || "Sin evento";

    // Incluir la address del usuario en el QR
    const qrValue = JSON.stringify({
        tokenId: nft.tokenId,
        name: nft.name,
        event: eventAccess,
        type: isWatch ? "Watch" : "Memorabilia",
        address: address,
    });

    // Manejar el clic para voltear la tarjeta
    const handleCardClick = (e) => {
        // Evitar que el clic en el botón de opciones voltee la tarjeta
        if (!e.target.closest('.options-button') && !e.target.closest('.options-dropdown')) {
            setIsFlipped(!isFlipped);
        }
    };

    // Alternar la visibilidad del dropdown
    const toggleDropdown = (e) => {
        e.stopPropagation(); // Evitar que el clic en el botón voltee la tarjeta
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Descargar la imagen del NFT
    const downloadImage = async () => {
        try {
            const response = await fetch(nft.image, { mode: 'cors' });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFT_${nft.tokenId}.png`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar la imagen:', error);
            alert('Hubo un error al intentar descargar la imagen.');
        }
        setIsDropdownOpen(false);
    };

    // Compartir la imagen usando Web Share API
    const shareImage = async () => {
        try {
            const response = await fetch(nft.image, { mode: 'cors' });
            const blob = await response.blob();
            const file = new File([blob], `NFT_${nft.tokenId}.png`, { type: 'image/png' });
            const shareData = {
                title: `Mi NFT ${nft.name}`,
                text: `¡Mira mi NFT "${nft.name}" en Afizionados! #NFT #Afizionados`,
                url: 'https://afizionados.com',
                files: [file],
            };

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                alert('El compartir directamente no está soportado en este navegador. Puedes descargar la imagen y compartirla manualmente.');
                downloadImage();
            }
        } catch (error) {
            console.error('Error al compartir la imagen:', error);
            alert('Hubo un error al intentar compartir. Por favor, descarga la imagen y compártela manualmente.');
            downloadImage();
        }
        setIsDropdownOpen(false);
    };

    return (
        <div className="nft-card" onClick={handleCardClick}>
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                <div className="card-front">
                    {/* Botón de opciones (tres puntos) */}
                    <button className="options-button" onClick={toggleDropdown}>
                        ⋮
                    </button>
                    {isDropdownOpen && (
                        <div className="options-dropdown">
                            <button onClick={downloadImage} className="dropdown-item">
                                Descargar
                            </button>
                            <button onClick={shareImage} className="dropdown-item">
                                Compartir
                            </button>
                        </div>
                    )}
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
                <div className="card-back">
                    <h3 className="qr-title">Código QR del NFT #{nft.tokenId}</h3>
                    <div className="qr-container">
                        <QRCodeSVG
                            value={qrValue}
                            size={150}
                            bgColor="#ffffff"
                            fgColor="#0d1a3a"
                            level="H"
                            includeMargin={true}
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