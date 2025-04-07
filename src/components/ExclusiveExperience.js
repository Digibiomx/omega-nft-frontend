// src/components/ExclusiveExperience.js
import React from 'react';
import '../App.css';

const ExclusiveExperience = ({ nft, registerForEvent }) => {
    const eventAccess = nft.attributes.find(attr => attr.trait_type === "Event Access")?.value;

    return (
        <div className="experience-card">
            <div className="experience-header">
                <span className="experience-icon">🏆</span>
                <h3 className="experience-title">Experiencia Exclusiva</h3>
            </div>
            <p className="experience-text">Tu NFT #{nft.tokenId} te da acceso a: {eventAccess}</p>
            <button
                onClick={() => registerForEvent(nft.tokenId, eventAccess)}
                className="event-button"
            >
                <span className="event-button-icon">🎟️</span>
                Registrarse para el evento
            </button>
        </div>
    );
};

export default ExclusiveExperience;