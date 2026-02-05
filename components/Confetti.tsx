import React from 'react';

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
    return <div className="confetti-piece" style={style}></div>;
};

const Confetti: React.FC = () => {
    const confettiCount = 50;
    const pieces = Array.from({ length: confettiCount }).map((_, index) => {
        const style: React.CSSProperties = {
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 100%, 70%)`,
            transform: `rotate(${Math.random() * 360}deg)`,
        };
        return <ConfettiPiece key={index} style={style} />;
    });

    return <div className="confetti-container">{pieces}</div>;
};

export default Confetti;