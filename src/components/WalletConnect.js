// src/components/WalletConnect.js
import React from 'react';
import '../App.css';

const WalletConnect = ({ isConnected, address, isConnecting, connectWallet, disconnectWallet }) => {
    return (
        <>
            {isConnected ? (
                <>
                    <p className="account-info">Cuenta conectada: {address}</p>
                    <button
                        onClick={disconnectWallet}
                        className="button disconnect-button"
                    >
                        Desconectar
                    </button>
                </>
            ) : (
                <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="button connect-button"
                >
                    {isConnecting ? "Conectando..." : "Conectar con MetaMask"}
                </button>
            )}
        </>
    );
};

export default WalletConnect;

