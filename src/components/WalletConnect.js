// src/components/WalletConnect.js
import React from 'react';
import { FaWallet, FaSignOutAlt } from 'react-icons/fa';
import '../App.css';

const WalletConnect = ({ isConnected, address, isConnecting, connectWallet, disconnectWallet }) => {
    const abbreviatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

    return (
        <div className="wallet-connect">
            {isConnected ? (
                <button onClick={disconnectWallet} className="button disconnect-button">
                    <FaSignOutAlt className="button-icon" />
                    Desconectar Wallet ({abbreviatedAddress})
                </button>
            ) : (
                <button onClick={connectWallet} className="button connect-button" disabled={isConnecting}>
                    <FaWallet className="button-icon" />
                    {isConnecting ? "Conectando..." : "Conectar Wallet"}
                </button>
            )}
        </div>
    );
};

export default WalletConnect;