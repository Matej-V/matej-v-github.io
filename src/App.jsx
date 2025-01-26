import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import WorldMap from './components/WorldMap';
import BarChart from './components/BarChart';


function App() {
    const [selectedA, setSelectedA] = useState(null);
    const [selectedB, setSelectedB] = useState(null);
    const [selectedYear, setSelectedYear] = useState(2019);
    const [tradeData, setTradeData] = useState([]);

    return (
        <>
            <div>
                <h2>International trade flow</h2>
            </div>
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", width: "100%", minHeight: "min-content" }}>
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

                {/* Second row divided into two equal columns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                    {/* First graph */}
                    <div style={{ padding: "10px" }}>
                        {/* Replace with your first graph component */}
                        <BarChart
                            selectedA={selectedA}
                            selectedB={selectedB}
                            selectedYear={selectedYear}
                            tradeData={tradeData}
                        />
                    </div>
                    {/* Second graph */}
                    <div style={{ padding: "10px" }}>
                        {/* Replace with your second graph component */}
                        {/* <Graph2 /> */}
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
