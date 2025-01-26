// CountrySelect.jsx
import React from 'react';

const CountrySelect = ({ countries, selectedA, selectedB, setSelectedA, setSelectedB }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px' }}>
            <div>
                <label>Reference Area: </label>
                <select
                    value={selectedA || ''}
                    onChange={(e) => {
                        setSelectedA(e.target.value);
                        setSelectedB(null); // Clear Country B if Country A changes
                    }}
                >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label>Counterart: </label>
                <select
                    value={selectedB || ''}
                    onChange={(e) => setSelectedB(e.target.value)}
                    disabled={!selectedA} // Disable until Country A is selected
                >
                    <option value="">Select a country</option>
                    <option value="World">World</option>
                    {countries
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
