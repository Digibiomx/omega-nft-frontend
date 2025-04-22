import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../App.css';

const NFTCard = ({ nft, address, logo }) => {
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
        if (!e.target.closest('.options-button') && !e.target.closest('.options-dropdown')) {
            setIsFlipped(!isFlipped);
        }
    };

    // Alternar la visibilidad del dropdown
    const toggleDropdown = (e) => {
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Crear la imagen con branding usando Canvas
    const createBrandedImage = async () => {
        return new Promise((resolve, reject) => {
            // Crear el canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Dimensiones del canvas (cuadrado para un diseño uniforme)
            const canvasSize = 600; // Tamaño del canvas (600x600 para alta calidad)
            canvas.width = canvasSize;
            canvas.height = canvasSize;

            // 1. Dibujar el fondo con gradiente
            const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
            gradient.addColorStop(0, '#00aaff'); // --accent
            gradient.addColorStop(1, '#0088cc'); // --accent-dark
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            // 2. Agregar un patrón futurista (líneas diagonales sutiles)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let i = -canvasSize; i < canvasSize * 2; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvasSize, canvasSize);
                ctx.stroke();
            }

            // 3. Cargar y dibujar la imagen del NFT
            const nftImage = new Image();
            nftImage.crossOrigin = 'Anonymous'; // Para manejar imágenes de IPFS
            nftImage.src = nft.image;

            nftImage.onload = () => {
                // Dimensiones de la imagen del NFT (80% del canvas para que haya espacio para el branding)
                const imgSize = canvasSize * 0.8;
                const imgX = (canvasSize - imgSize) / 2;
                const imgY = (canvasSize - imgSize) / 2 - 20; // Desplazar ligeramente hacia arriba para dejar espacio al texto

                // Dibujar un marco alrededor de la imagen
                ctx.strokeStyle = '#00aaff'; // --accent
                ctx.lineWidth = 4;
                ctx.strokeRect(imgX - 2, imgY - 2, imgSize + 4, imgSize + 4);

                // Dibujar la imagen
                ctx.drawImage(nftImage, imgX, imgY, imgSize, imgSize);

                // Agregar un efecto de brillo/sombra
                ctx.shadowColor = 'rgba(0, 170, 255, 0.5)';
                ctx.shadowBlur = 15;
                ctx.drawImage(nftImage, imgX, imgY, imgSize, imgSize);
                ctx.shadowBlur = 0; // Resetear la sombra

                // 4. Cargar y dibujar el logo como watermark
                const logoImage = new Image();
                logoImage.crossOrigin = 'Anonymous';
                logoImage.src = logo;

                logoImage.onload = () => {
                    const logoSize = canvasSize * 0.2; // 20% del tamaño del canvas
                    const logoX = canvasSize - logoSize - 20; // Esquina superior derecha
                    const logoY = 20;

                    // Dibujar el logo con opacidad
                    ctx.globalAlpha = 0.25; // Opacidad del 25%
                    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
                    ctx.globalAlpha = 1.0; // Restaurar opacidad

                    // 5. Dibujar el texto en la parte inferior
                    ctx.font = '20px Montserrat';
                    ctx.fillStyle = '#b0b8d8'; // --text-secondary
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const text = `Afizionados.com | NFT #${nft.tokenId}`;
                    ctx.fillText(text, canvasSize / 2, canvasSize - 40);

                    // Convertir el canvas a blob y resolver la promesa
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png');
                };

                logoImage.onerror = () => {
                    reject(new Error('No se pudo cargar el logo.'));
                };
            };

            nftImage.onerror = () => {
                reject(new Error('No se pudo cargar la imagen del NFT.'));
            };
        });
    };

    // Descargar la imagen con branding
    const downloadImage = async () => {
        try {
            const blob = await createBrandedImage();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFT_${nft.tokenId}_Afizionados.png`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar la imagen:', error);
            alert('Hubo un error al generar la imagen. Descargando la imagen original como alternativa.');
            // Fallback: Descargar la imagen original
            const response = await fetch(nft.image, { mode: 'cors' });
            const fallbackBlob = await response.blob();
            const url = window.URL.createObjectURL(fallbackBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFT_${nft.tokenId}.png`;
            link.click();
            window.URL.revokeObjectURL(url);
        }
        setIsDropdownOpen(false);
    };

    // Compartir la imagen con branding
    const shareImage = async () => {
        try {
            const blob = await createBrandedImage();
            const file = new File([blob], `NFT_${nft.tokenId}_Afizionados.png`, { type: 'image/png' });
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
            alert('Hubo un error al generar la imagen para compartir. Descargando la imagen original como alternativa.');
            // Fallback: Descargar la imagen original
            const response = await fetch(nft.image, { mode: 'cors' });
            const fallbackBlob = await response.blob();
            const url = window.URL.createObjectURL(fallbackBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFT_${nft.tokenId}.png`;
            link.click();
            window.URL.revokeObjectURL(url);
        }
        setIsDropdownOpen(false);
    };

    return (
        <div className="nft-card" onClick={handleCardClick}>
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                <div className="card-front">
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