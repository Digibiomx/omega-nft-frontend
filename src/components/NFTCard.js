// src/components/NFTCard.js
import React from 'react';
import '../App.css';

const NFTCard = ({ nft }) => {
    return (
        <div className="nft-card">
            <div className="nft-image-container">
                <img src={nft.image} alt={`Reloj ${nft.tokenId}`} className="nft-image" />
            </div>
            <h3 className="nft-title">{nft.name}</h3>
            <div className="nft-attributes">
                <div className="nft-attribute">
                    <span className="attribute-label">Modelo:</span>
                    <span className="attribute-value">{nft.attributes.find(attr => attr.trait_type === "Model")?.value || "N/A"}</span>
                </div>
                <div className="nft-attribute">
                    <span className="attribute-label">Número de serie:</span>
                    <span className="attribute-value">{nft.attributes.find(attr => attr.trait_type === "Serial Number")?.value || "N/A"}</span>
                </div>
                <div className="nft-attribute">
                    <span className="attribute-label">Fecha de fabricación:</span>
                    <span className="attribute-value">{nft.attributes.find(attr => attr.trait_type === "Manufacture Date")?.value || "N/A"}</span>
                </div>
            </div>
            <p className="nft-token-id">Token ID: {nft.tokenId}</p>
        </div>
    );
};

export default NFTCard;