// CountrySelect.jsx
import React from 'react';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const CountrySelect = ({ countries, selectedA, selectedB, setSelectedA, setSelectedB }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px' }}>
            <div>
                <label style={{ color: 'var(--primary)', 'fontWeight': 'bold' }}>Reference Area: </label><br />
                <select
                    value={selectedA || ''}
                    onChange={(e) => {
                        setSelectedA(e.target.value);
                        // setSelectedB(null); // Clear Country B if Country A changes
                    }}
                >
                    <option value="">Select a country</option>
                    {countries.reference.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
            </div>
            <h3 style={{ display: 'flex', alignItems: 'center' }}><div style={{ display: 'inline-flex' }}><span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}><FaArrowRight style={{ position: 'relative', right: '-13', bottom: '-6' }} /> </span><span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center' }}><FaArrowLeft style={{ position: 'relative', left: '-13', top: '-6' }} /></span></div></h3>
            <div>
                <label style={{ color: 'var(--secondary)', 'fontWeight': 'bold' }}>Counterpart Area: </label><br />
                <select
                    value={selectedB || ''}
                    onChange={(e) => setSelectedB(e.target.value)}
                    disabled={!selectedA} // Disable until Country A is selected
                >
                    <option value="">Select a country</option>
                    <option value="World">World</option>
                    {countries.counterpart
                        .filter((country) => country !== selectedA) // Exclude Country A
                        .map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                </select>
            </div>
        </div>
    );
};

export default CountrySelect;
