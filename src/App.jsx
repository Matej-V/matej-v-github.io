import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import WorldMap from './components/WorldMap';
import BarChart from './components/BarChart';
import Sunburst from './components/Sunburst';


function App() {
    const [selectedA, setSelectedA] = useState('United States');
    const [selectedB, setSelectedB] = useState('Germany');
    const [selectedYear, setSelectedYear] = useState(2019);
    const [tradeData, setTradeData] = useState([]);

    return (
        <>
            <div>
                <h2>International trade flow</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", minHeight: "min-content" }}>


                {/* Second row divided into two equal columns */}
                <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", height: "100%" }}>
                    {/* First row with the map */}
                    <WorldMap
                        selectedA={selectedA}
                        setSelectedA={setSelectedA}
                        selectedB={selectedB}
                        setSelectedB={setSelectedB}
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        setTradeData={setTradeData}
                    />
                    {/* First graph */}
                    <div style={{ padding: "20px" }}>
                        {/* Replace with your first graph component */}
                        <BarChart
                            selectedA={selectedA}
                            selectedB={selectedB}
                            selectedYear={selectedYear}
                            setSelectedYear={setSelectedYear}
                            tradeData={tradeData}
                        />
                    </div>
                </div>
                {/* Second graph */}
                <div style={{ padding: "20px", margin: "auto", height: "100%" }}>
                    {/* Replace with your second graph component */}
                    <Sunburst
                        selectedA={selectedA}
                        selectedB={selectedB}
                        selectedYear={selectedYear}
                    />
                </div>
            </div>
        </>
    );
}

export default App;
